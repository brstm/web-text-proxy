const express = require('express');
const puppeteer = require('puppeteer-extra');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const PORT = process.env.PORT || 3000;
const BROWSERLESS_WS_ENDPOINT = process.env.BROWSERLESS_WS_ENDPOINT && process.env.BROWSERLESS_WS_ENDPOINT.trim();
const BROWSERLESS_URL = process.env.BROWSERLESS_URL && process.env.BROWSERLESS_URL.trim();
const ALLOW_LOCAL_LAUNCH = process.env.ALLOW_LOCAL_LAUNCH === 'true';
const USING_BROWSERLESS = Boolean(BROWSERLESS_WS_ENDPOINT || BROWSERLESS_URL);
const USER_AGENT =
  process.env.USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const ACCEPT_LANGUAGE = process.env.ACCEPT_LANGUAGE || 'en-US,en;q=0.9';
const TIMEZONE = process.env.TIMEZONE || 'America/Los_Angeles';
const VIEWPORT = {
  width: Number(process.env.VIEWPORT_WIDTH) || 1280,
  height: Number(process.env.VIEWPORT_HEIGHT) || 720,
  deviceScaleFactor: Number(process.env.DEVICE_SCALE_FACTOR) || 1
};

let browserPromise;

async function getBrowser() {
  if (!browserPromise) {
    if (USING_BROWSERLESS) {
      const connectOptions = {
        defaultViewport: null,
        ignoreHTTPSErrors: true
      };

      if (BROWSERLESS_WS_ENDPOINT) {
        connectOptions.browserWSEndpoint = BROWSERLESS_WS_ENDPOINT;
      } else {
        connectOptions.browserURL = BROWSERLESS_URL;
      }

      browserPromise = puppeteer.connect(connectOptions);
    } else {
      if (!ALLOW_LOCAL_LAUNCH) {
        throw new Error(
          'Browserless endpoint not configured and local Chromium launch disabled. Set BROWSERLESS_WS_ENDPOINT or ALLOW_LOCAL_LAUNCH=true.'
        );
      }

      const launchOptions = {
        headless: process.env.HEADLESS === 'false' ? false : 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled'
        ],
        defaultViewport: null
      };

      if (process.env.CHROME_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.CHROME_EXECUTABLE_PATH;
      }

      if (process.env.USER_DATA_DIR) {
        launchOptions.userDataDir = process.env.USER_DATA_DIR;
      }

      browserPromise = puppeteer.launch(launchOptions);
    }
  }
  return browserPromise;
}

const app = express();

function resolveTargetUrl(req) {
  // Accept a raw URL at the path root, e.g. /https://example.com/article
  let raw = req.originalUrl || '';
  if (raw.startsWith('/')) {
    raw = raw.slice(1);
  }
  if (!raw) {
    return undefined;
  }
  try {
    raw = decodeURIComponent(raw);
  } catch (decodeError) {
    console.warn(`Failed to decode target URL "${raw}":`, decodeError.message);
  }
  if (!/^https?:\/\//i.test(raw)) {
    return undefined;
  }
  return raw;
}

app.get('*', async (req, res) => {
  // Everything except the root path proxies through Puppeteer + Readability.
  const target = resolveTargetUrl(req);
  if (!target) {
    return res.status(400).json({ error: 'Visit /https://example.com/article' });
  }

  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    // Align basic browser fingerprints with a regular desktop user.
    await page.setUserAgent(USER_AGENT);
    await page.setViewport(VIEWPORT);
    await page.setExtraHTTPHeaders({ 'Accept-Language': ACCEPT_LANGUAGE });
    try {
      await page.emulateTimezone(TIMEZONE);
    } catch (timezoneError) {
      console.warn(`Failed to set timezone to ${TIMEZONE}:`, timezoneError.message);
    }
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    });
    await page.goto(target, { waitUntil: 'networkidle2', timeout: 45_000 });
    const html = await page.content();
    await page.close();

    const dom = new JSDOM(html, { url: target });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent || !article.textContent.trim()) {
      return res.status(422).json({ error: 'Could not extract article content' });
    }

    res.type('text/plain').send(article.textContent.trim());
  } catch (error) {
    if (page && !page.isClosed()) {
      await page.close();
    }
    console.error('Extraction failed', error);
    res.status(500).json({ error: 'Extraction failed', detail: error.message });
  }
});

async function shutdown() {
  if (browserPromise) {
    try {
      const browser = await browserPromise;
      if (USING_BROWSERLESS) {
        browser.disconnect();
      } else {
        await browser.close();
      }
    } catch (error) {
      console.error('Failed to close browser cleanly', error);
    }
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

app.listen(PORT, () => {
  console.log(`Web text proxy listening on http://localhost:${PORT}`);
});

const express = require('express');
const { promises: fs } = require('fs');
const puppeteer = require('puppeteer-extra');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const PORT = process.env.PORT || 3000;
const BROWSERLESS_WS_ENDPOINT = process.env.BROWSERLESS_WS_ENDPOINT && process.env.BROWSERLESS_WS_ENDPOINT.trim();
const BROWSERLESS_URL = process.env.BROWSERLESS_URL && process.env.BROWSERLESS_URL.trim();
const USING_BROWSERLESS = Boolean(BROWSERLESS_WS_ENDPOINT || BROWSERLESS_URL);
const SKIP_CHROMIUM_DOWNLOAD = process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true';
const VERBOSE_LOG = process.env.VERBOSE_LOG === 'true';
const ERROR_LOG_PATH = process.env.ERROR_LOG_PATH && process.env.ERROR_LOG_PATH.trim();
const LOG_MESSAGE_LIMIT = Number(process.env.LOG_MESSAGE_LIMIT || 400);
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

function summarizeError(error) {
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message : String(error);
  const truncated =
    message.length > LOG_MESSAGE_LIMIT ? `${message.slice(0, LOG_MESSAGE_LIMIT)}…` : message;
  return { name, message, truncated, stack: error instanceof Error ? error.stack : undefined };
}

function recordError(error, context) {
  const summary = summarizeError(error);
  if (VERBOSE_LOG) {
    console.error('Extraction failed:', { ...context, name: summary.name, message: summary.message, stack: summary.stack });
  } else {
    console.error(`Extraction failed: ${summary.name}: ${summary.truncated}`);
  }

  if (ERROR_LOG_PATH) {
    const payload = {
      timestamp: new Date().toISOString(),
      ...context,
      name: summary.name,
      message: summary.message,
      stack: summary.stack
    };
    fs.appendFile(ERROR_LOG_PATH, `${JSON.stringify(payload)}\n`).catch((writeError) => {
      console.error('Failed to write error log:', writeError.message);
    });
  }

  return summary.truncated;
}

async function getBrowser() {
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

    return puppeteer.connect(connectOptions);
  }

  if (!browserPromise) {
    if (SKIP_CHROMIUM_DOWNLOAD) {
      throw new Error(
        'Chromium is not bundled in this image. Configure BROWSERLESS_WS_ENDPOINT/BROWSERLESS_URL or rebuild with a Chromium-enabled image.'
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

  const browser = await browserPromise;
  if (!browser.isConnected()) {
    browserPromise = undefined;
    return getBrowser();
  }
  return browser;
}

const app = express();

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\n');
});

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
  if (!raw) {
    return undefined;
  }

  let candidate = raw;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      // Preserve original scheme case if supplied, otherwise use normalized href.
      return /^https?:\/\//i.test(raw) ? raw : parsed.href;
    }
  } catch (error) {
    console.warn(`Failed to parse target URL "${candidate}":`, error.message);
  }

  return undefined;
}

app.get('*', async (req, res) => {
  // Everything except the root path proxies through Puppeteer + Readability.
  const target = resolveTargetUrl(req);
  if (!target) {
    return res.status(400).json({ error: 'Visit /https://example.com/article' });
  }

  let page;
  let browser;
  try {
    browser = await getBrowser();
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
    if (USING_BROWSERLESS) {
      await browser.disconnect();
    }
  } catch (error) {
    if (page && !page.isClosed()) {
      await page.close();
    }
    const message = recordError(error, { target });
    if (USING_BROWSERLESS && browser) {
      try {
        await browser.disconnect();
      } catch {
        // ignore disconnect failures
      }
    }
    if (!USING_BROWSERLESS && browser && !browser.isConnected()) {
      browserPromise = undefined;
    }
    res.status(500).json({ error: 'Extraction failed', detail: message });
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

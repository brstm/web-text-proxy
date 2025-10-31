# Web Text Proxy

Fetch readable article text from any URL by prepending this service's host. Useful when sites block AI or automated crawlers.

## Quick Start

```sh
docker compose up -d --build
```

Then visit `http://localhost:3000/example.com/article`. The default service launches Chromium inside the container, runs Mozilla Readability, and returns plain text. Supplying the full scheme (for example `/http://example.com/article`) still works when you need to force a specific protocol.

### Using Browserless Instead

An optional lightweight profile reuses a remote Browserless instance:

```sh
docker compose --profile browserless up -d --build web-text-proxy-browserless
```

Set one of the Browserless endpoints before starting:

- `BROWSERLESS_WS_ENDPOINT` – WebSocket endpoint (`ws://` or `wss://`).
- `BROWSERLESS_URL` – HTTP DevTools endpoint (`http://` or `https://`).

When either is present the service connects remotely; local launch stays disabled in that profile.

> The Browserless profile ships without Chromium; if you omit the endpoint the service will fail fast instead of attempting a local launch.

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Internal HTTP port the Express app listens on. Exposed externally via Compose (`3000:3000`). |
| `BROWSERLESS_WS_ENDPOINT` | _(empty)_ | WebSocket endpoint for Browserless (e.g. `wss://browserless.example.com?token=...`). |
| `BROWSERLESS_URL` | _(empty)_ | HTTP DevTools endpoint alternative (e.g. `https://browserless.example.com?token=...`). |
| `USER_AGENT` | desktop Chrome UA | Override reported user-agent string. |
| `ACCEPT_LANGUAGE` | `en-US,en;q=0.9` | Override `Accept-Language` header. |
| `TIMEZONE` | `America/Los_Angeles` | Timezone passed to `page.emulateTimezone`. |
| `VIEWPORT_WIDTH` | `1280` | Page viewport width. |
| `VIEWPORT_HEIGHT` | `720` | Page viewport height. |
| `DEVICE_SCALE_FACTOR` | `1` | Device pixel ratio. |
| `HEADLESS` | `'new'` | Set to `false` to open a visible browser (only valid with local launch). |
| `CHROME_EXECUTABLE_PATH` | _(empty)_ | Custom Chrome binary path (local launch only). |
| `USER_DATA_DIR` | _(empty)_ | Persistent Chrome profile directory (local launch only). |
| `VERBOSE_ERRORS` | `false` | When `true`, log full error objects instead of single-line messages. |

## Development

Dependencies install during the Docker build. If you need them locally, run `npm install`.

To rebuild after code changes:

```sh
docker compose up -d --build
```

## Notes

- Uses `puppeteer-extra` + stealth plugin to reduce detection.
- Mozilla Readability provides article text; structure-heavy pages may lose UI elements.
- Shut down with `docker compose down` when finished.

# Web Text Proxy

Fetch readable article text from any URL by prepending this service's host. Useful when sites block AI or automated crawlers.

## Quick Start

```sh
docker compose up -d --build text
```

Then visit `http://localhost:3789/https://example.com/article`. The service connects to your Browserless instance, runs Mozilla Readability, and returns plain text.

### Using Browserless

Point the app at an existing Browserless deployment via environment variables:

- `BROWSERLESS_WS_ENDPOINT` – WebSocket endpoint (`ws://` or `wss://`).
- `BROWSERLESS_URL` – HTTP DevTools endpoint (`http://` or `https://`).

Set one of them (WebSocket preferred). Local Chromium launch is disabled by default; enable it with `ALLOW_LOCAL_LAUNCH=true` only if the container image has all Chrome dependencies.

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Internal HTTP port the Express app listens on. Exposed externally via Compose (`3789:3000`). |
| `BROWSERLESS_WS_ENDPOINT` | _(empty)_ | WebSocket endpoint for Browserless (e.g. `wss://browserless.example.com?token=...`). |
| `BROWSERLESS_URL` | _(empty)_ | HTTP DevTools endpoint alternative (e.g. `https://browserless.example.com?token=...`). |
| `ALLOW_LOCAL_LAUNCH` | `false` | Permit local Chromium launch when no Browserless endpoint is provided. Requires Chrome deps.
| `USER_AGENT` | desktop Chrome UA | Override reported user-agent string. |
| `ACCEPT_LANGUAGE` | `en-US,en;q=0.9` | Override `Accept-Language` header. |
| `TIMEZONE` | `America/Los_Angeles` | Timezone passed to `page.emulateTimezone`. |
| `VIEWPORT_WIDTH` | `1280` | Page viewport width. |
| `VIEWPORT_HEIGHT` | `720` | Page viewport height. |
| `DEVICE_SCALE_FACTOR` | `1` | Device pixel ratio. |
| `HEADLESS` | `'new'` | Set to `false` to open a visible browser (only valid with local launch). |
| `CHROME_EXECUTABLE_PATH` | _(empty)_ | Custom Chrome binary path (local launch only). |
| `USER_DATA_DIR` | _(empty)_ | Persistent Chrome profile directory (local launch only). |

## Development

Dependencies install during the Docker build. If you need them locally, run `npm install`.

To rebuild after code changes:

```sh
docker compose up -d --build text
```

## Notes

- Uses `puppeteer-extra` + stealth plugin to reduce detection.
- Mozilla Readability provides article text; structure-heavy pages may lose UI elements.
- Shut down with `docker compose down` when finished.

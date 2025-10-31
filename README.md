# Web Text Proxy

Fetch readable article text from any URL by prepending this service's host. Useful for passing URLs that block AI; prepend the proxy, hand the new URL to the AI, and it reads the page text without manual copy/paste.

## Quick Start

```sh
docker compose up -d --build reader
```

Then visit `http://localhost:3000/https://example.com/article`. The service launches Chrome via Puppeteer, runs Mozilla Readability, and returns plain text.

## Configuration

Environment variables on the `reader` service tweak browser behavior:

- `PORT` – HTTP port (default `3000`).
- `USER_AGENT`, `ACCEPT_LANGUAGE`, `TIMEZONE`, `VIEWPORT_WIDTH`, `VIEWPORT_HEIGHT`, `DEVICE_SCALE_FACTOR` – override fingerprints to match your daily browser.
- `HEADLESS=false` – run a visible browser (useful for debugging).
- `CHROME_EXECUTABLE_PATH`, `USER_DATA_DIR` – point at a local Chrome binary and profile.

Edit `docker-compose.yml` to set values, or pass them via the CLI when starting the stack.

## Development

Dependencies install during the Docker build. If you need them locally, run `npm install`.

To rebuild after code changes:

```sh
docker compose up -d --build reader
```

## Notes

- The service uses `puppeteer-extra` with the stealth plugin to reduce bot detection.
- Output comes straight from Mozilla Readability; some sites may omit sidebars or interactive sections.
- Handle the browser gracefully with `docker compose down` when you're done to free resources.
- Internal runbooks stay local: copy `docs/AGENTS.template.md` to `AGENTS.md` and populate an `agents/` folder (both ignored by git) so session context is available next time without leaking into the repo.

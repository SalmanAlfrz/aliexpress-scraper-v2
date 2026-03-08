# AliExpress Brasil Scraper

Web browser automation for scraping HTML from AliExpress Brasil using [rebrowser-puppeteer](https://www.npmjs.com/package/rebrowser-puppeteer) with anti-detection.

## Prerequisites

- Node.js >= 18

## Setup

```bash
cp config.example.json config.json
npm install
npx puppeteer browsers install chrome
```

The last command downloads the Chrome binary required by Puppeteer. If you skip it, you will see an error like `Could not find Chrome (ver. x.x.x)`.

Edit `config.json` with your settings.

## Usage

### API Server (default)

```bash
npm start
```

The server starts on the configured port (default `3001`). A fresh browser is launched per request.

#### Endpoints

**POST** `/api/aliexpress/pdp/sync`

Scrape a single AliExpress product page.

```bash
curl --location 'http://localhost:3001/api/aliexpress/pdp/sync' \
--header 'Content-Type: application/json' \
--data '{
    "url": "https://pt.aliexpress.com/item/1005007774544234.html",
    "proxy": "user:pass@host:port"
}'
```

| Field | Required | Description |
|---|---|---|
| `url` | Yes | AliExpress product URL |
| `proxy` | No | Proxy string `user:pass@host:port`. Falls back to config if omitted. |

**GET** `/health`

Health check endpoint.

#### Response

```json
{
  "url": "https://pt.aliexpress.com/item/...",
  "statusCode": 200,
  "scrapedAt": "2026-03-08T12:00:00.000Z",
  "status": "success",
  "hasCaptcha": false,
  "html": "<!DOCTYPE html>..."
}
```

Possible status values: `success`, `captcha_detected`

### CLI Mode

```bash
npm run cli
```

Reads URLs from `config.json` and scrapes them sequentially.

## Configuration

| Field | Description |
|---|---|
| `server.port` | API server port (default `3001`) |
| `browser.headless` | `false` (default, safer from detection) or `true` |
| `browser.viewport` | Browser resolution (width x height) |
| `browser.proxy` | Default proxy settings (used when request has no proxy) |
| `scraper.timeout` | Navigation timeout in ms |
| `scraper.delayBetweenPages` | Random delay between pages (min/max ms) |
| `scraper.maxRetries` | Number of retries on failure or captcha (relaunches browser) |
| `output.directory` | Output folder |
| `output.prettyPrint` | `true` for formatted JSON output |

## Project Structure

```
src/
  server.js    - Express API server (default entry point)
  index.js     - CLI mode entry point
  browser.js   - Browser launch & page configuration
  scraper.js   - HTML scraping logic with captcha detection
  utils.js     - Helpers (delay, retry, file I/O)
output/        - Scraped HTML (JSON) and screenshots (PNG)
```

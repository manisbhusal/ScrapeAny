# 🚀 ScrapeAny

A serverless-ready Node.js API built with Express, Puppeteer, and Stealth plugins to extract structured data, intercept background API network responses, capture media streams, and clone UI templates from any webpage.

---

## ✨ Features

- **Data & API Extraction (`/api/scrape`)**: Intercepts `.m3u8` / `.mp4` video streams and JSON network payloads while parsing metadata, headings, images, Open Graph data, and JSON-LD.
- **Configurable jobs**: Supply CSS selectors, click/type/scroll/wait actions, mobile-friendly viewport options, screenshots, and PDFs.
- **Bulk and history APIs**: Scrape up to 20 URLs, review recent results, clear history, and export rows as CSV.
- **Testing-phase productivity tools**: Sitemap crawling, reusable templates, five-minute result caching, responsive desktop/tablet/mobile capture, table extraction, headings, links, pagination hints, and Markdown/HTML exports.
- **Clone inspection**: Full scrollable preview, fullscreen mode, zoom, original screenshot, stylesheet/image/font asset metadata, and downloadable HTML.
- **Production controls**: DNS-aware SSRF protection, request limits, browser concurrency limits, optional API-key authentication, and a health endpoint.
- **UI Cloning (`/api/clone-ui`)**: Clones static DOM structures by neutralizing scripts, inline event listeners, and external redirects while maintaining absolute relative asset paths.
- **Stealth Anti-Bot Bypass**: Integrated with `puppeteer-extra-plugin-stealth` to bypass basic anti-bot and Cloudflare checks.
- **Serverless & Local Compatibility**: Seamlessly switches between local Chromium binaries and `@sparticuz/chromium` for execution on serverless platforms like Vercel.

---

## 🛠️ Tech Stack & Dependencies

- **Backend**: Node.js, Express.js, CORS
- **Automation & Scraping**: Puppeteer, `puppeteer-core`, `puppeteer-extra`, `puppeteer-extra-plugin-stealth`
- **Serverless Runtime**: `@sparticuz/chromium`

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone [https://github.com/manisbhusal/ScrapeAny.git](https://github.com/manisbhusal/ScrapeAny.git)
cd ScrapeAny
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Locally

```bash
npm start

```

The server will start at `http://localhost:3000`.

---

## 📡 API Reference

### 1. Extract Page Data & Streams

**Endpoint**: `POST /api/scrape`

**Headers**: `Content-Type: application/json` and, when `API_KEY` is configured, `X-API-Key`

```json
// Request Body
{
  "url": "https://example.com",
  "options": {
    "selectors": {
      "title": "h1",
      "description": ".description",
      "image": "meta[property='og:image']"
    },
    "actions": [
      { "type": "click", "selector": ".load-more" },
      { "type": "wait", "milliseconds": 1000 }
    ],
    "screenshot": true,
    "pdf": false
  }
}
```

### 2. Clone Webpage UI

**Endpoint**: `POST /api/clone-ui`

**Headers**: `Content-Type: application/json`

```json
// Request Body
{
  "url": "https://example.com"
}
```

### Additional endpoints

- `POST /api/bulk` with `{ "urls": ["https://example.com"] }`
- `POST /api/sitemap` with `{ "url": "https://example.com/sitemap.xml" }`
- `GET /api/history` and `DELETE /api/history`
- `GET/POST/DELETE /api/templates` for saved scraper configurations
- `POST /api/export` with `{ "format": "csv|markdown|html", "rows": [...] }`
- `DELETE /api/cache`
- `GET /api/health`

Set `API_KEY` to require `X-API-Key` on scraping and bulk routes. Set `ALLOWED_ORIGIN` to restrict browser origins. History uses temporary storage on the serverless filesystem; use a database for durable production history.

---

## ☁️ Deployment on Vercel

1. Install the Vercel CLI or connect your GitHub repository to [Vercel](https://vercel.com).
2. Ensure your `vercel.json` routes match the serverless entry point:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node",
      "config": {
        "maxDuration": 30
      }
    },
    {
      "src": "index.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.js"
    },
    {
      "src": "/(.*)",
      "dest": "index.html"
    }
  ]
}
```

---

## 📊 Repository Stats

---

## 👨‍💻 About Me

- A guy with no skill 🍝

---

## 🍕 Support My Work / Donate

> _"Cooking code, Serving bugs"_

If you find this project helpful (or feel bad for my bugs), consider supporting me:

Or simply click the link directly: **[https://cr8.rs/kiwiixen](https://cr8.rs/kiwiixen)**

```

```

```

```

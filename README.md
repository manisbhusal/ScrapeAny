# 🚀 ScrapeAny

A serverless-ready Node.js API built with Express, Puppeteer, and Stealth plugins to extract structured data, intercept background API network responses, capture media streams, and clone UI templates from any webpage.

---

## ✨ Features

- **Data & API Extraction (`/api/scrape`)**: Intercepts `.m3u8` / `.mp4` video streams and JSON network payloads while parsing metadata, headings, main images, and embedded resources.
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

**Headers**: `Content-Type: application/json`

```json
// Request Body
{
  "url": "[https://example.com](https://example.com)"
}
```

### 2. Clone Webpage UI

**Endpoint**: `POST /api/clone-ui`

**Headers**: `Content-Type: application/json`

```json
// Request Body
{
  "url": "[https://example.com](https://example.com)"
}
```

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

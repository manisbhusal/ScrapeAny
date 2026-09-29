const express = require('express');
const cors = require('cors');
const net = require('net');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-API-Key']
}));

app.use(express.json({ limit: '16kb' }));
app.use(express.static(__dirname));

const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'localhost.localdomain',
    'metadata.google.internal',
    'metadata.google.com'
]);
const MAX_BULK_URLS = 20;
const MAX_ACTIONS = 10;
const MAX_CONCURRENT_JOBS = 2;
const activeJobs = new Set();
const requestWindows = new Map();
const historyFile = path.join('/tmp', 'scrapeany-history.json');

function isPrivateIp(hostname) {
    const version = net.isIP(hostname);
    if (version === 4) {
        const octets = hostname.split('.').map(Number);
        return octets[0] === 10 ||
            (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
            (octets[0] === 192 && octets[1] === 168) ||
            octets[0] === 127 ||
            octets[0] === 0 ||
            (octets[0] === 169 && octets[1] === 254);
    }

    if (version === 6) {
        const normalized = hostname.toLowerCase();
        return normalized === '::1' || normalized === '::' ||
            normalized.startsWith('fc') || normalized.startsWith('fd') ||
            normalized.startsWith('fe80:') || normalized.startsWith('::ffff:127.');
    }

    return false;
}

async function normalizeTargetUrl(value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error('URL is required');
    }

    const trimmed = value.trim();
    let target;
    try {
        target = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    } catch {
        throw new Error('Invalid URL');
    }
    const hostname = target.hostname.replace(/^\[|\]$/g, '').toLowerCase();

    if (!['http:', 'https:'].includes(target.protocol) ||
        BLOCKED_HOSTNAMES.has(hostname) || isPrivateIp(hostname)) {
        throw new Error('Only public HTTP(S) URLs are allowed');
    }

    target.username = '';
    target.password = '';
    const addresses = await dns.lookup(hostname, { all: true }).catch(() => []);
    if (addresses.some(address => isPrivateIp(address.address))) {
        throw new Error('Target resolves to a private network');
    }
    return target.toString();
}

function isBlockedRequestUrl(value) {
    try {
        const target = new URL(value);
        const hostname = target.hostname.replace(/^\[|\]$/g, '').toLowerCase();
        return !['http:', 'https:'].includes(target.protocol) ||
            BLOCKED_HOSTNAMES.has(hostname) || isPrivateIp(hostname);
    } catch {
        return true;
    }
}

function configurePage(page) {
    page.on('request', request => {
        const action = isBlockedRequestUrl(request.url()) ? request.abort() : request.continue();
        action.catch(() => { });
    });
}

function sendError(res, error) {
    const status = ['URL is required', 'Invalid URL', 'Only public HTTP(S) URLs are allowed', 'Target resolves to a private network', 'Too many active jobs']
        .includes(error.message) ? 400 : 500;
    res.status(status).json({ success: false, error: error.message });
}

function rateLimit(req, res, next) {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - 60_000;
    const timestamps = (requestWindows.get(key) || []).filter(time => time > windowStart);
    if (timestamps.length >= 10) return res.status(429).json({ success: false, error: 'Rate limit exceeded. Try again shortly.' });
    timestamps.push(now);
    requestWindows.set(key, timestamps);
    next();
}

function requireApiKey(req, res, next) {
    const origin = req.get('origin');
    const sameOrigin = origin && origin === `${req.protocol}://${req.get('host')}`;
    if (sameOrigin) return next();
    if (process.env.API_KEY && req.get('x-api-key') !== process.env.API_KEY) {
        return res.status(401).json({ success: false, error: 'Valid API key required' });
    }
    next();
}

function beginJob() {
    if (activeJobs.size >= MAX_CONCURRENT_JOBS) throw new Error('Too many active jobs');
    const token = Symbol('job');
    activeJobs.add(token);
    return () => activeJobs.delete(token);
}

function validateActions(actions) {
    if (!actions) return [];
    if (!Array.isArray(actions) || actions.length > MAX_ACTIONS) throw new Error('Invalid actions list');
    return actions.filter(action => action && ['click', 'wait', 'scroll', 'type'].includes(action.type));
}

async function applyActions(page, actions) {
    for (const action of actions) {
        if (action.type === 'wait') await new Promise(resolve => setTimeout(resolve, Math.min(Number(action.milliseconds) || 500, 5000)));
        if (action.type === 'scroll') await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        if (action.type === 'click' && typeof action.selector === 'string') {
            await page.locator(action.selector).click({ timeout: 5000 }).catch(() => { });
        }
        if (action.type === 'type' && typeof action.selector === 'string' && typeof action.value === 'string') {
            await page.locator(action.selector).fill(action.value.slice(0, 500), { timeout: 5000 }).catch(() => { });
        }
    }
}

async function saveHistory(entry) {
    try {
        const history = JSON.parse(await fs.promises.readFile(historyFile, 'utf8')).slice(0, 49);
        history.unshift(entry);
        await fs.promises.writeFile(historyFile, JSON.stringify(history));
    } catch {
        await fs.promises.writeFile(historyFile, JSON.stringify([entry])).catch(() => { });
    }
}

async function readHistory() {
    try { return JSON.parse(await fs.promises.readFile(historyFile, 'utf8')); } catch { return []; }
}

function csvEscape(value) {
    const text = value == null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return '';
    const keys = [...new Set(rows.flatMap(row => Object.keys(row)))];
    return [keys.map(csvEscape).join(','), ...rows.map(row => keys.map(key => csvEscape(typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key])).join(','))].join('\n');
}

async function scrapeBulkItem(url) {
    const browser = await launchBrowser();
    try {
        const page = await browser.newPage();
        configurePage(page);
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        return await page.evaluate(() => ({
            title: document.title,
            description: document.querySelector('meta[name="description"]')?.content || '',
            canonical: document.querySelector('link[rel="canonical"]')?.href || '',
            url: location.href
        }));
    } finally {
        await browser.close().catch(() => { });
    }
}

// Dynamic browser loader for Vercel / Local environments
async function launchBrowser() {
    if (process.env.VERCEL) {
        const chromiumModule = await import('@sparticuz/chromium');
        const chromium = chromiumModule.default || chromiumModule;

        const puppeteerCoreModule = await import('puppeteer-core');
        const puppeteer = puppeteerCoreModule.default || puppeteerCoreModule;

        return await puppeteer.launch({
            args: [
                ...chromium.args,
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless
        });
    } else {
        const puppeteerModule = await import('puppeteer');
        const puppeteer = puppeteerModule.default || puppeteerModule;

        return await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ]
        });
    }
}

// --- FEATURE 1: API DATA EXTRACTION ---
app.post('/api/scrape', requireApiKey, rateLimit, async (req, res) => {
    let browser;
    let releaseJob;
    try {
        releaseJob = beginJob();
        const url = await normalizeTargetUrl(req.body?.url);
        const options = req.body?.options || {};
        const selectors = options.selectors && typeof options.selectors === 'object' ? options.selectors : {};
        const actions = validateActions(options.actions);
        browser = await launchBrowser();
        const page = await browser.newPage();
        configurePage(page);
        await page.setViewport({ width: 1920, height: 1080 });

        const videoStreams = [];
        const interceptedAPIs = [];

        page.on('response', async (response) => {
            const reqUrl = response.url();

            if (/\.(m3u8|mp4)(?:$|[?#])/i.test(reqUrl) && videoStreams.length < 100) {
                videoStreams.push(reqUrl);
            }

            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json') && !reqUrl.includes('google') && !reqUrl.includes('analytics')) {
                try {
                    const json = await response.json().catch(() => null);
                    if (json && interceptedAPIs.length < 20) {
                        interceptedAPIs.push({ endpoint: reqUrl, data: json });
                    }
                } catch (e) { }
            }
        });

        // Vercel serverless function timeout optimization (30s max for hobby)
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await applyActions(page, actions);

        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const timer = setInterval(() => {
                    window.scrollBy(0, 400);
                    totalHeight += 400;
                    if (totalHeight >= 3000 || totalHeight >= document.body.scrollHeight) {
                        clearInterval(timer);
                        window.scrollTo(0, 0);
                        resolve();
                    }
                }, 100);
            });
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        const pageData = await page.evaluate((customSelectors) => {
            const metaTitle = document.title || '';
            const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
            const getMeta = selector => document.querySelector(selector)?.content || '';
            const getElement = selector => selector ? document.querySelector(selector) : null;
            const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(script => {
                try { return JSON.parse(script.textContent); } catch { return null; }
            }).filter(Boolean);

            const iframes = Array.from(document.querySelectorAll('iframe'))
                .map(i => i.src || i.getAttribute('data-src'))
                .filter(src => src && src.startsWith('http'));

            const h1 = document.querySelector('h1')?.innerText.trim();

            const paragraphs = Array.from(document.querySelectorAll('p, .synopsis, .description, [class*="desc"]'))
                .map(p => p.innerText.trim())
                .filter(text => text.length > 40);
            paragraphs.sort((a, b) => b.length - a.length);
            const primaryDescription = paragraphs[0] || metaDescription;

            const visibleImages = Array.from(document.querySelectorAll('img')).map(img => {
                const rect = img.getBoundingClientRect();
                const src = img.src || img.getAttribute('data-src') || img.getAttribute('srcset') || '';
                return {
                    src: src.split(' ')[0],
                    area: rect.width * rect.height,
                    isLogo: src.toLowerCase().includes('logo') || src.toLowerCase().includes('icon')
                };
            }).filter(img => img.area > 5000 && !img.isLogo && img.src.startsWith('http'));

            visibleImages.sort((a, b) => b.area - a.area);
            const primaryImage = visibleImages[0]?.src || '';

            const cardElements = Array.from(document.querySelectorAll('a, article, .card, [class*="card"], [class*="item"]'));
            const itemsMap = new Map();

            cardElements.forEach(el => {
                const link = el.tagName === 'A' ? el.href : el.querySelector('a')?.href;
                const img = el.querySelector('img');
                const titleEl = el.querySelector('h1, h2, h3, h4, h5, .title, [class*="title"]');

                let title = titleEl ? titleEl.innerText.trim() : '';
                if (!title && el.getAttribute('title')) title = el.getAttribute('title');

                let image = img ? (img.src || img.getAttribute('data-src') || '') : '';

                if (!image) {
                    const bg = window.getComputedStyle(el).backgroundImage;
                    if (bg && bg.startsWith('url(')) {
                        image = bg.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
                    }
                }

                if (link && link.startsWith('http') && (title || image)) {
                    if (!itemsMap.has(link) && title.length < 100) {
                        itemsMap.set(link, {
                            title: title || 'Untitled Item',
                            image: image && image.startsWith('http') ? image : '',
                            url: link
                        });
                    }
                }
            });

            const collections = Array.from(itemsMap.values());

            return {
                isSinglePage: collections.length < 3,
                singleData: {
                    title: getElement(customSelectors.title)?.innerText.trim() || h1 || metaTitle,
                    description: getElement(customSelectors.description)?.textContent.trim() || primaryDescription,
                    mainImage: getElement(customSelectors.image)?.src || primaryImage,
                    embedIframes: iframes,
                    metadata: {
                        canonical: document.querySelector('link[rel="canonical"]')?.href || '',
                        ogTitle: getMeta('meta[property="og:title"]'),
                        ogDescription: getMeta('meta[property="og:description"]'),
                        ogImage: getMeta('meta[property="og:image"]'),
                        twitterImage: getMeta('meta[name="twitter:image"]'),
                        author: getMeta('meta[name="author"]'),
                        published: getMeta('meta[property="article:published_time"]')
                    },
                    jsonLd
                },
                collectionData: collections
            };
        }, selectors);

        if (options.screenshot || options.pdf) {
            pageData.artifacts = {};
            if (options.screenshot) pageData.artifacts.screenshot = (await page.screenshot({ fullPage: true, type: 'png' })).toString('base64');
            if (options.pdf) pageData.artifacts.pdf = (await page.pdf({ format: 'A4', printBackground: true })).toString('base64');
        }

        const result = {
            success: true,
            scrapedUrl: url,
            pageType: pageData.isSinglePage ? 'Single Content Page' : 'Collection/Catalog Page',
            mediaStreams: Array.from(new Set(videoStreams)),
            data: pageData.isSinglePage ? pageData.singleData : pageData.collectionData,
            interceptedAPICount: interceptedAPIs.length,
            interceptedAPIs: interceptedAPIs.slice(0, 5)
        };
        if (pageData.artifacts) result.artifacts = pageData.artifacts;
        await saveHistory({ id: Date.now().toString(36), createdAt: new Date().toISOString(), url, pageType: result.pageType, data: result.data });
        res.json(result);

    } catch (error) {
        sendError(res, error);
    } finally {
        if (browser) await browser.close().catch(() => { });
        if (releaseJob) releaseJob();
    }
});

// --- FEATURE 2: CLONE UI PREVIEW ---
app.post('/api/clone-ui', requireApiKey, rateLimit, async (req, res) => {
    let browser;
    let releaseJob;
    try {
        releaseJob = beginJob();
        const url = await normalizeTargetUrl(req.body?.url);
        browser = await launchBrowser();
        const page = await browser.newPage();
        configurePage(page);
        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const timer = setInterval(() => {
                    window.scrollBy(0, 400);
                    totalHeight += 400;
                    if (totalHeight >= 3000 || totalHeight >= document.body.scrollHeight) {
                        clearInterval(timer);
                        window.scrollTo(0, 0);
                        resolve();
                    }
                }, 100);
            });
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        const cleanHtml = await page.evaluate(() => {
            const origin = window.location.origin;

            let base = document.querySelector('base');
            if (!base) {
                base = document.createElement('base');
                document.head.prepend(base);
            }
            base.href = origin + '/';

            document.querySelectorAll('script').forEach(s => s.remove());

            document.querySelectorAll('*').forEach(el => {
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('on')) {
                        el.removeAttribute(attr.name);
                    }
                });
            });

            document.querySelectorAll('a').forEach(anchor => {
                anchor.setAttribute('data-original-href', anchor.getAttribute('href') || '');
                anchor.setAttribute('href', 'javascript:void(0);');
                anchor.removeAttribute('target');
            });

            return document.documentElement.outerHTML;
        });

        res.json({
            success: true,
            html: cleanHtml
        });

    } catch (error) {
        sendError(res, error);
    } finally {
        if (browser) await browser.close().catch(() => { });
        if (releaseJob) releaseJob();
    }
});

app.post('/api/bulk', requireApiKey, rateLimit, async (req, res) => {
    let releaseJob;
    try {
        releaseJob = beginJob();
        if (!Array.isArray(req.body?.urls) || req.body.urls.length === 0 || req.body.urls.length > MAX_BULK_URLS) throw new Error(`Provide between 1 and ${MAX_BULK_URLS} URLs`);
        const results = [];
        for (const value of req.body.urls) {
            try {
                const url = await normalizeTargetUrl(value);
                results.push({ url, success: true, data: await scrapeBulkItem(url) });
            } catch (error) { results.push({ url: value, success: false, error: error.message }); }
        }
        res.json({ success: true, results });
    } catch (error) { sendError(res, error); }
    finally { if (releaseJob) releaseJob(); }
});

app.get('/api/history', async (req, res) => res.json({ success: true, history: await readHistory() }));
app.delete('/api/history', async (req, res) => {
    await fs.promises.unlink(historyFile).catch(() => { });
    res.json({ success: true });
});

app.post('/api/export', async (req, res) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (req.body?.format === 'csv') {
        res.type('text/csv').send(buildCsv(rows));
    } else {
        res.json({ success: true, data: rows });
    }
});

app.get('/api/health', (req, res) => res.json({ success: true, activeJobs: activeJobs.size }));

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && error.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, error: 'Request body must be valid JSON' });
    }
    next(error);
});

// Export Express app for Vercel
module.exports = app;

// Listen locally when not in production
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 API Scraper running on http://localhost:${PORT}`));
}
const express = require('express');
const cors = require('cors');
const net = require('net');
const app = express();

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '16kb' }));
app.use(express.static(__dirname));

const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'localhost.localdomain',
    'metadata.google.internal',
    'metadata.google.com'
]);

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

function normalizeTargetUrl(value) {
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
    const status = ['URL is required', 'Invalid URL', 'Only public HTTP(S) URLs are allowed']
        .includes(error.message) ? 400 : 500;
    res.status(status).json({ success: false, error: error.message });
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
app.post('/api/scrape', async (req, res) => {
    let browser;
    try {
        const url = normalizeTargetUrl(req.body?.url);
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

        const pageData = await page.evaluate(() => {
            const metaTitle = document.title || '';
            const metaDescription = document.querySelector('meta[name="description"]')?.content || '';

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
                    title: h1 || metaTitle,
                    description: primaryDescription,
                    mainImage: primaryImage,
                    embedIframes: iframes
                },
                collectionData: collections
            };
        });

        res.json({
            success: true,
            scrapedUrl: url,
            pageType: pageData.isSinglePage ? 'Single Content Page' : 'Collection/Catalog Page',
            mediaStreams: Array.from(new Set(videoStreams)),
            data: pageData.isSinglePage ? pageData.singleData : pageData.collectionData,
            interceptedAPICount: interceptedAPIs.length,
            interceptedAPIs: interceptedAPIs.slice(0, 5)
        });

    } catch (error) {
        sendError(res, error);
    } finally {
        if (browser) await browser.close().catch(() => { });
    }
});

// --- FEATURE 2: CLONE UI PREVIEW ---
app.post('/api/clone-ui', async (req, res) => {
    let browser;
    try {
        const url = normalizeTargetUrl(req.body?.url);
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
    }
});

// Export Express app for Vercel
module.exports = app;

// Listen locally when not in production
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 API Scraper running on http://localhost:${PORT}`));
}
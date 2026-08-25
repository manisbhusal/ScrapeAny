const express = require('express');
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cors = require('cors');

// Activate stealth plugin to pass Cloudflare and anti-bot checks
puppeteerExtra.use(StealthPlugin());

const app = express();

// Permissive CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(express.static(__dirname));

// Dynamic browser loader for Vercel / Local environments
async function launchBrowser() {
    if (process.env.VERCEL) {
        const chromium = require('@sparticuz/chromium');
        const puppeteerCore = require('puppeteer-core');

        return await puppeteerExtra.launch({
            puppeteer: puppeteerCore,
            args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
    } else {
        const puppeteer = require('puppeteer');
        return await puppeteerExtra.launch({
            puppeteer,
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
    let { url } = req.body;

    if (!url) return res.status(400).json({ error: 'URL is required' });
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    let browser;
    try {
        browser = await launchBrowser();
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        const videoStreams = [];
        const interceptedAPIs = [];

        page.on('response', async (response) => {
            const reqUrl = response.url();

            if (reqUrl.includes('.m3u8') || reqUrl.includes('.mp4')) {
                videoStreams.push(reqUrl);
            }

            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json') && !reqUrl.includes('google') && !reqUrl.includes('analytics')) {
                try {
                    const json = await response.json().catch(() => null);
                    if (json) interceptedAPIs.push({ endpoint: reqUrl, data: json });
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

        await browser.close();

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
        if (browser) await browser.close();
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- FEATURE 2: CLONE UI PREVIEW ---
app.post('/api/clone-ui', async (req, res) => {
    let { url } = req.body;

    if (!url) return res.status(400).json({ error: 'URL is required' });
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    let browser;
    try {
        browser = await launchBrowser();
        const page = await browser.newPage();
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

        await browser.close();

        res.json({
            success: true,
            html: cleanHtml
        });

    } catch (error) {
        if (browser) await browser.close();
        res.status(500).json({ success: false, error: error.message });
    }
});

// Export Express app for Vercel
module.exports = app;

// Listen locally when not in production
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 API Scraper running on http://localhost:${PORT}`));
}
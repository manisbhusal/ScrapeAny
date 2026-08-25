const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cors = require('cors');

// Activate stealth plugin to pass Cloudflare and anti-bot checks
puppeteer.use(StealthPlugin());

const app = express();

// Permissive CORS configuration to prevent Brave Browser request blocking
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(express.static(__dirname));

// --- EXISTING FEATURE: API DATA EXTRACTION ---
app.post('/api/scrape', async (req, res) => {
    let { url } = req.body;

    if (!url) return res.status(400).json({ error: 'URL is required' });
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080'
            ]
        });

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

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

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

        await new Promise(resolve => setTimeout(resolve, 2000));

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

app.post('/api/clone-ui', async (req, res) => {
    let { url } = req.body;

    if (!url) return res.status(400).json({ error: 'URL is required' });
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Scroll down to force image lazy-loading and layout calculation
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

        await new Promise(resolve => setTimeout(resolve, 1500));

        // Clean executable JS, resolve relative URLs, and neutralize links
        const cleanHtml = await page.evaluate(() => {
            const origin = window.location.origin;

            // 1. Set base tag so relative CSS/Images load correctly
            let base = document.querySelector('base');
            if (!base) {
                base = document.createElement('base');
                document.head.prepend(base);
            }
            base.href = origin + '/';

            // 2. Remove all script tags
            document.querySelectorAll('script').forEach(s => s.remove());

            // 3. Remove inline event listeners
            document.querySelectorAll('*').forEach(el => {
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('on')) {
                        el.removeAttribute(attr.name);
                    }
                });
            });

            // 4. Neutralize all anchor links to prevent external redirection
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
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 API Scraper running on http://localhost:${PORT}`));
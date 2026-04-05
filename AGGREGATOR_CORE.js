const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');

puppeteer.use(StealthPlugin());

const CONFIG = {
    maxConcurrency: 1, 
    minPrice: 100000,
    maxScrollDepth: 18000,
    timeout: 90000,
    retryLimit: 3,
    saveInterval: 10000
};

let vault = [];
let isDirty = false;
let orterMap = new Map();

async function bootstrap() {
    console.log(">> [SYSTEM] INITIALIZING VOIDWALKER V37: ABSOLUTE DOMINATION");
    try {
        const raw = await fs.readFile('Aiorter.csv', 'utf8');
        const records = csv.parse(raw.replace(/^\uFEFF/, ''), { columns: true, delimiter: ';' });
        records.sort((a, b) => b.Tätort.length - a.Tätort.length).forEach(r => {
            orterMap.set(r.Tätort.toLowerCase().trim(), r.Kommun?.trim());
        });
    } catch (e) { console.log(">> [WARN] Geolocation DB offline."); }

    try {
        const data = await fs.readFile('market-data.json', 'utf8');
        vault = JSON.parse(data);
    } catch (e) { vault = []; }
}

const mapLocationFast = (text) => {
    const lowText = text.toLowerCase();
    for (let [ort, kommun] of orterMap) {
        if (lowText.includes(ort)) return { s: ort, k: kommun };
    }
    return { s: "", k: "" };
};

async function autoScroll(page, max) {
    await page.evaluate(async (max) => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const timer = setInterval(() => {
                const distance = 400 + Math.floor(Math.random() * 200);
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= document.body.scrollHeight || totalHeight >= max) {
                    clearInterval(timer);
                    resolve();
                }
            }, 150);
        });
    }, max);
}

async function run() {
    await bootstrap();

    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: CONFIG.maxConcurrency,
        retryLimit: CONFIG.retryLimit,
        puppeteerOptions: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote'
            ]
        }
    });

    const saveTicker = setInterval(async () => {
        if (isDirty) {
            await fs.writeFile('market-data.json', JSON.stringify(vault, null, 2));
            isDirty = false;
        }
    }, CONFIG.saveInterval);

    await cluster.task(async ({ page, data: target }) => {
        console.log(`>> [SCANNING] ${target.name}`);
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'media', 'font', 'stylesheet'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        try {
            await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeout });
            await autoScroll(page, CONFIG.maxScrollDepth);

            const extracted = await page.evaluate((minPrice) => {
                const cards = Array.from(document.querySelectorAll('li, article, [class*="card"]'));
                return cards.map(el => {
                    const txt = el.innerText || "";
                    const pMatch = txt.replace(/[\s\xa0.]/g, '').match(/(\d{6,11})kr/i);
                    const p = pMatch ? parseInt(pMatch[1]) : 0;
                    if (p < minPrice) return null;
                    const link = el.querySelector('a')?.href;
                    if (!link) return null;
                    return {
                        title: txt.split('\n')[0].substring(0, 100).trim(),
                        price: p,
                        url: link.split('?')[0].split('#')[0],
                        raw: txt.substring(0, 500)
                    };
                }).filter(i => i !== null);
            }, CONFIG.minPrice);

            const hostname = new URL(target.url).hostname;
            const seenNow = new Set();

            extracted.forEach(item => {
                const loc = mapLocationFast(item.title + " " + item.raw);
                const entry = {
                    u: item.url, a: item.title, p: item.price, s: loc.s, k: loc.k,
                    t: new Date().toISOString(), status: "ACTIVE"
                };
                seenNow.add(entry.u);
                const idx = vault.findIndex(v => v.u === entry.u);
                if (idx > -1) {
                    vault[idx] = { ...vault[idx], ...entry, status: "ACTIVE" };
                } else {
                    entry.firstSeen = entry.t;
                    vault.push(entry);
                }
                isDirty = true;
            });

            if (extracted.length > 5) {
                vault.forEach(v => {
                    if (v.u.includes(hostname) && !seenNow.has(v.u) && v.status === "ACTIVE") {
                        v.status = "SOLD";
                        v.soldAt = new Date().toISOString();
                        isDirty = true;
                    }
                });
            }
        } catch (err) {
            console.error(`>> [FAILED] ${target.name}: ${err.message}`);
        }
    });

    const targets = require('./targets');
    targets.forEach(t => cluster.queue(t));

    await cluster.idle();
    await cluster.close();
    clearInterval(saveTicker);
    await fs.writeFile('market-data.json', JSON.stringify(vault, null, 2));
    console.log(">> [COMPLETE]");
}

run().catch(err => {
    console.error(">> [FATAL]:", err.message);
    process.exit(1);
});

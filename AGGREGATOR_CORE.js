const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');

// Aktivera stealth-skydd
puppeteer.use(StealthPlugin());

const CONFIG = {
    maxConcurrency: 1, // GitHub Actions RAM är begränsat, kör en i taget för stabilitet
    minPrice: 100000,
    maxScrollDepth: 18000,
    timeout: 90000,
    retryLimit: 3,
    saveInterval: 10000
};

let vault = [];
let isDirty = false;
let orterMap = new Map();

/**
 * BOOTSTRAP: Ladda intelligens och befintlig data
 */
async function bootstrap() {
    console.log(">> [SYSTEM] INITIALIZING VOIDWALKER V28: EMPIRE ENGINE ONLINE");
    try {
        const raw = await fs.readFile('Aiorter.csv', 'utf8');
        const records = csv.parse(raw.replace(/^\uFEFF/, ''), { columns: true, delimiter: ';' });
        // Sortera på längd för att matcha "Stockholm" före "Stock"
        records.sort((a, b) => b.Tätort.length - a.Tätort.length).forEach(r => {
            orterMap.set(r.Tätort.toLowerCase().trim(), r.Kommun?.trim());
        });
        console.log(`>> [DB] Strategic Nodes Online: ${orterMap.size}`);
    } catch (e) { console.log(">> [WARN] Geolocation DB offline."); }

    try {
        const data = await fs.readFile('market-data.json', 'utf8');
        vault = JSON.parse(data);
    } catch (e) { vault = []; }
}

/**
 * GEO-MAPPING: Identifiera ort och kommun från text
 */
const mapLocationFast = (text) => {
    const lowText = text.toLowerCase();
    for (let [ort, kommun] of orterMap) {
        if (lowText.includes(ort)) return { s: ort, k: kommun };
    }
    return { s: "", k: "" };
};

/**
 * AUTO-SCROLL: Ladda lazy-loading element organiskt
 */
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

/**
 * MAIN EXECUTION ENGINE
 */
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
                '--no-zygote',
                '--disable-extensions'
            ]
        }
    });

    // Autosave ticker
    const saveTicker = setInterval(async () => {
        if (isDirty) {
            console.log(">> [IO] Autosaving Vault...");
            await fs.writeFile('market-data.json', JSON.stringify(vault, null, 2));
            isDirty = false;
        }
    }, CONFIG.saveInterval);

    // THE INFILTRATION TASK
    await cluster.task(async ({ page, data: target }) => {
        console.log(`>> [SCANNING] ${target.name}`);
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        
        // Resource Assassin: Blockera tunga element
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'media', 'font', 'stylesheet'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        try {
            await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeout });
            
            // Bypass cookies
            await page.evaluate(() => {
                const btn = Array.from(document.querySelectorAll('button, a, span'))
                    .find(el => /acceptera|godkänn|ok|agree|accept/i.test(el.innerText));
                if (btn) btn.click();
            }).catch(() => {});

            await autoScroll(page, CONFIG.maxScrollDepth);

            // DATA EXTRACTION ENGINE
            const extracted = await page.evaluate((minPrice) => {
                const cards = Array.from(document.querySelectorAll('li, article, [class*="card"], [class*="item"]'));
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

            // VAULT MERGE
            const hostname = new URL(target.url).hostname;
            const seenNow = new Set();

            extracted.forEach(item => {
                const loc = mapLocationFast(item.title + " " + item.raw);
                const entry = {
                    u: item.url,
                    a: item.title,
                    p: item.price,
                    s: loc.s,
                    k: loc.k,
                    t: new Date().toISOString(),
                    status: "ACTIVE"
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

            // SOLD DETECTION: Markera objekt som försvunnit
            if (extracted.length > 5) {
                vault.forEach(v => {
                    if (v.u.includes(hostname) && !seenNow.has(v.u) && v.status === "ACTIVE") {
                        v.status = "SOLD";
                        v.soldAt = new Date().toISOString();
                        isDirty = true;
                    }
                });
            }

            console.log(`>> [SUCCESS] ${target.name}: Sync Complete. Found ${extracted.length} objects.`);

        } catch (err) {
            console.error(`>> [FAILED] ${target.name}: ${err.message}`);
        }
    });

    // START QUEUE
    try {
        const targets = require('./targets');
        targets.forEach(t => cluster.queue(t));
    } catch (e) {
        console.error(">> [FATAL] No targets.js found!");
        process.exit(1);
    }

    await cluster.idle();
    await cluster.close();
    clearInterval(saveTicker);
    await fs.writeFile('market-data.json', JSON.stringify(vault, null, 2));
    console.log(">> [COMPLETE] Empire Synchronized.");
}

run().catch(err => {
    console.error(">> [FATAL ERROR]:", err.message);
    process.exit(1);
});

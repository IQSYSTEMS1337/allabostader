const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');

// Aktivera stealth för att undvika Cloudflare/Bot-detection
puppeteer.use(StealthPlugin());

const CONFIG = {
    maxConcurrency: 2, // Sänkt till 2 för stabilitet i CI (GitHub Actions har begränsat RAM)
    minPrice: 100000,
    maxScrollDepth: 15000,
    timeout: 90000, // Ökad timeout för långsamma nätverk
    retryLimit: 3,
    saveInterval: 10000 // Spara var 10:e sekund
};

let orterMap = new Map();
let vault = [];
let isDirty = false;

/**
 * BOOTSTRAP: Förbered systemet och ladda intelligens
 */
async function bootstrap() {
    console.log(">> [SYSTEM] VOIDWALKER V21 ACTIVATED: CI-STABILIZED PROTOCOL");

    // Ladda Orter - O(1) sökning
    try {
        const raw = await fs.readFile('Aiorter.csv', 'utf8');
        const records = csv.parse(raw.replace(/^\uFEFF/, ''), { columns: true, delimiter: ';' });
        records.sort((a, b) => b.Tätort.length - a.Tätort.length).forEach(r => {
            orterMap.set(r.Tätort.toLowerCase().trim(), r.Kommun?.trim());
        });
        console.log(`>> [DB] Strategic Nodes Online: ${orterMap.size}`);
    } catch (e) { console.log(">> [WARN] Geolocation DB offline. Continuing without mapping."); }

    // Ladda befintlig data
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

/**
 * CORE ENGINE
 */
async function run() {
    await bootstrap();

    // CLUSTER LAUNCH - Optimerad för GitHub Actions (Linux/Docker)
    let cluster;
    try {
        cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_CONTEXT,
            maxConcurrency: CONFIG.maxConcurrency,
            puppeteerOptions: {
                headless: true, // Standard headless är säkrast i CI
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage', // KRITISKT: Förhindrar krasch i containrar
                    '--disable-gpu',
                    '--disable-notifications',
                    '--no-zygote',
                    '--single-process' // Sparar enormt mycket RAM
                ]
            }
        });
    } catch (err) {
        console.error(">> [FATAL] Browser Cluster failed to ignite:", err.message);
        process.exit(1);
    }

    // Atomic I/O Ticker
    const saveVault = async () => {
        if (isDirty) {
            console.log(">> [IO] Synchronizing Vault to disk...");
            await fs.writeFile('market-data.json', JSON.stringify(vault, null, 2));
            isDirty = false;
        }
    };
    const saveTicker = setInterval(saveVault, CONFIG.saveInterval);

    await cluster.task(async ({ page, data: target }) => {
        // Ghost Profile
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        // Resource Assassin 3.0: Döda allt onödigt för hastighet
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const blocked = ['image', 'media', 'font', 'stylesheet', 'other'];
            if (blocked.includes(req.resourceType()) || req.url().includes('analytics') || req.url().includes('facebook')) {
                req.abort();
            } else {
                req.continue();
            }
        });

        try {
            console.log(`>> [INFILTRATING] ${target.name}...`);
            await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeout });

            // Hantera cookies snabbt
            await page.evaluate(() => {
                const btn = Array.from(document.querySelectorAll('button, a, div'))
                    .find(el => /acceptera|godkänn|ok|agree|accept/i.test(el.innerText));
                if (btn) btn.click();
            }).catch(() => {});

            await autoScroll(page, CONFIG.maxScrollDepth);

            // EXTRACTION ENGINE
            const extracted = await page.evaluate((minPrice) => {
                const items = Array.from(document.querySelectorAll('li, article, [class*="card"], [class*="item"]'));
                return items.map(el => {
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

            // DATA MERGE & SYNC
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
                    vault[idx] = { ...vault[idx], ...entry };
                } else {
                    entry.firstSeen = entry.t;
                    vault.push(entry);
                }
                isDirty = true;
            });

            // SOLD DETECTION (Safety check: Endast om vi faktiskt fick resultat)
            if (extracted.length > 5) {
                vault.forEach(v => {
                    if (v.u.includes(hostname) && !seenNow.has(v.u) && v.status === "ACTIVE") {
                        v.status = "SOLD";
                        v.soldAt = new Date().toISOString();
                        isDirty = true;
                    }
                });
            }

            console.log(`>> [SUCCESS] ${target.name}: Found ${extracted.length} assets.`);

        } catch (err) {
            console.error(`>> [ERROR] ${target.name}: ${err.message}`);
        }
    });

    // Köa targets
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
    await saveVault();
    console.log(`>> [COMPLETE] Empire Synchronized. Total Vault Assets: ${vault.length}`);
}

async function autoScroll(page, max) {
    await page.evaluate(async (max) => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const timer = setInterval(() => {
                const distance = 500;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= document.body.scrollHeight || totalHeight >= max) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    }, max);
}

run();

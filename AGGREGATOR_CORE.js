const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises; // Använd asynkron FS
const csv = require('csv-parse/sync');

puppeteer.use(StealthPlugin());

const CONFIG = {
    maxConcurrency: 3, 
    minPrice: 100000,
    maxScrollDepth: 20000,
    timeout: 60000, 
    retryLimit: 5,
    saveInterval: 5000 // Spara var 5:e sekund istället för vid varje träff
};

// --- DATA INTELLIGENCE LAYER ---
let orterMap = new Map();
let vault = [];
let isDirty = false;

async function bootstrap() {
    console.log(">> [SYSTEM] INITIALIZING VOIDWALKER V20: PURE INFILTRATION");

    // Ladda Orter - Optimerad för hastighet
    try {
        const raw = await fs.readFile('Aiorter.csv', 'utf8');
        const records = csv.parse(raw.replace(/^\uFEFF/, ''), { columns: true, delimiter: ';' });
        // Skapa en optimerad sök-cache sorterad på längd för att undvika "Malmö" vs "Malmö-området"
        records.sort((a, b) => b.Tätort.length - a.Tätort.length).forEach(r => {
            orterMap.set(r.Tätort.toLowerCase().trim(), r.Kommun?.trim());
        });
        console.log(`>> [DB] Matrix Online: ${orterMap.size} Strategic Nodes.`);
    } catch (e) { console.log(">> [WARN] Geolocation offline."); }

    // Ladda Vault
    try {
        const data = await fs.readFile('market-data.json', 'utf8');
        vault = JSON.parse(data);
    } catch (e) { vault = []; }
}

// Snabb sökning utan RegExp-loopar i onödan
const mapLocationFast = (text) => {
    const lowText = text.toLowerCase();
    for (let [ort, kommun] of orterMap) {
        if (lowText.includes(ort)) return { s: ort, k: kommun };
    }
    return { s: "", k: "" };
};

async function run() {
    await bootstrap();

    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT, // Bättre isolering än PAGE
        maxConcurrency: CONFIG.maxConcurrency,
        puppeteerOptions: {
            headless: "shell", // Snabbaste och mest moderna headless-läget
            args: [
                '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--js-flags="--max-old-space-size=512"' // Begränsar minnesläckage
            ]
        }
    });

    // Centraliserad Spara-funktion (Undviker Race Conditions)
    const saveVault = async () => {
        if (isDirty) {
            await fs.writeFile('market-data.json', JSON.stringify(vault, null, 2));
            isDirty = false;
        }
    };
    const saveTicker = setInterval(saveVault, CONFIG.saveInterval);

    await cluster.task(async ({ page, data: target }) => {
        // Ghost Profile Generation
        await page.setUserAgent(`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36`);
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7' });

        // Resource Assassin 2.0 (Blockerar även trackers och analytics)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const blockList = ['image', 'media', 'font', 'stylesheet', 'other'];
            const url = req.url();
            if (blockList.includes(req.resourceType()) || url.includes('google-analytics') || url.includes('facebook')) {
                req.abort();
            } else {
                req.continue();
            }
        });

        try {
            await page.goto(target.url, { waitUntil: 'networkidle2', timeout: CONFIG.timeout });
            
            // Smarter Cookie Bypass
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                const consent = buttons.find(b => /acceptera|godkänn|ok|agree/i.test(b.innerText));
                if (consent) consent.click();
            });

            await autoScroll(page, CONFIG.maxScrollDepth);

            // High-Speed Extraction
            const extracted = await page.evaluate((minPrice) => {
                return Array.from(document.querySelectorAll('li, article, [class*="item"]'))
                    .map(el => {
                        const t = el.innerText || "";
                        const pMatch = t.replace(/\s/g, '').match(/(\d{6,11})kr/i);
                        const p = pMatch ? parseInt(pMatch[1]) : 0;
                        if (p < minPrice) return null;
                        
                        const link = el.querySelector('a')?.href;
                        if (!link) return null;

                        return {
                            title: t.split('\n')[0].substring(0, 100),
                            price: p,
                            url: link.split('?')[0],
                            raw: t.substring(0, 500)
                        };
                    }).filter(x => x !== null);
            }, CONFIG.minPrice);

            // Merge till Vault (In-memory)
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
                const existingIdx = vault.findIndex(v => v.u === entry.u);
                if (existingIdx > -1) {
                    vault[existingIdx] = { ...vault[existingIdx], ...entry };
                } else {
                    entry.firstSeen = entry.t;
                    vault.push(entry);
                }
                isDirty = true;
            });

            // Markera sålda: Om vi sett mer än 5 objekt men vissa gamla saknas
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

    const targets = require('./targets');
    targets.forEach(t => cluster.queue(t));

    await cluster.idle();
    await cluster.close();
    clearInterval(saveTicker);
    await saveVault();
    console.log(`>> [COMPLETE] Empire Synchronized. Total: ${vault.length}`);
}

async function autoScroll(page, max) {
    await page.evaluate(async (max) => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 400;
            const timer = setInterval(() => {
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

run();

const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const csv = require('csv-parse/sync');

puppeteer.use(StealthPlugin());

// --- EMPIRE CONFIGURATION ---
const CONFIG = {
    maxConcurrency: 2, // GitHub Actions RAM-safe
    saveInterval: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    minPrice: 100000
};

async function runEmpireAggregator() {
    console.log(">> [SYSTEM] INITIALIZING OMNI-SCRAPER V3: TOTAL DOMINATION MODE");

    // 1. DATA INTELLIGENCE SETUP
    let orterDB = [];
    try {
        if (fs.existsSync('Aiorter.csv')) {
            const raw = fs.readFileSync('Aiorter.csv', 'utf8');
            orterDB = csv.parse(raw, { columns: true, skip_empty_lines: true, delimiter: ';' });
        }
    } catch (e) { console.log(">> [WARN] Aiorter.csv database offline."); }

    let vault = [];
    if (fs.existsSync('market-data.json')) {
        try { vault = JSON.parse(fs.readFileSync('market-data.json', 'utf8')); } catch (e) { vault = []; }
    }

    // 2. LAUNCH STEALTH CLUSTER
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: CONFIG.maxConcurrency,
        puppeteerOptions: {
            headless: "new",
            args: [
                '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
                '--disable-gpu', '--no-zygote', '--single-process'
            ]
        }
    });

    // 3. THE INFILTRATION TASK
    await cluster.task(async ({ page, data: target }) => {
        // Avancerad maskering
        await page.setUserAgent(CONFIG.userAgent);
        await page.setViewport({ width: 1920, height: 1080 });

        try {
            console.log(`>> [PENETRATING] ${target.name}...`);
            await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Kraftfull auto-scroll för att väcka lazy-loading av bilder och priser
            await autoScroll(page);

            const results = await page.evaluate((minPrice) => {
                const found = [];
                
                // --- METOD A: JSON-LD (Högsta precision) ---
                const jsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
                jsonScripts.forEach(script => {
                    try {
                        const data = JSON.parse(script.innerText);
                        // Hantera både enskilda objekt och listor
                        const items = data['@type'] === 'ItemList' ? data.itemListElement : [data];
                        
                        items.forEach(item => {
                            const obj = item.item || item;
                            if (obj['@type'] === 'RealEstateListing' || obj.name) {
                                let p = 0;
                                if (obj.offers?.price) p = parseInt(obj.offers.price);
                                
                                if (p >= minPrice) {
                                    found.push({
                                        a: obj.name || obj.address?.streetAddress,
                                        p: p,
                                        u: obj.url || window.location.href,
                                        img: obj.image || "",
                                        area: obj.floorSize?.value || 0
                                    });
                                }
                            }
                        });
                    } catch (e) {}
                });

                // --- METOD B: DOM-FALLBACK (Om JSON-LD saknas) ---
                if (found.length === 0) {
                    const cards = document.querySelectorAll('li, article, [class*="card"], [class*="listing"]');
                    cards.forEach(card => {
                        const text = card.innerText || "";
                        if (text.includes('kr') && (text.includes('m²') || text.includes('rum'))) {
                            const priceMatch = text.replace(/\s/g, '').match(/(\d{6,11})/);
                            const price = priceMatch ? parseInt(priceMatch[1]) : 0;
                            
                            if (price >= minPrice) {
                                found.push({
                                    a: text.split('\n')[0].trim().substring(0, 60),
                                    p: price,
                                    u: card.querySelector('a')?.href || window.location.href,
                                    img: card.querySelector('img')?.src || "",
                                    area: parseInt(text.match(/(\d+)\s?m²/)?.[1]) || 0
                                });
                            }
                        }
                    });
                }
                return found;
            }, CONFIG.minPrice);

            // 4. SMART MERGE & PRICE HISTORY ENGINE
            results.forEach(item => {
                const idx = vault.findIndex(v => v.u === item.u);
                const now = new Date().toISOString();

                if (idx > -1) {
                    const old = vault[idx];
                    
                    // Spåra prishistorik - Kraftfullare än Booli
                    if (old.p !== item.p && item.p > 0) {
                        if (!old.history) old.history = [];
                        old.history.push({ p: old.p, d: old.t || old.firstSeen });
                        
                        // Beräkna förändring i %: $$ \Delta \% = \frac{old - new}{old} \times 100 $$
                        item.pc = Math.round(((old.p - item.p) / old.p) * 100);
                        item.trend = item.p < old.p ? 'DOWN' : 'UP';
                    }

                    // Behåll ursprungligt datum
                    item.firstSeen = old.firstSeen || old.t;
                    item.history = old.history || [];
                    vault[idx] = { ...old, ...item, t: now };
                } else {
                    // Ny infiltration
                    item.firstSeen = now;
                    item.t = now;
                    item.history = [];
                    vault.push(item);
                }
            });

            // 5. ATOMÄR SPARNING (Förlustminimering)
            fs.writeFileSync('market-data.json', JSON.stringify(vault, null, 2));
            console.log(`>> [SUCCESS] ${target.name}: Found ${results.length} units.`);

        } catch (err) {
            console.error(`>> [FAILED] ${target.name}: ${err.message}`);
        }
    });

    // 6. TARGETING ENGINE
    try {
        const targets = require('./targets');
        targets.forEach(t => cluster.queue(t));
    } catch (e) { console.error(">> [FATAL] targets.js missing."); }

    await cluster.idle();
    await cluster.close();
    console.log(`>> [COMPLETE] Vault updated. Total assets: ${vault.length}`);
}

// HJÄLPFUNKTION: REALISTISK SCROLL
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            let distance = 150;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight || totalHeight > 5000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 150);
        });
    });
}

runEmpireAggregator();

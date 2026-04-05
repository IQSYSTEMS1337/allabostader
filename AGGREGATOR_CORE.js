const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const csv = require('csv-parse/sync');

// Infiltrations-plugins
puppeteer.use(StealthPlugin());

const CONFIG = {
    maxConcurrency: 2, 
    minPrice: 100000,
    maxScrollDepth: 18000,
    timeout: 90000, 
    retryLimit: 4 // Höjd gräns för att tvinga sig igenom
};

async function runEmpireAggregator() {
    console.log(">> [SYSTEM] INITIALIZING OMNI-REVENANT V19: GHOST PROTOCOL ACTIVATED");

    // 1. DATA INTELLIGENCE SETUP
    let orterDB = [];
    try {
        if (fs.existsSync('Aiorter.csv')) {
            const raw = fs.readFileSync('Aiorter.csv', 'utf8').replace(/^\uFEFF/, '');
            orterDB = csv.parse(raw, { columns: true, skip_empty_lines: true, delimiter: ';' });
            orterDB = orterDB.sort((a, b) => (b.Tätort?.length || 0) - (a.Tätort?.length || 0));
            console.log(`>> [DB] Strategic Matrix Loaded: ${orterDB.length} Locations.`);
        }
    } catch (e) { console.log(">> [WARN] Intelligence source offline."); }

    let vault = [];
    if (fs.existsSync('market-data.json')) {
        try { vault = JSON.parse(fs.readFileSync('market-data.json', 'utf8')); } catch (e) { vault = []; }
    }

    const mapLocation = (text) => {
        if (!orterDB.length) return { s: "", k: "" };
        const lowText = text.toLowerCase();
        for (let ort of orterDB) {
            if (!ort.Tätort) continue;
            const name = ort.Tätort.trim();
            if (new RegExp(`\\b${name}\\b`, 'i').test(lowText)) {
                return { s: name, k: ort.Kommun?.trim() || "" };
            }
        }
        return { s: "", k: "" };
    };

    // 2. THE CLUSTER ENGINE - STEALTH MODE
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: CONFIG.maxConcurrency,
        retryLimit: CONFIG.retryLimit,
        puppeteerOptions: {
            headless: "new",
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-web-security', 
                '--disable-blink-features=AutomationControlled', // Dödar webdriver-flaggor
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        }
    });

    // 3. THE INFILTRATION TASK
    await cluster.task(async ({ page, data: target }) => {
        
        // Ghost Protocol: Roterande fönsterstorlek & Human UA
        const uas = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
        ];
        await page.setUserAgent(uas[Math.floor(Math.random() * uas.length)]);
        await page.setViewport({ 
            width: 1920 + Math.floor(Math.random() * 100), 
            height: 1080 + Math.floor(Math.random() * 100) 
        });

        // Resource Assassin: Blockera tunga/spårande element för maxhastighet
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const type = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        try {
            // Använd domcontentloaded för snabbare intrång, fallback på networkidle
            await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeout });
            
            // Human delay: Ge anti-bot-systemen en sekund att slappna av
            await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));

            // Hantera Cookies - Skottsäker mot Execution Context Destruction
            try {
                const clicked = await page.evaluate(() => {
                    const keywords = ['acceptera', 'godkänn', 'stäng', 'ok', 'agree', 'accept', 'tillåt alla'];
                    const elements = document.querySelectorAll('button, span, a, div[role="button"]');
                    for (let el of elements) {
                        if (keywords.some(k => el.innerText.toLowerCase().includes(k))) {
                            el.click(); return true;
                        }
                    }
                    return false;
                });
                // Om vi klickade, vänta ifall sidan laddar om
                if (clicked) await new Promise(r => setTimeout(r, 2000));
            } catch (err) { /* Ignorera om ingen cookie-ruta fanns */ }

            // Organiskt scrollande
            await autoScrollAdvanced(page, CONFIG.maxScrollDepth);

            // EXTRACTION (Med extra try-catch per element för att överleva mutationer)
            const rawResults = await page.evaluate(({ minPrice }) => {
                const items = [];
                const cards = document.querySelectorAll('li, article, [class*="card"], [class*="listing"]');
                cards.forEach(c => {
                    try {
                        const txt = c.innerText || "";
                        if (txt.includes('kr')) {
                            const pMatch = txt.replace(/[\s\xa0.]/g, '').match(/(\d{6,11})kr/i);
                            const price = pMatch ? parseInt(pMatch[1]) : 0;
                            if (price >= minPrice) {
                                const link = c.href || c.querySelector('a')?.href;
                                if (!link) return;
                                
                                // Plocka fram area och rum lite smartare för att minska skräp
                                const rawText = txt.substring(0, 300);
                                let area = 0, rooms = 0;
                                const areaMatch = rawText.match(/(\d+)\s*m/i);
                                if (areaMatch) area = parseInt(areaMatch[1]);
                                const roomMatch = rawText.match(/(\d+)\s*rum|rok/i);
                                if (roomMatch) rooms = parseInt(roomMatch[1]);

                                items.push({
                                    a: txt.split('\n')[0].trim().substring(0, 85),
                                    p: price,
                                    area: area,
                                    rooms: rooms,
                                    u: link.split('?')[0].split('#')[0],
                                    img: "", // Bilder blockeras ändå av Resource Assassin, vi använder drönarvyn
                                    rawText: rawText
                                });
                            }
                        }
                    } catch (e) { /* Enstaka kort kraschar inte hela systemet */ }
                });
                return items;
            }, { minPrice: CONFIG.minPrice });

            const targetHostname = new URL(target.url).hostname;
            const currentRunUrls = new Set(rawResults.map(r => r.u));

            // Injektion till Vault
            rawResults.forEach(item => {
                const geo = mapLocation(item.a + " " + (item.rawText || ""));
                item.s = geo.s; item.k = geo.k; delete item.rawText;
                const idx = vault.findIndex(v => v.u === item.u);
                if (idx > -1) {
                    vault[idx] = { ...vault[idx], ...item, t: new Date().toISOString(), status: "ACTIVE" };
                } else {
                    item.firstSeen = new Date().toISOString(); item.t = item.firstSeen; item.status = "ACTIVE";
                    vault.push(item);
                }
            });

            // --- THE ABSOLUTE SAFEGUARD ---
            if (rawResults.length > 10) { 
                vault.forEach(v => {
                    if (v.u.includes(targetHostname) && !currentRunUrls.has(v.u) && v.status !== "SOLD") {
                        v.status = "SOLD";
                        v.soldAt = new Date().toISOString();
                    }
                });
                console.log(`>> [SUCCESS] ${target.name}: Sync genomförd. Hittade ${rawResults.length} objekt.`);
            } else {
                console.log(`>> [SAFEGUARD] Blockering detekterad (Hittade bara ${rawResults.length} objekt). Behåller befintlig data för ${target.name}.`);
            }

            fs.writeFileSync('market-data.json', JSON.stringify(vault, null, 2));

        } catch (err) { console.error(`>> [FAILED] ${target.name}: ${err.message}`); }
    });

    const targets = require('./targets');
    targets.forEach(t => cluster.queue(t));
    await cluster.idle();
    await cluster.close();
    
    console.log(`>> [COMPLETE] Empire Synchronized. Total Assets: ${vault.length}`);
}

async function autoScrollAdvanced(page, max) {
    await page.evaluate(async (max) => {
        await new Promise((resolve) => {
            let total = 0;
            let timer = setInterval(() => {
                // Mänskligare scroll: Slumpmässiga steg istället för exakt 400px
                let step = 300 + Math.floor(Math.random() * 200);
                window.scrollBy(0, step);
                total += step;
                if (total >= document.body.scrollHeight || total > max) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100 + Math.floor(Math.random() * 100)); // Slumpmässig paus
        });
    }, max);
}

runEmpireAggregator();

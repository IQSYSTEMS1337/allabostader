const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const csv = require('csv-parse/sync');

// Infiltrations-plugins
puppeteer.use(StealthPlugin());

const CONFIG = {
    maxConcurrency: 2, // GitHub Actions safe-zone
    minPrice: 100000,
    maxScrollDepth: 18000,
    timeout: 90000, // Utökad för tunga sidor
    retryLimit: 3
};

async function runEmpireAggregator() {
    console.log(">> [SYSTEM] INITIALIZING OMNI-REVENANT V8: ABSOLUTE DOMINATION MODE");

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

    // Node-side Geocoding (Zero RAM Leak)
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

    // 2. THE CLUSTER ENGINE
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: CONFIG.maxConcurrency,
        retryLimit: CONFIG.retryLimit,
        retryDelay: 3000,
        puppeteerOptions: {
            headless: "new",
            args: [
                '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
                '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process',
                '--window-size=1920,1080'
            ]
        }
    });

    // 3. THE INFILTRATION TASK
    await cluster.task(async ({ page, data: target }) => {
        const uas = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        ];
        
        await page.setUserAgent(uas[Math.floor(Math.random() * uas.length)]);
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8' });

        // Kill tracker noise
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['font', 'media', 'other'].includes(req.resourceType())) req.abort();
            else req.continue();
        });

        console.log(`>> [PENETRATING] ${target.name} | URL: ${target.url.substring(0, 40)}...`);
        
        try {
            await page.goto(target.url, { waitUntil: 'networkidle2', timeout: CONFIG.timeout });
            
            // Humanize: Slumpmässig interaktion för att låsa upp dolda scripts
            await page.mouse.move(Math.random() * 800, Math.random() * 600);
            await new Promise(r => setTimeout(r, 1500));

            // Krossa Cookie-blockader som döljer innehåll
            await page.evaluate(() => {
                const selectors = ['button', 'span', 'a', 'div'];
                const keywords = ['acceptera', 'godkänn', 'stäng', 'ok', 'agree', 'accept'];
                const elements = document.querySelectorAll(selectors.join(','));
                for (let el of elements) {
                    if (keywords.some(k => el.innerText.toLowerCase().includes(k))) {
                        el.click(); break;
                    }
                }
            }).catch(() => {});

            await autoScrollAdvanced(page, CONFIG.maxScrollDepth);

            // EXTRACTION PROTOCOL
            const rawResults = await page.evaluate(({ minPrice }) => {
                const items = [];
                const now = new Date().toISOString();

                const cleanUrl = (link) => {
                    try {
                        const u = new URL(link, window.location.href);
                        u.search = ''; u.hash = '';
                        return u.toString();
                    } catch(e) { return link; }
                };

                // Strategi 1: JSON-LD (Deep Precision)
                document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
                    try {
                        const d = JSON.parse(s.innerText);
                        const list = d['@type'] === 'ItemList' ? d.itemListElement : [d];
                        list.forEach(i => {
                            const o = i.item || i;
                            if (o['@type']?.includes('RealEstate') || o.name) {
                                const price = parseInt(o.offers?.price || 0);
                                if (price >= minPrice) {
                                    items.push({
                                        a: (o.name || o.address?.streetAddress || "").substring(0, 85),
                                        p: price,
                                        u: cleanUrl(o.url),
                                        img: o.image?.[0] || o.image || "",
                                        area: parseInt(o.floorSize?.value) || 0,
                                        rooms: parseInt(o.numberOfRooms) || 0,
                                        byggar: o.dateBuilt || 0,
                                        typ: o['@type']?.includes('Residence') ? 'Villa' : 'Bostad',
                                        t: now
                                    });
                                }
                            }
                        });
                    } catch(e) {}
                });

                // Strategi 2: DOM Harvesting (Brute Force)
                if (items.length < 5) {
                    const cards = document.querySelectorAll('li, article, [class*="card"], [class*="listing"]');
                    cards.forEach(c => {
                        const txt = c.innerText || "";
                        if (txt.includes('kr')) {
                            const pMatch = txt.replace(/[\s\xa0.]/g, '').match(/(\d{6,11})kr/i);
                            const price = pMatch ? parseInt(pMatch[1]) : 0;
                            if (price >= minPrice) {
                                const link = c.href || c.querySelector('a')?.href;
                                if (!link) return;
                                
                                const img = c.querySelector('img');
                                const areaM = txt.match(/(\d+[,.]?\d*)\s*(?:m²|kvm)/i);
                                const roomM = txt.match(/(\d+[,.]?\d*)\s*(?:rum|rok)/i);

                                items.push({
                                    a: txt.split('\n')[0].trim().substring(0, 85),
                                    p: price,
                                    u: cleanUrl(link),
                                    img: img ? (img.dataset.src || img.srcset?.split(' ')[0] || img.src) : "",
                                    area: areaM ? parseFloat(areaM[1].replace(',', '.')) : 0,
                                    rooms: roomM ? parseFloat(roomM[1].replace(',', '.')) : 0,
                                    rawText: txt.substring(0, 300) // För Node-geocoding
                                });
                            }
                        }
                    });
                }
                return items;
            }, { minPrice: CONFIG.minPrice });

            // 4. VAULT INTEGRATION (Node Side)
            const targetHostname = new URL(target.url).hostname;
            const currentRunUrls = new Set(rawResults.map(r => r.u));

            rawResults.forEach(item => {
                const geo = mapLocation(item.a + " " + (item.rawText || ""));
                item.s = geo.s; item.k = geo.k; delete item.rawText;

                const idx = vault.findIndex(v => v.u === item.u);
                const timestamp = new Date().toISOString();

                if (idx > -1) {
                    const old = vault[idx];
                    if (old.p !== item.p && item.p > 0) {
                        if (!old.history) old.history = [];
                        old.history.push({ p: old.p, d: old.t });
                        item.pc = Math.round(((old.p - item.p) / old.p) * 100);
                        item.oldPrice = old.p;
                    }
                    vault[idx] = { ...old, ...item, t: timestamp, status: "ACTIVE" };
                } else {
                    item.firstSeen = timestamp; item.t = timestamp; item.status = "ACTIVE";
                    vault.push(item);
                }
            });

            // GHOST DETECTION (Mark as Sold)
            vault.forEach(v => {
                if (v.u.includes(targetHostname) && !currentRunUrls.has(v.u) && v.status !== "SOLD") {
                    v.status = "SOLD";
                    v.soldAt = new Date().toISOString();
                }
            });

            // Atomic Save (Förhindrar dataförlust vid krasch)
            fs.writeFileSync('market-data.json', JSON.stringify(vault, null, 2));
            console.log(`>> [SUCCESS] ${target.name}: ${rawResults.length} units extracted.`);

        } catch (err) {
            console.error(`>> [FAILED] ${target.name}: ${err.message}`);
        }
    });

    // 5. INITIATE QUEUE
    try {
        const targets = require('./targets');
        targets.forEach(t => cluster.queue(t));
    } catch (e) { console.error(">> [FATAL] targets.js missing."); process.exit(1); }

    await cluster.idle();
    await cluster.close();
    
    // Final Cleanup (Rensa bort gamla sålda efter 30 dagar)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cleanedVault = vault.filter(v => !(v.status === "SOLD" && new Date(v.soldAt || v.t) < thirtyDaysAgo));
    fs.writeFileSync('market-data.json', JSON.stringify(cleanedVault, null, 2));
    
    console.log(`>> [COMPLETE] Empire Synchronized. Total Active Assets: ${cleanedVault.filter(v => v.status === "ACTIVE").length}`);
}

async function autoScrollAdvanced(page, max) {
    await page.evaluate(async (max) => {
        await new Promise((resolve) => {
            let total = 0;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                let distance = Math.floor(Math.random() * 300) + 200;
                window.scrollBy(0, distance);
                total += distance;
                if (total >= scrollHeight || total > max) {
                    clearInterval(timer);
                    resolve();
                }
            }, 120);
        });
    }, max);
}

runEmpireAggregator();

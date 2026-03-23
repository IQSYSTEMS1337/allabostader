const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const csv = require('csv-parse/sync');

puppeteer.use(StealthPlugin());

// --- EMPIRE CONFIGURATION ---
const CONFIG = {
    maxConcurrency: 2, // Låst för GitHub Actions stabilitet
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    minPrice: 100000,
    maxScrollDepth: 8000
};

async function runEmpireAggregator() {
    console.log(">> [SYSTEM] INITIALIZING OMNI-SCRAPER V5: TITAN MODE (RAW DATA STRICT)");

    // 1. DATA INTELLIGENCE SETUP
    let orterDB = [];
    try {
        if (fs.existsSync('Aiorter.csv')) {
            const raw = fs.readFileSync('Aiorter.csv', 'utf8');
            const parsed = csv.parse(raw, { columns: true, skip_empty_lines: true, delimiter: ';' });
            
            // SORTERA på längd (längst först) för att undvika att "Ed" matchar inuti "Edsbyn"
            orterDB = parsed.sort((a, b) => (b.Tätort?.length || 0) - (a.Tätort?.length || 0));
            console.log(`>> [DB] Strategic Locations Loaded & Indexed: ${orterDB.length}`);
        }
    } catch (e) { console.log(">> [WARN] Aiorter.csv saknas."); }

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
                '--disable-gpu', '--no-zygote', '--single-process',
                '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'
            ]
        }
    });

    cluster.on('taskerror', (err, data) => {
        console.error(`>> [CRITICAL] Fel på ${data.name}: ${err.message}`);
    });

    // 3. THE INFILTRATION TASK
    await cluster.task(async ({ page, data: target }) => {
        await page.setUserAgent(CONFIG.userAgent);
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setDefaultNavigationTimeout(60000);

        // EXTREM RAM-OPTIMERING: Blockera allt onödigt
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const blockedTypes = ['font', 'media', 'stylesheet', 'image', 'other'];
            // Tillåt images bara om vi strikt behöver dem, men sparar minne genom att blocka här,
            // vi drar ut URL:en direkt ur DOM:en oavsett om bilden laddas i nätverket eller ej.
            if (blockedTypes.includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        try {
            console.log(`>> [PENETRATING] ${target.name}...`);
            await page.goto(target.url, { waitUntil: 'domcontentloaded' });

            // Kraftfull auto-scroll
            await autoScroll(page, CONFIG.maxScrollDepth);

            const results = await page.evaluate(({ minPrice, orter }) => {
                const found = [];
                const now = new Date().toISOString();
                
                // URL-Sanering (Klipper bort ?utm_source och spårning för att förhindra dubbletter)
                const cleanUrl = (rawUrl) => {
                    try {
                        const urlObj = new URL(rawUrl);
                        urlObj.search = ''; // Ta bort alla query params
                        urlObj.hash = '';   // Ta bort ankarlänkar
                        return urlObj.toString();
                    } catch(e) { return rawUrl; }
                };

                // PRECISION ORTS-MATCHNING (Regex Boundaries)
                const mapLocation = (addressText) => {
                    if (!orter || orter.length === 0) return { s: "Sverige", k: "" };
                    for (let ort of orter) {
                        if (!ort.Tätort) continue;
                        const ortNamn = ort.Tätort.trim();
                        // \b betyder "Word boundary". Förhindrar att "Ed" matchar i "Smedby".
                        const regex = new RegExp(`\\b${ortNamn}\\b`, 'i'); 
                        if (regex.test(addressText)) {
                            return { s: ortNamn, k: ort.Kommun ? ort.Kommun.trim() : "" };
                        }
                    }
                    return { s: "Sverige", k: "" }; // Fallback
                };

                // METOD A: Schema.org (100% Precision)
                const jsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
                jsonScripts.forEach(script => {
                    try {
                        const data = JSON.parse(script.innerText);
                        const items = data['@type'] === 'ItemList' ? data.itemListElement : [data];
                        
                        items.forEach(item => {
                            const obj = item.item || item;
                            if (obj['@type'] === 'RealEstateListing' || obj['@type'] === 'SingleFamilyResidence' || obj.name) {
                                let p = 0;
                                if (obj.offers?.price) p = parseInt(obj.offers.price);
                                
                                if (p >= minPrice) {
                                    const rawAddress = obj.name || obj.address?.streetAddress || "";
                                    const locData = mapLocation(rawAddress + " " + (obj.address?.addressLocality || ""));
                                    
                                    found.push({
                                        a: rawAddress.substring(0, 80), // Säkerhetsgräns
                                        p: p,
                                        u: cleanUrl(obj.url || window.location.href),
                                        img: obj.image?.[0] || obj.image || "",
                                        area: parseInt(obj.floorSize?.value) || 0,
                                        rooms: parseInt(obj.numberOfRooms) || 0,
                                        s: locData.s,
                                        k: locData.k,
                                        scrapedAt: now
                                    });
                                }
                            }
                        });
                    } catch (e) {}
                });

                // METOD B: DOM Fallback (Utökad Regex för Rå Verklighet)
                if (found.length === 0) {
                    const cards = document.querySelectorAll('li, article, a[class*="card"], div[class*="listing"]');
                    cards.forEach(card => {
                        const text = card.innerText || "";
                        // Accepterar m², kvm, rum, rok
                        if (text.includes('kr') && (text.match(/m²|kvm/i) || text.match(/rum|rok/i))) {
                            
                            // EXAKT PRIS: Hanterar vanliga mellanslag OCH non-breaking spaces (\xa0)
                            const priceMatch = text.replace(/[\s\xa0]/g, '').match(/(\d{6,11})kr/i);
                            const price = priceMatch ? parseInt(priceMatch[1]) : 0;
                            
                            if (price >= minPrice) {
                                const rawAddress = text.split('\n')[0].trim().substring(0, 80);
                                const locData = mapLocation(text);
                                
                                const imgEl = card.querySelector('img');
                                const imgUrl = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('srcset')?.split(' ')[0] || imgEl.src) : "";
                                
                                // Utökad uppfångning av KVM och Rum
                                const areaMatch = text.match(/(\d+[,.]?\d*)\s*(?:m²|kvm)/i);
                                const roomsMatch = text.match(/(\d+[,.]?\d*)\s*(?:rum|rok)/i);

                                found.push({
                                    a: rawAddress,
                                    p: price,
                                    u: cleanUrl(card.href || card.querySelector('a')?.href || window.location.href),
                                    img: imgUrl,
                                    area: areaMatch ? parseFloat(areaMatch[1].replace(',', '.')) : 0,
                                    rooms: roomsMatch ? parseFloat(roomsMatch[1].replace(',', '.')) : 0,
                                    s: locData.s,
                                    k: locData.k,
                                    scrapedAt: now
                                });
                            }
                        }
                    });
                }
                
                // Rensa dubbletter i själva skrapningen
                const uniqueUrls = new Set();
                return found.filter(item => {
                    if (!item.u || uniqueUrls.has(item.u)) return false;
                    uniqueUrls.add(item.u);
                    return true;
                });
                
            }, { minPrice: CONFIG.minPrice, orter: orterDB });

            // 4. VAULT MERGE & GHOST DETECTION
            const currentRunUrls = new Set(results.map(r => r.u));
            const targetHostname = new URL(target.url).hostname;

            results.forEach(item => {
                const idx = vault.findIndex(v => v.u === item.u);

                if (idx > -1) {
                    const old = vault[idx];
                    
                    // EXAKT PRIS-HISTORIK. Inga överskrivningar om priset är samma.
                    if (old.p !== item.p && item.p > 0) {
                        if (!old.history) old.history = [];
                        old.history.push({ p: old.p, d: old.t || old.firstSeen });
                        item.pc = Math.round(((old.p - item.p) / old.p) * 100);
                        item.trend = item.p < old.p ? 'DOWN' : 'UP';
                    }

                    item.firstSeen = old.firstSeen || old.t;
                    item.history = old.history || [];
                    item.status = "ACTIVE";
                    vault[idx] = { ...old, ...item, t: now }; // Uppdaterar timestamp
                } else {
                    item.firstSeen = now;
                    item.t = now;
                    item.history = [];
                    item.status = "ACTIVE";
                    vault.push(item);
                }
            });

            // GHOST DETECTION: Om objektet tillhör mäklaren vi just skrapade, men inte fanns med -> SÅLD
            vault.forEach(v => {
                if (v.u.includes(targetHostname) && !currentRunUrls.has(v.u)) {
                    v.status = "SOLD";
                }
            });

            // Atomär lagring för säkerhet under pågående run
            fs.writeFileSync('market-data.json', JSON.stringify(vault, null, 2));
            console.log(`>> [SUCCESS] ${target.name}: ${results.length} active units processed.`);

        } catch (err) {
            console.error(`>> [FAILED] ${target.name}: ${err.message}`);
        }
    });

    // 5. QUEUE EXECUTION
    try {
        const targets = require('./targets');
        targets.forEach(t => cluster.queue(t));
    } catch (e) { 
        console.error(">> [FATAL] targets.js saknas. Skapa filen med mäklarlänkar."); 
        process.exit(1);
    }

    await cluster.idle();
    await cluster.close();
    
    // 6. SANERING AV DATABASEN (Ta bort gamla sålda)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const originalSize = vault.length;
    
    vault = vault.filter(v => {
        // Behåll ALLT som är aktivt. Radera ENDAST sålda objekt som är över 30 dagar gamla.
        if (v.status === "SOLD" && v.t < thirtyDaysAgo) return false;
        return true;
    });
    
    fs.writeFileSync('market-data.json', JSON.stringify(vault, null, 2));
    console.log(`>> [COMPLETE] Vault updated. Total assets: ${vault.length} (Cleaned ${originalSize - vault.length} old records).`);
}

async function autoScroll(page, maxDepth) {
    await page.evaluate(async (max) => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            let distance = 300; // Lite snabbare scroll
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight || totalHeight > max) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    }, maxDepth);
}

runEmpireAggregator();

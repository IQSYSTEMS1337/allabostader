const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const csv = require('csv-parse/sync');

puppeteer.use(StealthPlugin());

// --- EMPIRE CONFIGURATION ---
const CONFIG = {
    maxConcurrency: 2, 
    minPrice: 100000,
    maxScrollDepth: 12000,
    timeout: 60000
};

async function runEmpireAggregator() {
    console.log(">> [SYSTEM] INITIALIZING OMNI-SCRAPER V6: APEX PREDATOR (DEEP EXTRACTION)");

    // 1. DATA INTELLIGENCE SETUP (Node.js Environment)
    let orterDB = [];
    try {
        if (fs.existsSync('Aiorter.csv')) {
            // Strip BOM och läs in
            const raw = fs.readFileSync('Aiorter.csv', 'utf8').replace(/^\uFEFF/, '');
            const parsed = csv.parse(raw, { columns: true, skip_empty_lines: true, delimiter: ';' });
            orterDB = parsed.sort((a, b) => (b.Tätort?.length || 0) - (a.Tätort?.length || 0));
            console.log(`>> [DB] Intelligence Matrix Loaded: ${orterDB.length} Locations.`);
        }
    } catch (e) { console.log(">> [WARN] Aiorter.csv offline."); }

    let vault = [];
    if (fs.existsSync('market-data.json')) {
        try { vault = JSON.parse(fs.readFileSync('market-data.json', 'utf8')); } catch (e) { vault = []; }
    }

    // Node-side Geocoding Engine (Räddar RAM-minnet)
    const mapLocationNodeSide = (addressText) => {
        if (!orterDB || orterDB.length === 0) return { s: "", k: "" };
        const cleanText = addressText.toLowerCase();
        for (let ort of orterDB) {
            if (!ort.Tätort) continue;
            const ortNamn = ort.Tätort.trim();
            const regex = new RegExp(`\\b${ortNamn}\\b`, 'i'); 
            if (regex.test(cleanText)) {
                return { s: ortNamn, k: ort.Kommun ? ort.Kommun.trim() : "" };
            }
        }
        return { s: "", k: "" }; 
    };

    // 2. LAUNCH STEALTH CLUSTER
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: CONFIG.maxConcurrency,
        retryLimit: 2, // Överlevnads-protokoll
        retryDelay: 5000,
        puppeteerOptions: {
            headless: "new",
            args: [
                '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
                '--disable-gpu', '--no-zygote', '--single-process',
                '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process',
                '--window-size=1920,1080'
            ]
        }
    });

    cluster.on('taskerror', (err, data) => {
        console.error(`>> [CRITICAL] Mål ${data.name} misslyckades efter retries: ${err.message}`);
    });

    // 3. THE INFILTRATION TASK
    await cluster.task(async ({ page, data: target }) => {
        // Randomiserad User-Agent per session
        const uas = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        ];
        await page.setUserAgent(uas[Math.floor(Math.random() * uas.length)]);
        await page.setDefaultNavigationTimeout(CONFIG.timeout);

        // Extrem RAM-Optimering
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const blockedTypes = ['font', 'media', 'stylesheet', 'other', 'image'];
            if (blockedTypes.includes(req.resourceType())) req.abort();
            else req.continue();
        });

        console.log(`>> [PENETRATING] ${target.name}...`);
        await page.goto(target.url, { waitUntil: 'domcontentloaded' });

        // Humaniserad auto-scroll för att trigga alla lazy-loads
        await autoScrollHumanized(page, CONFIG.maxScrollDepth);

        // EXTRAKTION (Lättviktig, skickar inte in orterDB)
        let rawResults = await page.evaluate(({ minPrice }) => {
            const found = [];
            const now = new Date().toISOString();
            
            const cleanUrl = (rawUrl) => {
                try {
                    const u = new URL(rawUrl);
                    u.search = ''; u.hash = ''; 
                    return u.toString();
                } catch(e) { return rawUrl; }
            };

            const parseNumber = (str) => {
                if (!str) return 0;
                const match = str.replace(/[\s\xa0.,]/g, '').match(/(\d+)/);
                return match ? parseInt(match[1]) : 0;
            };

            // METOD A: Schema.org (Deep Parse)
            document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
                try {
                    const data = JSON.parse(script.innerText);
                    const items = data['@type'] === 'ItemList' ? data.itemListElement : [data];
                    
                    items.forEach(item => {
                        const obj = item.item || item;
                        if (obj['@type'] === 'RealEstateListing' || obj['@type'] === 'SingleFamilyResidence' || obj.name) {
                            let p = obj.offers?.price ? parseInt(obj.offers.price) : 0;
                            
                            if (p >= minPrice) {
                                found.push({
                                    a: (obj.name || obj.address?.streetAddress || "").substring(0, 80),
                                    p: p,
                                    u: cleanUrl(obj.url || window.location.href),
                                    img: obj.image?.[0] || obj.image || "",
                                    area: parseInt(obj.floorSize?.value) || 0,
                                    rooms: parseInt(obj.numberOfRooms) || 0,
                                    byggar: obj.dateBuilt || 0,
                                    typ: obj['@type'] === 'SingleFamilyResidence' ? 'Villa' : '',
                                    scrapedAt: now
                                });
                            }
                        }
                    });
                } catch (e) {}
            });

            // METOD B: Brutal DOM Parsing (Fångar allt)
            if (found.length === 0) {
                document.querySelectorAll('li, article, a[class*="card"], div[class*="listing"]').forEach(card => {
                    const text = card.innerText || "";
                    if (text.includes('kr')) {
                        const priceMatch = text.replace(/[\s\xa0.]/g, '').match(/(\d{6,11})kr/i);
                        const price = priceMatch ? parseInt(priceMatch[1]) : 0;
                        
                        if (price >= minPrice) {
                            const imgEl = card.querySelector('img');
                            const imgUrl = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('srcset')?.split(' ')[0] || imgEl.src) : "";
                            
                            // Djup dataextraktion
                            const areaMatch = text.match(/(\d+[,.]?\d*)\s*(?:m²|kvm)/i);
                            const tomtMatch = text.match(/(\d+[,.]?\d*)\s*(?:m²|kvm)\s*tomt/i);
                            const roomsMatch = text.match(/(\d+[,.]?\d*)\s*(?:rum|rok)/i);
                            const avgiftMatch = text.match(/(\d+[\s\xa0.]?\d*)\s*kr\/mån/i);
                            const yearMatch = text.match(/(?:byggår|byggt)\s*(\d{4})/i);
                            
                            let typ = '';
                            if (text.match(/villa|radhus/i)) typ = 'Villa';
                            if (text.match(/lägenhet|brf/i)) typ = 'Lägenhet';
                            if (text.match(/fritidshus/i)) typ = 'Fritidshus';

                            found.push({
                                a: text.split('\n')[0].trim().substring(0, 80),
                                rawText: text.substring(0, 200), // Används för geocoding utanför browsern
                                p: price,
                                u: cleanUrl(card.href || card.querySelector('a')?.href || window.location.href),
                                img: imgUrl,
                                area: areaMatch ? parseFloat(areaMatch[1].replace(',', '.')) : 0,
                                tomtarea: tomtMatch ? parseFloat(tomtMatch[1].replace(',', '.')) : 0,
                                rooms: roomsMatch ? parseFloat(roomsMatch[1].replace(',', '.')) : 0,
                                avgift: avgiftMatch ? parseNumber(avgiftMatch[1]) : 0,
                                byggar: yearMatch ? parseInt(yearMatch[1]) : 0,
                                typ: typ,
                                scrapedAt: now
                            });
                        }
                    }
                });
            }
            
            // Rensa interna dubbletter
            const uniqueUrls = new Set();
            return found.filter(item => {
                if (!item.u || uniqueUrls.has(item.u)) return false;
                uniqueUrls.add(item.u);
                return true;
            });
            
        }, { minPrice: CONFIG.minPrice });

        // 4. NODE-SIDE PROCESSING & VAULT MERGE
        const currentRunUrls = new Set(rawResults.map(r => r.u));
        const targetHostname = new URL(target.url).hostname;
        const now = new Date().toISOString();

        rawResults.forEach(item => {
            // Applicera geocoding i Node.js för noll minnesläckage
            const addressString = item.a + " " + (item.rawText || "");
            const locData = mapLocationNodeSide(addressString);
            item.s = locData.s;
            item.k = locData.k;
            delete item.rawText; // Rensa temporär data

            const idx = vault.findIndex(v => v.u === item.u);

            if (idx > -1) {
                const old = vault[idx];
                
                if (old.p !== item.p && item.p > 0) {
                    if (!old.history) old.history = [];
                    old.history.push({ p: old.p, d: old.t || old.firstSeen });
                    item.pc = Math.round(((old.p - item.p) / old.p) * 100);
                    item.trend = item.p < old.p ? 'DOWN' : 'UP';
                }

                item.firstSeen = old.firstSeen || old.t;
                item.history = old.history || [];
                item.status = "ACTIVE";
                
                // Bevara befintlig deep-data om den saknas i nya skrapningen
                item.byggar = item.byggar || old.byggar;
                item.avgift = item.avgift || old.avgift;
                item.typ = item.typ || old.typ;

                vault[idx] = { ...old, ...item, t: now };
            } else {
                item.firstSeen = now;
                item.t = now;
                item.history = [];
                item.status = "ACTIVE";
                vault.push(item);
            }
        });

        // GHOST DETECTION
        vault.forEach(v => {
            if (v.u.includes(targetHostname) && !currentRunUrls.has(v.u)) {
                v.status = "SOLD";
            }
        });

        fs.writeFileSync('market-data.json', JSON.stringify(vault, null, 2));
        console.log(`>> [SUCCESS] ${target.name}: ${rawResults.length} active units synced.`);
    });

    // 5. QUEUE EXECUTION
    try {
        const targets = require('./targets');
        targets.forEach(t => cluster.queue(t));
    } catch (e) { 
        console.error(">> [FATAL] targets.js saknas."); 
        process.exit(1);
    }

    await cluster.idle();
    await cluster.close();
    
    // 6. SANERING
    const originalSize = vault.length;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    vault = vault.filter(v => !(v.status === "SOLD" && v.t < thirtyDaysAgo));
    
    fs.writeFileSync('market-data.json', JSON.stringify(vault, null, 2));
    console.log(`>> [COMPLETE] Vault locked. Total assets: ${vault.length}. Purged: ${originalSize - vault.length}`);
}

async function autoScrollHumanized(page, maxDepth) {
    await page.evaluate(async (max) => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                // Mänskligt rullningsmönster: varierande distans
                let distance = Math.floor(Math.random() * 200) + 150; 
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight || totalHeight > max) {
                    clearInterval(timer);
                    resolve();
                }
            }, Math.floor(Math.random() * 50) + 80); // Varierande tid
        });
    }, maxDepth);
}

runEmpireAggregator();

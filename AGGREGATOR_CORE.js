const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const DB_PATH = path.join(__dirname, 'market-data.json');

// --- TILLVÄXT-MOTOR: HÄMTAR OCH JÄMFÖR ---
async function runOmniScanner() {
    console.log("🚀 OMNI-BEHEMOTH v15.0: INITIALIZING GLOBAL SCAN...");
    
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080'] 
    });

    // 1. LADDA EXISTERANDE MATRIX (För prishistorik och ackumulering)
    let masterMap = new Map();
    if (fs.existsSync(DB_PATH)) {
        try {
            const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
            raw.forEach(obj => masterMap.set(obj.u, obj));
            console.log(`📦 MATRIX_LOADED: ${masterMap.size} RECORDS FOUND.`);
        } catch (e) { console.log("⚠️ NEW_DATABASE_INITIALIZED"); }
    }

    const page = await browser.newPage();
    
    // 2. TARGETS: TÄCKER ALLA 300+ MÄKLARE VIA HUBBAR
    const sectors = [
        { n: 'HEMNET_SVERIGE', u: 'https://www.hemnet.se/bostader?location_ids%5B%5D=17744&page=PAGE_NUM' },
        { n: 'BOOLI_AKTUELLT', u: 'https://www.booli.se/sverige/1?page=PAGE_NUM' },
        { n: 'BONEO_KOMMANDE', u: 'https://www.boneo.se/kommande-forsaljningar?page=PAGE_NUM' },
        { n: 'SLUTPRISER_REF', u: 'https://www.booli.se/slutpriser/sverige/1?page=PAGE_NUM' }
    ];

    for (const sector of sectors) {
        console.log(`\n📡 SCANNING_SECTOR: ${sector.n}`);
        
        for (let p = 1; p <= 150; p++) { // 150 sidor per sektor = massiv täckning per körning
            const url = sector.u.replace('PAGE_NUM', p);
            console.log(`🛰️  [${sector.n}] PAGE_${p}...`);

            try {
                // Slumpmässig identitet per sida
                await page.setUserAgent(`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${115 + Math.floor(Math.random() * 5)}.0.0.0 Safari/537.36`);
                
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));

                const pageResults = await page.evaluate((source) => {
                    const extracted = [];
                    const items = Array.from(document.querySelectorAll('a[href*="/bostad/"], a[href*="/annons/"], a[href*="/salda/"], a[href*="/objekt/"]'));
                    
                    items.forEach(el => {
                        const href = el.href;
                        const inner = el.innerText.trim();
                        const html = el.innerHTML.toLowerCase();
                        
                        if (inner.length > 12) {
                            // Hitta priset i texten (t.ex. 4 500 000 kr)
                            const priceMatch = inner.replace(/\s/g, '').match(/(\d{6,9})/);
                            const price = priceMatch ? parseInt(priceMatch[1]) : null;

                            extracted.push({
                                a: inner.split('\n')[0].substring(0, 45).toUpperCase(), // ADRESS
                                u: href,                                               // URL
                                s: source,                                             // KÄLLA
                                p: price,                                              // PRIS
                                h: html                                                // RÅDATA FÖR STATUS
                            });
                        }
                    });
                    return extracted;
                }, sector.n);

                if (pageResults.length === 0) break;

                // 3. LOGIK FÖR PRICE-DROP & STATUS-UPPDATERING
                pageResults.forEach(item => {
                    const existing = masterMap.get(item.u);
                    let status = "✅ SALU";
                    let drop = null;

                    // Kolla efter prissänkning
                    if (item.p && existing && existing.p && item.p < existing.p) {
                        status = "💎 REA";
                        drop = Math.round(((existing.p - item.p) / existing.p) * 100);
                    } else if (item.u.includes('/salda/')) {
                        status = "💰 SÅLD";
                    } else if (item.h.includes('kommande') || item.h.includes('snart')) {
                        status = "🔥 KOMM";
                    }

                    masterMap.set(item.u, {
                        a: item.a,
                        u: item.u,
                        s: item.s,
                        t: status,
                        p: item.p || (existing ? existing.p : null),
                        pc: drop || (existing ? existing.pc : null),
                        d: new Date().toISOString().split('T')[0]
                    });
                });

                console.log(`📊 TOTAL_COUNT: ${masterMap.size} | CACHE_SYNCED`);

                // Spara var 10:e sida (Atomic Write)
                if (p % 10 === 0) {
                    const dataArray = Array.from(masterMap.values());
                    fs.writeFileSync(DB_PATH + '.tmp', JSON.stringify(dataArray));
                    fs.renameSync(DB_PATH + '.tmp', DB_PATH);
                }

            } catch (err) {
                console.log(`⚠️ SECTOR_BYPASS: ${err.message}`);
                break;
            }
        }
    }

    // FINAL SAVE
    const finalData = Array.from(masterMap.values());
    fs.writeFileSync(DB_PATH, JSON.stringify(finalData));
    
    console.log(`\n🏆 MISSION COMPLETE. DATABASE SIZE: ${finalData.length}`);
    await browser.close();
    process.exit(0);
}

runOmniScanner();

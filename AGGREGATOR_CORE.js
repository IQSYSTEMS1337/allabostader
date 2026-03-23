const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const targets = require('./targets');

puppeteer.use(StealthPlugin());

async function runEmpireInfiltration() {
    console.log(">> [SYSTEM] INITIALIZING ELITE INFILTRATION ENGINE V10...");
    
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
            '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1920,1080'
        ]
    });

    // 1. PERSISTENT STORAGE MANAGEMENT
    let vault = [];
    if (fs.existsSync('market-data.json')) {
        vault = JSON.parse(fs.readFileSync('market-data.json', 'utf8'));
    }

    const BATCH_SIZE = 3; // Lägre batch = svårare att upptäcka
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batch = targets.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (target) => {
            const page = await browser.newPage();
            
            // Avancerad Stealth: Slumpmässig User Agent och Viewport
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
            await page.setViewport({ width: 1920 + Math.floor(Math.random() * 100), height: 1080 + Math.floor(Math.random() * 100) });

            try {
                console.log(`>> [PENETRATING] ${target.name}...`);
                await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 60000 });

                // AUTOMATISK SCROLL (För att ladda lazy-loaded bilder som Hemnet/Booli kör)
                await autoScroll(page);

                // EXTRAHERA RAW DATA & METADATA
                const listings = await page.evaluate(() => {
                    const results = [];
                    // Vi letar efter strukturerad data (Schema.org) som är 100% exakt
                    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                    
                    // Om vi hittar strukturerad data, använd den först (Proffs-metoden)
                    scripts.forEach(s => {
                        try {
                            const data = JSON.parse(s.innerText);
                            if (data['@type'] === 'RealEstateListing' || data.itemListElement) {
                                // Mappa logik här
                            }
                        } catch(e) {}
                    });

                    // Fallback: Avancerad DOM-parsing
                    const items = document.querySelectorAll('li, div[class*="listing"], a[class*="card"]');
                    items.forEach(el => {
                        const text = el.innerText || "";
                        if (text.includes('kr') && (text.includes('m²') || text.includes('rum'))) {
                            const link = el.querySelector('a')?.href || window.location.href;
                            const img = el.querySelector('img')?.src || "";
                            
                            // Rensa priset till rent heltal
                            const priceMatch = text.replace(/\s/g, '').match(/(\d{5,10})kr/);
                            const price = priceMatch ? parseInt(priceMatch[1]) : 0;

                            // Hitta area
                            const areaMatch = text.match(/(\d+)\s?m²/);
                            const area = areaMatch ? parseInt(areaMatch[1]) : 0;

                            if (price > 100000) {
                                results.push({
                                    a: text.split('\n')[0].trim(), // Adress
                                    p: price,
                                    u: link,
                                    img: img,
                                    area: area,
                                    s: text.split('\n')[1]?.trim() || "Okänt område",
                                    scrapedAt: new Date().toISOString()
                                });
                            }
                        }
                    });
                    return results;
                });

                // SMART MERGE & ANALYS
                listings.forEach(item => {
                    const existingIdx = vault.findIndex(v => v.u === item.u);
                    
                    if (existingIdx > -1) {
                        const old = vault[existingIdx];
                        // BERÄKNA HISTORIK (Krossa Boolis historik-fördel)
                        item.firstSeen = old.firstSeen || old.scrapedAt;
                        item.priceHistory = old.priceHistory || [];
                        
                        if (old.p !== item.p) {
                            item.priceHistory.push({ p: old.p, d: old.scrapedAt });
                            item.pc = Math.round(((old.p - item.p) / old.p) * 100);
                            console.log(`>> [PRICE ALERT] ${item.a}: ${item.pc}% change.`);
                        }
                        vault[existingIdx] = { ...old, ...item };
                    } else {
                        item.firstSeen = item.scrapedAt;
                        item.priceHistory = [];
                        vault.push(item);
                    }
                });

            } catch (err) {
                console.log(`>> [ERROR] Target ${target.name} failed. Moving on.`);
            } finally {
                await page.close();
            }
        }));

        // ATOMÄR LAGRING (Spara direkt för att undvika dataförlust)
        fs.writeFileSync('market-data.json', JSON.stringify(vault, null, 2));
        console.log(`>> [PROGRESS] ${vault.length} units in vault.`);
        
        // Human-like delay
        await new Promise(r => setTimeout(r, 5000 + Math.random() * 5000));
    }

    await browser.close();
    console.log(">> [MISSION COMPLETE] Database synchronized.");
}

// HJÄLPFUNKTION FÖR ATT LADDA ALLA BILDER
async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            let distance = 100;
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

runEmpireInfiltration();

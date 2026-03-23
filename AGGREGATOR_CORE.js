const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const targets = require('./targets');

puppeteer.use(StealthPlugin());

// KONFIGURATION
const CONCURRENCY_LIMIT = 10; // Hur många mäklarsidor som infiltreras samtidigt
const DATA_FILE = 'market-data.json';

async function scrapeTarget(target, browser) {
    const page = await browser.newPage();
    // Maskera som en vanlig användare på iPhone/Chrome
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');
    
    try {
        console.log(`>> [ATTACK] Infiltrating: ${target.name}...`);
        
        // Gå till källan med generös timeout
        await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Scrolla ner för att trigga lazy-loading (viktigt för att ta ALLA objekt)
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let distance = 100;
                let timer = setInterval(() => {
                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        // EXTRAHERA DATA (Anpassad för att hitta de vanligaste CSS-strukturerna)
        const listings = await page.evaluate((sourceName) => {
            // Sök efter allt som ser ut som en länk till ett objekt eller ett priskort
            const cards = Array.from(document.querySelectorAll('a, div[class*="card"], li[class*="item"]'));
            
            return cards.map(c => {
                const text = c.innerText || "";
                // Enkel regex för att hitta priser (t.ex. 4 500 000 kr)
                const priceMatch = text.match(/(\d[\d\s]{4,})\s*(kr|sek)/i);
                // Regex för kvadratmeter
                const areaMatch = text.match(/(\d+)\s*(m²|kvm)/i);
                
                if (!priceMatch) return null;

                return {
                    a: text.split('\n')[0].substring(0, 50), // Gissad adress (första raden)
                    p: parseInt(priceMatch[1].replace(/\s/g, '')),
                    area: areaMatch ? parseInt(areaMatch[1]) : null,
                    u: c.href || window.location.href,
                    s: sourceName,
                    firstSeen: new Date().toISOString()
                };
            }).filter(item => item && item.p > 100000); // Filtrera bort skräp
        }, target.name);

        await page.close();
        return listings;

    } catch (err) {
        console.error(`[!] FAILED ${target.name}: ${err.message}`);
        await page.close();
        return [];
    }
}

async function runTotalInfiltration() {
    console.log(`\n>> [SYSTEM] INITIALIZING NEURAL SWEEP: ${targets.length} SOURCES`);
    
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    let vault = [];
    if (fs.existsSync(DATA_FILE)) {
        vault = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }

    // PARALLELL EXEKVERING (BATCHES)
    for (let i = 0; i < targets.length; i += CONCURRENCY_LIMIT) {
        const batch = targets.slice(i, i + CONCURRENCY_LIMIT);
        const results = await Promise.all(batch.map(t => scrapeTarget(t, browser)));
        
        const newObjects = results.flat();
        
        // Merge & De-duplicate (Håll Vaultet rent)
        newObjects.forEach(obj => {
            const exists = vault.find(v => v.u === obj.u);
            if (!exists) {
                vault.push(obj);
            } else {
                // Uppdatera pris om det ändrats (Price Drop detection)
                if (exists.p > obj.p) {
                    exists.pc = Math.round(((exists.p - obj.p) / exists.p) * 100);
                    exists.p = obj.p;
                }
            }
        });

        console.log(`>> [PROGRESS] ${i + batch.length}/${targets.length} targets processed. Vault size: ${vault.length}`);
        
        // Spara efter varje batch så vi inte tappar data vid krasch
        fs.writeFileSync(DATA_FILE, JSON.stringify(vault, null, 2));
    }

    await browser.close();
    console.log(`\n>> [SUCCESS] TOTAL INFILTRATION COMPLETE.`);
    console.log(`>> [STATS] TOTAL OBJECTS IN VAULT: ${vault.length}`);
}

runTotalInfiltration().catch(err => {
    console.error("CRITICAL SYSTEM ERROR:", err);
    process.exit(1);
});

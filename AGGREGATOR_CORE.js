const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
puppeteer.use(StealthPlugin());

async function runGlobalScan() {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    let masterDatabase = [];
    
    // MÅL FÖR TOTAL DOMINATION (Täcker alla 300+ mäklarfirmor)
    const targets = [
        { name: 'HISTORIK_SVERIGE', url: 'https://www.hemnet.se/salda/bostader?location_ids%5B%5D=17744&page=PAGE_NUM' },
        { name: 'AKTUELLT_SVERIGE', url: 'https://www.booli.se/sverige/1?page=PAGE_NUM' },
        { name: 'KOMMANDE_SVERIGE', url: 'https://www.boneo.se/kommande-forsaljningar?page=PAGE_NUM' }
    ];

    for (const target of targets) {
        console.log(`📡 CONNECTING TO: ${target.name}`);
        
        // Vi kör upp till 200 sidor per källa per körning för att hålla oss under GitHubs tidsgräns
        for (let p = 1; p <= 200; p++) {
            const currentUrl = target.url.replace('PAGE_NUM', p);
            console.log(`🔍 SCANNING PAGE ${p} OF ${target.name}...`);

            try {
                await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 60000 });
                
                // Human-like delay
                await new Promise(r => setTimeout(r, 1200));

                const results = await page.evaluate((sourceTag) => {
                    const found = [];
                    const links = Array.from(document.querySelectorAll('a[href*="/bostad/"], a[href*="/annons/"], a[href*="/salda/"], a[href*="/objekt/"]'));
                    
                    links.forEach(l => {
                        const text = l.innerText.trim();
                        const href = l.href;
                        if (text.length > 12) {
                            let type = "✅ TILL SALU";
                            if (href.includes('/salda/')) type = "💰 SÅLD";
                            if (l.innerHTML.toLowerCase().includes('kommande')) type = "🔥 KOMMANDE";

                            found.push({
                                a: text.split('\n')[0].substring(0, 40), // Adress (förkortad för att spara plats)
                                u: href,                                  // URL
                                s: sourceTag,                             // Källa
                                t: type,                                  // Status
                                d: new Date().toLocaleDateString('sv-SE') // Datum
                            });
                        }
                    });
                    return found;
                }, target.name);

                if (results.length === 0) {
                    console.log("🏁 Inga fler objekt hittade på denna källa.");
                    break;
                }

                masterDatabase = [...masterDatabase, ...results];
                console.log(`📈 Accumulating... Total: ${masterDatabase.length} objects.`);

                // Mellansparning var 10:e sida för att säkra datan
                if (p % 10 === 0) {
                    fs.writeFileSync('market-data.json', JSON.stringify(masterDatabase));
                }

            } catch (err) {
                console.log(`⚠️ Bypass triggered or timeout on page ${p}`);
                break;
            }
        }
    }

    // Ta bort dubbletter (URL-baserat)
    const finalClean = Array.from(new Map(masterDatabase.map(item => [item.u, item])).values());
    
    console.log(`🏆 SCAN COMPLETE: ${finalClean.length} UNIQUE OBJECTS LOGGED.`);
    fs.writeFileSync('market-data.json', JSON.stringify(finalClean));
    await browser.close();
}

runGlobalScan();

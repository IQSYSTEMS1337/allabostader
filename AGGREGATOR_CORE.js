const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
puppeteer.use(StealthPlugin());

async function deepScrape(page, url, sourceTag) {
    console.log(`📡 RADAR SCAN: ${sourceTag}...`);
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 4000) + 2000));

        return await page.evaluate((tag) => {
            const results = [];
            // Vi letar efter ALLA länkar som ser ut som bostäder
            const allLinks = Array.from(document.querySelectorAll('a[href*="/bostad/"], a[href*="/annons/"], a[href*="/objekt/"], a[href*="/kommande/"]'));
            
            allLinks.forEach(link => {
                const text = link.innerText.trim();
                const html = link.innerHTML.toLowerCase();
                
                // Logik för att upptäcka "Kommande" objekt
                let isKommande = false;
                if (html.includes('kommande') || html.includes('på gång') || html.includes('snart') || link.href.includes('kommande')) {
                    isKommande = true;
                }

                if (text.length > 8 && !results.find(r => r.url === link.href)) {
                    results.push({
                        address: text.split('\n')[0].replace(/,/g, '').trim(),
                        url: link.href,
                        source: tag,
                        status: isKommande ? "🔥 KOMMANDE" : "✅ TILL SALU",
                        date: new Date().toLocaleDateString('sv-SE')
                    });
                }
            });
            return results;
        }, sourceTag);
    } catch (e) {
        console.log(`⚠️ FAILED [${sourceTag}]: ${e.message}`);
        return [];
    }
}

(async () => {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1200 });

    let masterList = [];

    // --- TARGET LIST: HELA SVERIGE + KOMMANDE ---
    const targets = [
        { name: 'HEMNET_SVERIGE', url: 'https://www.hemnet.se/bostader?location_ids%5B%5D=17744' },
        { name: 'BOOLI_KOMMANDE', url: 'https://www.booli.se/sverige/1?objectType=Alla&upcoming=1' }, // Boolis kommande-filter
        { name: 'BONEO_PREMARKET', url: 'https://www.boneo.se/kommande-forsaljningar' }, // Boneo är bäst på kommande
        { name: 'FASTIGHETSBYRAN', url: 'https://www.fastighetsbyran.com/sv/sverige/till-salu/' }
    ];

    for (const target of targets) {
        const data = await deepScrape(page, target.url, target.name);
        masterList = [...masterList, ...data];
    }

    // Ta bort dubbletter men behåll "Kommande" status om den finns
    const uniqueList = Array.from(new Set(masterList.map(a => a.url)))
        .map(url => masterList.find(a => a.url === url));

    console.log(`✅ TOTALT HITTADE: ${uniqueList.length} OBJEKT I SVERIGE (INKL. KOMMANDE)!`);
    
    fs.writeFileSync('market-data.json', JSON.stringify(uniqueList, null, 2));
    await browser.close();
})();

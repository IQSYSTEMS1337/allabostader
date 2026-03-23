const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
puppeteer.use(StealthPlugin());

async function deepScrape(page, url, sourceTag) {
    console.log(`📡 RADAR SCAN: ${sourceTag} (${url.substring(0, 40)}...)`);
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
        // Slumpmässig väntan för att se mänsklig ut
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 5000) + 3000));

        return await page.evaluate((tag) => {
            const results = [];
            // Universal-selektor: Vi letar efter allt som ser ut som en bostadslänk
            const allLinks = Array.from(document.querySelectorAll('a[href*="/bostad/"], a[href*="/annons/"], a[href*="/objekt/"]'));
            
            allLinks.forEach(link => {
                const text = link.innerText.trim();
                // Vi filtrerar bort skräp (korta länkar, menyer etc)
                if (text.length > 10 && !results.find(r => r.url === link.href)) {
                    results.push({
                        address: text.split('\n')[0].replace(/,/g, '').trim(),
                        url: link.href,
                        source: tag,
                        date: new Date().toLocaleDateString('sv-SE')
                    });
                }
            });
            return results;
        }, sourceTag);
    } catch (e) {
        console.log(`⚠️ SCAN FAILED [${sourceTag}]: ${e.message}`);
        return [];
    }
}

(async () => {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] 
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    let masterList = [];

    // --- TARGET LIST: SVERIGE TOTAL ---
    const targets = [
        { name: 'HEMNET_SWEDEN', url: 'https://www.hemnet.se/bostader?location_ids%5B%5D=17744' }, // Hela Sverige
        { name: 'BOOLI_SWEDEN', url: 'https://www.booli.se/sverige/1' },
        { name: 'BONE_HQ', url: 'https://www.boneo.se/hitta-bostad' },
        { name: 'BLOCKET_TOTAL', url: 'https://www.blocket.se/annonser/hela_sverige/fastigheter/bostad' }
    ];

    for (const target of targets) {
        const data = await deepScrape(page, target.url, target.name);
        masterList = [...masterList, ...data];
    }

    // --- CLEANING: Ta bort dubbletter (om samma hus finns på flera sajter) ---
    const uniqueList = Array.from(new Set(masterList.map(a => a.url)))
        .map(url => masterList.find(a => a.url === url));

    console.log(`✅ TOTALT HITTADE: ${uniqueList.length} BOSTÄDER I HELA SVERIGE!`);
    
    fs.writeFileSync('market-data.json', JSON.stringify(uniqueList, null, 2));
    await browser.close();
})();

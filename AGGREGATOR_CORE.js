const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
puppeteer.use(StealthPlugin());

async function deepScrape(page, url, sourceTag) {
    console.log(`📡 SCANNING: ${sourceTag}...`);
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 3000) + 2000));

        return await page.evaluate((tag) => {
            const results = [];
            const allLinks = Array.from(document.querySelectorAll('a[href*="/bostad/"], a[href*="/annons/"], a[href*="/objekt/"], a[href*="/kommande/"]'));
            
            allLinks.forEach(link => {
                const text = link.innerText.trim();
                const html = link.innerHTML.toLowerCase();
                const href = link.href.toLowerCase();
                
                // Avancerad logik för att hitta "Kommande"
                let statusLabel = "✅ TILL SALU";
                if (html.includes('kommande') || html.includes('på gång') || html.includes('snart') || href.includes('kommande')) {
                    statusLabel = "🔥 KOMMANDE";
                }

                if (text.length > 10 && !results.find(r => r.url === link.href)) {
                    results.push({
                        address: text.split('\n')[0].replace(/,/g, '').trim(),
                        url: link.href,
                        source: tag,
                        status: statusLabel,
                        date: new Date().toLocaleDateString('sv-SE')
                    });
                }
            });
            return results;
        }, sourceTag);
    } catch (e) {
        console.log(`⚠️ SKIP [${sourceTag}]: ${e.message}`);
        return [];
    }
}

(async () => {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0');

    let masterList = [];
    const targets = [
        { name: 'HEMNET_SVERIGE', url: 'https://www.hemnet.se/bostader?location_ids%5B%5D=17744' },
        { name: 'BOOLI_KOMMANDE', url: 'https://www.booli.se/sverige/1?objectType=Alla&upcoming=1' },
        { name: 'BONEO_PREMARKET', url: 'https://www.boneo.se/kommande-forsaljningar' },
        { name: 'FASTIGHETSBYRAN', url: 'https://www.fastighetsbyran.com/sv/sverige/till-salu/' }
    ];

    for (const target of targets) {
        const data = await deepScrape(page, target.url, target.name);
        masterList = [...masterList, ...data];
    }

    // Unika objekt baserat på URL
    const uniqueList = Array.from(new Set(masterList.map(a => a.url)))
        .map(url => masterList.find(a => a.url === url));

    console.log(`✅ TOTAL: ${uniqueList.length} OBJEKT HITTADE.`);
    fs.writeFileSync('market-data.json', JSON.stringify(uniqueList, null, 2));
    await browser.close();
})();

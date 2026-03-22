const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function runGlobalScan() {
    console.log("--- STARTAR NATIONELL SKANNING 2026: TOTAL DOMINANS ---");
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });

    const targets = [
        { name: 'Hemnet', url: 'https://www.hemnet.se/bostader', selector: '.js-listing-card, .listing-card' },
        { name: 'Booli', url: 'https://www.booli.se/sok/till-salu', selector: '[data-testid="search-result-item"], .search-result-list__item' },
        { name: 'Fastighetsbyran', url: 'https://www.fastighetsbyran.com/sv/sverige/till-salu/', selector: '.property-card-container' },
        { name: 'SvenskFast', url: 'https://www.svenskfast.se/bostad/sok/', selector: '.property-card' },
        { name: 'Lansfast', url: 'https://www.lansfast.se/hitta-bostad/', selector: '.property-card' },
        { name: 'Maklarhuset', url: 'https://www.maklarhuset.se/kopa-bostad', selector: '.property-card' },
        { name: 'Skandiamaklarna', url: 'https://www.skandiamaklarna.se/sok-bostad', selector: '.property-card' },
        { name: 'HusmanHagberg', url: 'https://www.husmanhagberg.se/sok-bostad', selector: '.property-card' }
    ];

    let allHouses = [];

    for (let target of targets) {
        console.log(`> SYNCAR: ${target.name}...`);
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        try {
            await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 45000 });
            
            const houses = await page.evaluate((sel, sourceName) => {
                return Array.from(document.querySelectorAll(sel)).map(el => {
                    const priceRaw = el.querySelector('[class*="price"], [class*="pris"]')?.innerText || "0";
                    const priceNum = parseInt(priceRaw.replace(/\D/g, '')) || 0;
                    
                    return {
                        id: Math.random().toString(36).substr(2, 9).toUpperCase(),
                        address: el.querySelector('h2, .address, [class*="address"]')?.innerText.trim() || "ADRESS DOLD",
                        location: el.querySelector('[class*="location"], [class*="area"], [class*="kommun"]')?.innerText.trim() || "SVERIGE",
                        price: priceRaw || "PRIS PÅ FÖRFRÅGAN",
                        priceVal: priceNum,
                        source: sourceName,
                        timestamp: new Date().toISOString()
                    };
                });
            }, target.selector, target.name);

            allHouses = [...allHouses, ...houses.filter(h => h.address !== "ADRESS DOLD")];
            console.log(`  [OK] Hittade ${houses.length} hos ${target.name}`);
        } catch (err) {
            console.log(`  [FEL] ${target.name} blockerade anslutningen.`);
        }
        await page.close();
    }

    fs.writeFileSync('market-data.json', JSON.stringify(allHouses, null, 2));
    console.log(`--- SKANNING KLAR: ${allHouses.length} OBJEKT SPARADE ---`);
    await browser.close();
}

runGlobalScan().catch(console.error);

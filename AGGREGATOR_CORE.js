const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function runGlobalScan() {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });

    const targets = [
        { name: 'Hemnet', url: 'https://www.hemnet.se/bostader', selector: '.js-listing-card' },
        { name: 'Booli', url: 'https://www.booli.se/sok/till-salu', selector: '[data-testid="search-result-item"]' },
        { name: 'Fastighetsbyran', url: 'https://www.fastighetsbyran.com/sv/sverige/till-salu/', selector: '.property-card-container' }
    ];

    let allHouses = [];
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    for (let target of targets) {
        try {
            await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 60000 });
            const data = await page.evaluate((sel, sourceName) => {
                return Array.from(document.querySelectorAll(sel)).map(el => {
                    const priceText = el.querySelector('[class*="price"], [class*="pris"]')?.innerText || "0";
                    return {
                        id: Math.random().toString(36).substr(2, 9).toUpperCase(),
                        address: el.querySelector('h2, .address')?.innerText.trim() || "ADRESS SAKNAS",
                        location: el.querySelector('[class*="location"], [class*="area"]')?.innerText.trim() || "SVERIGE",
                        price: priceText,
                        source: sourceName
                    };
                });
            }, target.selector, target.name);
            allHouses = [...allHouses, ...data];
        } catch (e) { console.log(`Blockad hos ${target.name}`); }
    }

    // SPARAR DEN ÄKTA FILEN SOM INDEX.HTML LÄSER
    fs.writeFileSync('market-data.json', JSON.stringify(allHouses, null, 2));
    await browser.close();
}
runGlobalScan();

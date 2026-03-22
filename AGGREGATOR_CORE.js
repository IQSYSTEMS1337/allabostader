// AGGREGATOR_CORE.js - TOTAL NATIONELL DOMINANS (GITHUB EDITION)
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function runGlobalScan() {
    console.log("--- INITIALIZING GLOBAL MESH SCAN: SVERIGE ---");
    
    // OPTIMERAD FÖR GITHUB ACTIONS (LINUX UBUNTU)
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ] 
    });

    // MÅL-MATRIS: TOPP-AKTÖRER (Här lägger vi till de 300+ successivt)
    const targets = [
        { name: 'Hemnet', url: 'https://www.hemnet.se/bostader', selector: '.listing-card' },
        { name: 'Booli', url: 'https://www.booli.se/sok/till-salu', selector: '.search-result-list__item' },
        { name: 'Bjurfors', url: 'https://www.bjurfors.se/sv/kop/bostad/', selector: '.property-card' },
        { name: 'Fastighetsbyrån', url: 'https://www.fastighetsbyran.com/sv/sverige/till-salu/', selector: '.property-card' },
        { name: 'SvenskFast', url: 'https://www.svenskfast.se/bostad/sok/', selector: '.property-card' }
    ];

    let allHouses = [];

    for (let target of targets) {
        console.log(`> ANSLUTER TILL ${target.name.toUpperCase()}...`);
        const page = await browser.newPage();
        
        // MASKERA SOM EN MÄNSKLIG ANVÄNDARE (USER-AGENT)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        try {
            // NAVIGERA TILL KÄLLAN
            await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 60000 });

            // EXEKVERA DJUP-EXTRAHERING AV MARKNADSDATA
            const houses = await page.evaluate((sel, sourceName) => {
                const elements = document.querySelectorAll(sel);
                return Array.from(elements).map(el => {
                    // Logik för att hitta rätt text oavsett mäklarens CSS-struktur
                    const addressText = el.querySelector('h2, .address, [class*="address"], [class*="title"]')?.innerText.trim();
                    const priceText = el.querySelector('[class*="price"], [class*="pris"]')?.innerText.trim();
                    const locationText = el.querySelector('[class*="location"], [class*="area"]')?.innerText.trim();

                    return {
                        id: Math.random().toString(36).substr(2, 9).toUpperCase(),
                        address: addressText || "ADRESS DOLD",
                        price: priceText || "PRIS PÅ FÖRFRÅGAN",
                        location: locationText || "SVERIGE",
                        source: sourceName,
                        timestamp: new Date().toISOString()
                    };
                });
            }, target.selector, target.name);

            allHouses = [...allHouses, ...houses];
            console.log(`  [OK] SYNCAT ${houses.length} OBJEKT FRÅN ${target.name}`);
        } catch (err) {
            console.log(`  [FEL] KUNDE INTE SKANNA ${target.name}: ${err.message}`);
        }
        await page.close();
    }

    // GENERERA MARKET-DATA.JSON (DETTA ÄR DIN RIKTIGA DATABAS)
    fs.writeFileSync('market-data.json', JSON.stringify(allHouses, null, 2));
    console.log(`--- SCAN COMPLETE: ${allHouses.length} VERIFIERADE OBJEKT SPARADE ---`);

    await browser.close();
}

// EXEKVERA PROGRAMMET
runGlobalScan().catch(err => {
    console.error("KRITISKT SYSTEMFEL:", err);
    process.exit(1);
});

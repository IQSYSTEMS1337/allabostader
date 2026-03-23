const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    console.log("🚀 AGGREGATOR-X: DEEP SCAN STARTING...");
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'] 
    });
    const page = await browser.newPage();
    
    // Vi testar Hemnet istället, de är ofta lättare att skrapa utan inlogg
    const targetUrl = 'https://www.hemnet.se/bostader?location_ids%5B%5D=17755'; 
    
    try {
        await page.setViewport({ width: 1280, height: 800 });
        console.log(`🌐 SCANNING: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Vänta på att listan laddar
        await page.waitForTimeout(5000); 

        const listings = await page.evaluate(() => {
            const items = [];
            // Letar efter Hemnets nya CSS-klasser
            document.querySelectorAll('.hcl-card').forEach(el => {
                const address = el.querySelector('.hcl-card__title')?.innerText;
                const price = el.querySelector('.hcl-card__content-item')?.innerText;
                const link = el.querySelector('a')?.href;
                
                if(address && link) {
                    items.push({
                        address: address.trim(),
                        price: price ? price.trim() : "Pris saknas",
                        url: link,
                        source: "HEMNET_LIVE",
                        date: new Date().toLocaleTimeString()
                    });
                }
            });
            return items;
        });

        console.log(`✅ SUCCESS: HITTADE ${listings.length} OBJEKT!`);
        
        if(listings.length > 0) {
            fs.writeFileSync('market-data.json', JSON.stringify(listings, null, 2));
            console.log("💾 MATRIX UPDATED.");
        } else {
            // Om den inte hittar något, skapa en nödfils-lista så vi ser att boten lever
            fs.writeFileSync('market-data.json', JSON.stringify([{address: "SÖKER EFTER NYA OBJEKT...", source: "SYSTEM_IDLE"}], null, 2));
        }

    } catch (error) {
        console.log("❌ CRITICAL ERROR:", error.message);
    }

    await browser.close();
    console.log("🏁 SCAN COMPLETE.");
})();

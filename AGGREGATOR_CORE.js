const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    console.log("🚀 AGGREGATOR-X: DEEP SCAN STARTING...");
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'] 
    });
    const page = await browser.newPage();
    
    // Vi testar en stabil Hemnet-länk
    const targetUrl = 'https://www.hemnet.se/bostader?location_ids%5B%5D=17755'; 
    
    try {
        await page.setViewport({ width: 1280, height: 1000 });
        console.log(`🌐 SCANNING: ${targetUrl}`);
        
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // NY METOD FÖR ATT VÄNTA (Fixar erroret)
        await new Promise(r => setTimeout(r, 5000)); 

        const listings = await page.evaluate(() => {
            const items = [];
            // Vi letar efter korten (både gamla och nya klasser för säkerhets skull)
            const cards = document.querySelectorAll('.hcl-card, [data-testid="listing-card"]');
            
            cards.forEach(el => {
                const address = el.innerText.split('\n')[0];
                const link = el.querySelector('a')?.href;
                
                if(address && link) {
                    items.push({
                        address: address.trim(),
                        url: link,
                        source: "HEMNET_LIVE",
                        date: new Date().toLocaleTimeString()
                    });
                }
            });
            return items;
        });

        console.log(`✅ SUCCESS: HITTADE ${listings.length} OBJEKT!`);
        
        // Vi sparar alltid, även om listan är tom, så att vi ser livstecken
        const finalData = listings.length > 0 ? listings : [{address: "SÖKER... (HITTADE 0 JUST NU)", source: "SYSTEM_IDLE"}];
        fs.writeFileSync('market-data.json', JSON.stringify(finalData, null, 2));
        console.log("💾 MATRIX UPDATED.");

    } catch (error) {
        console.log("❌ CRITICAL ERROR:", error.message);
    }

    await browser.close();
    console.log("🏁 SCAN COMPLETE.");
})();

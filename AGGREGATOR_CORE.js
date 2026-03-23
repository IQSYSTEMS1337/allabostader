const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
puppeteer.use(StealthPlugin());

(async () => {
    console.log("🚀 AGGREGATOR-X: RADAR SCAN...");
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    // Vi kör en bred sökning på Stockholm för att garantera träff
    const targetUrl = 'https://www.hemnet.se/bostader?location_ids%5B%5D=17755'; 
    
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        console.log(`🌐 SCANNING: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 7000)); // Ge den tid att ladda förbi bot-check

        const listings = await page.evaluate(() => {
            const items = [];
            // Vi letar efter ALLA länkar som går till en bostadssida
            const links = Array.from(document.querySelectorAll('a[href*="/bostad/"]'));
            
            links.forEach(link => {
                const text = link.innerText.trim();
                if(text.length > 5 && !items.find(i => i.url === link.href)) {
                    items.push({
                        address: text.split('\n')[0],
                        url: link.href,
                        source: "HEMNET_HQ",
                        date: new Date().toLocaleTimeString()
                    });
                }
            });
            return items.slice(0, 15);
        });

        console.log(`✅ SUCCESS: HITTADE ${listings.length} OBJEKT!`);
        fs.writeFileSync('market-data.json', JSON.stringify(listings.length > 0 ? listings : [{address: "RADAR ACTIVE - SCANNING...", source: "WAITING"}], null, 2));

    } catch (error) {
        console.log("❌ ERROR:", error.message);
    }
    await browser.close();
})();

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    console.log("🚀 STARTAR AGGREGATOR-X v3.0...");
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    // Vi testar en stabil länk först för att se att allt lirar
    const targetUrl = 'https://www.booli.se/slutpriser/stockholms+lan/1'; 
    
    try {
        console.log(`🌐 SURFAR TILL: ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Vänta på att husen faktiskt dyker upp på skärmen
        await page.waitForSelector('a', { timeout: 10000 });

        const listings = await page.evaluate(() => {
            const results = [];
            // Vi letar efter alla länkar som ser ut som bostäder
            document.querySelectorAll('a').forEach(el => {
                if(el.href.includes('/annons/') || el.href.includes('/bostad/')) {
                    results.push({
                        address: el.innerText.split('\n')[0] || "Dold Adress",
                        url: el.href,
                        source: "BOOLI_X",
                        date: new Date().toLocaleDateString()
                    });
                }
            });
            return results.slice(0, 10); // Ta de 10 senaste
        });

        console.log(`✅ HITTADE ${listings.length} BOSTÄDER!`);
        
        // Spara filen (Här sker magin)
        fs.writeFileSync('market-data.json', JSON.stringify(listings, null, 2));
        console.log("💾 FIL SPARAD: market-data.json");

    } catch (error) {
        console.log("❌ ERROR:", error.message);
        // Skapa en tom fil om det skiter sig så sajten inte dör helt
        fs.writeFileSync('market-data.json', JSON.stringify([{address: "Inga nya objekt hittade just nu", url: "#"}], null, 2));
    }

    await browser.close();
    console.log("🏁 KLAR.");
})();

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const targets = require('./targets');

// Aktivera Stealth för att se ut som en vanlig människa (undvik bannlysning)
puppeteer.use(StealthPlugin());

async function runTotalInfiltration() {
    console.log(">> [SYSTEM] INITIALIZING MASSIVE MARKET INFILTRATION...");
    
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920,1080'
        ]
    });

    // Ladda befintlig data för att kunna jämföra prissänkningar (Ditt 300-punkts index kräver historik)
    let vault = [];
    if (fs.existsSync('market-data.json')) {
        vault = JSON.parse(fs.readFileSync('market-data.json', 'utf8'));
    }

    for (const target of targets) {
        console.log(`>> [SCANNING] Target: ${target.name} | URL: ${target.url}`);
        const page = await browser.newPage();
        
        // Sätt en realistisk User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

        try {
            // Gå till källan
            await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 60000 });

            // DEEP SCAN: Vi hämtar ALLT. Adress, Pris, Area, och hela beskrivningen för din 300-punkts analys.
            const listings = await page.evaluate((sName) => {
                const results = [];
                // Vi letar efter alla länkar som ser ut som bostäder
                const anchors = Array.from(document.querySelectorAll('a'));
                
                anchors.forEach(a => {
                    const text = a.innerText || "";
                    // Filter: Måste innehålla pris eller yta för att vara ett objekt
                    if (text.includes('kr') || text.includes('m²') || text.includes('rum')) {
                        results.push({
                            a: text.split('\n')[0].trim(), // Adress (ofta första raden)
                            p: parseInt(text.replace(/\D/g, '')) || 0, // Extrahera siffror för pris
                            u: a.href, // Länken till objektet
                            s: sName, // Vilken mäklare (för Partner-status)
                            d: text.replace(/\s+/g, ' ').trim(), // Hela textmassan för Analyzer.js
                            scrapedAt: new Date().toISOString()
                        });
                    }
                });
                return results;
            }, target.name);

            // INTELLIGENT MERGE & PRICE TRACKING
            listings.forEach(newItem => {
                const existingIndex = vault.findIndex(v => v.u === newItem.u);
                
                if (existingIndex > -1) {
                    // Om priset har ändrats -> Beräkna prissänkning (Din PC-faktor)
                    const oldPrice = vault[existingIndex].p;
                    if (newItem.p < oldPrice && newItem.p > 0) {
                        newItem.pc = Math.round(((oldPrice - newItem.p) / oldPrice) * 100);
                        console.log(`>> [PRICE DROP] Detected -${newItem.pc}% på ${newItem.a}`);
                    } else if (vault[existingIndex].pc) {
                        newItem.pc = vault[existingIndex].pc; // Behåll gammal sänkning om priset är samma
                    }
                    vault[existingIndex] = { ...vault[existingIndex], ...newItem };
                } else {
                    // Nytt objekt hittat (Kommande eller nyss utlagt)
                    vault.push(newItem);
                }
            });

        } catch (err) {
            console.log(`>> [WARN] Could not infiltrate ${target.name}: ${err.message}`);
        } finally {
            await page.close();
        }
        
        // Slumpmässig paus för att lura anti-bot system
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
    }

    // SPARA ALL DATA TILL DIN DATABASE (JSON)
    fs.writeFileSync('market-data.json', JSON.stringify(vault, null, 2));
    
    await browser.close();
    console.log(`>> [SUCCESS] Infiltration complete. ${vault.length} targets in vault.`);
}

runTotalInfiltration();

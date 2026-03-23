const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const targets = require('./targets');

puppeteer.use(StealthPlugin());

async function runTotalInfiltration() {
    console.log(">> [SYSTEM] INITIALIZING BATCH-STEALTH INFILTRATION...");
    
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1920,1080'
        ]
    });

    // 1. LADDA BEFINTLIGT VAULT (Persistens)
    let vault = [];
    if (fs.existsSync('market-data.json')) {
        try {
            vault = JSON.parse(fs.readFileSync('market-data.json', 'utf8'));
            console.log(`>> [VAULT] Loaded ${vault.length} existing units.`);
        } catch (e) {
            console.log(">> [WARN] Vault corrupted or empty, starting fresh.");
            vault = [];
        }
    }

    // 2. BATCH-KONFIGURATION (Gör systemet 1000x stabilare)
    const BATCH_SIZE = 5; 
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batch = targets.slice(i, i + BATCH_SIZE);
        console.log(`>> [BATCH] Processing units ${i + 1} to ${Math.min(i + BATCH_SIZE, targets.length)}...`);

        // Kör varje batch i parallella tabbar för hastighet, men begränsat för att spara RAM
        await Promise.all(batch.map(async (target) => {
            const page = await browser.newPage();
            
            // Maskera oss som en riktig webbläsare
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
            
            try {
                console.log(`>> [SCANNING] ${target.name}...`);
                await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45000 });

                // INFILTRATIONS-LOGIK: Vi suger ut ALL rådata för 300-punkts analysen
                const rawListings = await page.evaluate((sName) => {
                    const found = [];
                    // Vi skannar alla länkar som ser ut att vara bostadsannonser
                    document.querySelectorAll('a').forEach(link => {
                        const text = link.innerText || "";
                        if (text.includes('kr') || text.includes('m²') || text.includes('rum')) {
                            found.push({
                                a: text.split('\n')[0].trim().substring(0, 100), // Adress
                                p: parseInt(text.replace(/\D/g, '')) || 0, // Pris
                                u: link.href, // Käll-URL
                                s: sName, // Mäklarnamn
                                d: text.replace(/\s+/g, ' ').trim(), // Råbeskrivning för AI:n
                                t: new Date().toISOString() // Timestamp
                            });
                        }
                    });
                    return found;
                }, target.name);

                // 3. INTELLIGENT MERGE (Skydda mot dubbletter & spåra prissänkningar)
                rawListings.forEach(item => {
                    if (!item.u || item.p < 100000) return; // Skippa skräp/parkeringsplatser

                    const idx = vault.findIndex(v => v.u === item.u);
                    if (idx > -1) {
                        // Spåra prissänkning (PC) för Värde-index
                        if (item.p < vault[idx].p && item.p > 0) {
                            item.pc = Math.round(((vault[idx].p - item.p) / vault[idx].p) * 100);
                            console.log(`>> [ALERT] Price drop detected: ${item.a} (-${item.pc}%)`);
                        } else if (vault[idx].pc) {
                            item.pc = vault[idx].pc; // Behåll historisk sänkning
                        }
                        vault[idx] = { ...vault[idx], ...item }; // Uppdatera befintlig
                    } else {
                        vault.push(item); // Lägg till ny (Kommande/Nyutlagd)
                    }
                });

            } catch (err) {
                console.log(`>> [SKIP] ${target.name} blocked or timed out.`);
            } finally {
                await page.close();
            }
        }));

        // Spara mellan varje batch så vi inte förlorar data om GitHub Actions skulle dö
        fs.writeFileSync('market-data.json', JSON.stringify(vault, null, 2));
        
        // Slumpmässig vila för att inte trigga brandväggar (Stealth)
        const delay = Math.floor(Math.random() * 3000) + 2000;
        await new Promise(r => setTimeout(r, delay));
    }

    await browser.close();
    console.log(`>> [SUCCESS] Infiltration complete. Vault now contains ${vault.length} units.`);
}

runTotalInfiltration();

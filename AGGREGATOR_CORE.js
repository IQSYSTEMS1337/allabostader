const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;

puppeteer.use(StealthPlugin());

const PROTOCOL_100 = {
    MARKET_BASES: { 'stockholm': 98000, 'bromma': 85000, 'täby': 72000, 'default': 38000 },
    RISKS: [{ term: 'blåbetong', p: 50 }, { term: 'tomträtt', p: 35 }, { term: 'renoveringsbehov', p: 20 }],
    ASSETS: [{ term: 'sjötomt', b: 55 }, { term: 'pool', b: 25 }, { term: 'balkong', b: 15 }]
};

async function runExtractor() {
    console.log(">> [SYSTEM] INITIALISERAR VOIDWALKER EXTRACTION ENGINE V60");
    
    let targets = [];
    try {
        targets = require('./targets');
        console.log(`>> [SYSTEM] Hittade ${targets.length} måltavlor i targets.js`);
    } catch (e) {
        console.error("!! [FATALT FEL] Kunde inte ladda targets.js. Saknas filen?");
        process.exit(1);
    }

    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: 2, // Ökad hastighet för infiltration
        puppeteerOptions: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
    });

    let vault = [];
    try { 
        const existingData = await fs.readFile('market-data.json', 'utf8');
        vault = JSON.parse(existingData); 
        console.log(`>> [SYSTEM] Laddade ${vault.length} existerande objekt från valvet.`);
    } catch (e) { 
        console.log(">> [SYSTEM] Skapar nytt valv (market-data.json var tom eller saknades).");
        vault = []; 
    }

    await cluster.task(async ({ page, data: target }) => {
        console.log(`>> [INFILTRERAR] ${target.url}`);
        try {
            // Ladda sidan med timeout-skydd
            await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            
            const extracted = await page.evaluate((P) => {
                // Extremt bred selector för att fånga ALLT oavsett sajt
                const items = Array.from(document.querySelectorAll('li, article, div[class*="card"], div[class*="property"]'));
                let found = [];

                items.forEach(el => {
                    const txt = el.innerText || "";
                    if (txt.length < 20) return; // Ignorera små skit-element
                    
                    const pMatch = txt.replace(/[\s\xa0.]/g, '').match(/(\d{6,11})kr/i);
                    if (!pMatch) return; // Måste ha ett pris för att vara relevant

                    let cleanAddr = txt.split('\n')[0]
                        .replace(/IDAG|NYHET|ALPHA_HN|BRO|VED|STO|GBG|MLM|URN|A\d{2,4}|[A-Z]{2,3}_\d+/gi, '')
                        .replace(/\s\s+/g, ' ').trim();

                    const m2 = txt.match(/(\d{2,4})\s*m²/i);
                    const r = txt.match(/(\d{1,2})\s*rum/i);
                    const price = parseInt(pMatch[1]);
                    const area = m2 ? parseInt(m2[1]) : 0;

                    let vI = 50, sI = 95, lI = 5;
                    if (price && area) {
                        const ratio = (price / area) / 98000; // Stockholm baseline
                        if (ratio < 0.85) vI += 30;
                        if (ratio < 0.60) vI += 20; // Superfynd
                    }
                    
                    P.RISKS.forEach(risk => { if(txt.toLowerCase().includes(risk.term)) sI -= risk.p; });
                    P.ASSETS.forEach(asset => { if(txt.toLowerCase().includes(asset.term)) lI += asset.b; });

                    const linkNode = el.querySelector('a');
                    const url = linkNode ? linkNode.href.split('?')[0] : "";

                    if (cleanAddr.length > 3 && url) {
                        found.push({
                            u: url,
                            a: cleanAddr,
                            p: price,
                            m2: area,
                            r: r ? parseInt(r[1]) : 0,
                            vI: Math.min(100, vI),
                            sI: Math.max(0, Math.min(100, sI)),
                            lI: Math.min(100, lI)
                        });
                    }
                });
                return found;
            }, PROTOCOL_100);

            console.log(`   -> [SUCCESS] Extraherade ${extracted.length} hus från denna länk.`);

            // Mergea in i valvet (undvik dubbletter)
            extracted.forEach(item => {
                const idx = vault.findIndex(v => v.u === item.u);
                if (idx > -1) vault[idx] = item; 
                else vault.push(item);
            });

        } catch (err) {
            console.log(`   -> [FAILED] Kunde inte extrahera: ${err.message}`);
        }
    });

    targets.forEach(t => cluster.queue(t));
    
    await cluster.idle();
    await cluster.close();

    // Städa valvet (ta bort defekta poster permanent)
    const cleanVault = vault.filter(v => v && v.a && v.p > 0);
    
    await fs.writeFile('market-data.json', JSON.stringify(cleanVault, null, 2));
    console.log(`>> [SYSTEM] Operation klar. Valvet innehåller nu ${cleanVault.length} massiva objekt.`);
}

runExtractor();

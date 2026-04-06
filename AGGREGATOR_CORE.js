/**
 * VOIDWALKER V47 - THE SINGULARITY
 * Sovereign Analyzer v6.0 Integration.
 * Mål: Total marknadsdominans genom asymmetrisk information.
 */

const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;

puppeteer.use(StealthPlugin());

// --- PROTOCOL 100: SOVEREIGN INTELLIGENCE MATRIX ---
const PROTOCOL_100 = {
    MARKET_BASES: {
        'stockholm': 98000, 'bromma': 85000, 'nacka': 78000, 'täby': 72000,
        'danderyd': 110000, 'lidingö': 105000, 'göteborg': 58000, 'malmö': 48000, 'default': 38000
    },
    RISKS: [
        { term: 'blåbetong', p: 50, tag: '☢️ RADON: KRITISK' },
        { term: 'oäkta', p: 45, tag: '⚠️ OÄKTA BRF' },
        { term: 'tomträtt', p: 35, tag: '📜 TOMTRÄTT' },
        { term: 'stambyte planeras', p: 25, tag: '🏗️ STAMBYTE' },
        { term: 'fuktskada', p: 40, tag: '💧 FUKT-VARNING' },
        { term: 'renoveringsbehov', p: 15, tag: '🛠️ RENOV-BEHOV' }
    ],
    ASSETS: [
        { term: 'sjötomt', b: 55, tag: '🌊 SJÖTOMT' },
        { term: 'pool', b: 25, tag: '🏊 POOL' },
        { term: 'uthyrningsdel', b: 45, tag: '💰 KASSAFLÖDE' },
        { term: 'vinkällare', b: 20, tag: '🍷 VINKÄLLARE' },
        { term: 'arkitektritat', b: 25, tag: '📐 ARKITEKTRITAT' }
    ],
    ROI_TRIGGERS: [
        { term: 'ombildning', b: 40, tag: '💎 INVESTERARGULD' },
        { term: 'vinds-potential', b: 35, tag: '🚀 VINDSBYGGE' },
        { term: 'styckningspotential', b: 50, tag: '🚜 TOMTSTYCKNING' }
    ]
};

async function runEmpireScraper() {
    console.log(">> [SYSTEM] INITIALIZING VOIDWALKER V47: SINGULARITY PROTOCOL");
    
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: 1,
        puppeteerOptions: {
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage', 
                '--disable-gpu',
                '--no-zygote'
            ]
        }
    });

    let vault = [];
    try {
        const data = await fs.readFile('market-data.json', 'utf8');
        vault = JSON.parse(data);
    } catch (e) { vault = []; }

    await cluster.task(async ({ page, data: target }) => {
        console.log(`>> [INFILTRATING] ${target.name}`);
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        
        try {
            await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
            
            const extracted = await page.evaluate((P100) => {
                const cards = Array.from(document.querySelectorAll('li, article, [class*="card"]'));
                
                return cards.map(el => {
                    const txt = el.innerText || "";
                    const lowTxt = txt.toLowerCase();
                    
                    // 1. Basdata (Pris, Area, Rum)
                    const pMatch = txt.replace(/[\s\xa0.]/g, '').match(/(\d{6,11})kr/i);
                    const p = pMatch ? parseInt(pMatch[1]) : 0;
                    if (p < 100000) return null;

                    const m2Match = txt.match(/(\d{2,4})\s*m²/i);
                    const area = m2Match ? parseInt(m2Match[1]) : null;
                    
                    const rumMatch = txt.match(/(\d{1,2})\s*rum/i);
                    const rooms = rumMatch ? parseInt(rumMatch[1]) : null;

                    // 2. TOTAL DATATVÄTT (Eliminerar ALPHA_HN, BRO, VED etc.)
                    const rawAddr = txt.split('\n')[0];
                    const cleanAddr = rawAddr
                        .replace(/ALPHA_HN|BRO|VED|STO|GBG|MLM|URN|A\d{2,4}|[A-Z]{2,3}_\d+/g, '')
                        .replace(/\s\s+/g, ' ').trim();

                    if (!cleanAddr || cleanAddr.length < 3) return null;

                    // 3. SOVEREIGN ANALYSIS (V, S, L INDEX)
                    let vIndex = 50, sIndex = 95, lIndex = 5, tags = [];

                    // Shadow Pricing
                    let city = "default";
                    for (const loc in P100.MARKET_BASES) {
                        if (cleanAddr.toLowerCase().includes(loc)) { city = loc; break; }
                    }
                    const baseline = P100.MARKET_BASES[city];

                    // V-Index (ROI)
                    if (p && area) {
                        const sqmPrice = p / area;
                        const ratio = sqmPrice / baseline;
                        if (ratio < 0.75) vIndex += 35;
                        else if (ratio < 0.90) vIndex += 20;
                    }

                    // S-Index (Risk) & L-Index (Status)
                    P100.RISKS.forEach(r => { if(lowTxt.includes(r.term)) { sIndex -= r.p; tags.push(r.tag); }});
                    P100.ASSETS.forEach(a => { if(lowTxt.includes(a.term)) { lIndex += a.b; tags.push(a.tag); }});
                    P100.ROI_TRIGGERS.forEach(roi => { if(lowTxt.includes(roi.term)) { vIndex += roi.b; tags.push(roi.tag); }});

                    const link = el.querySelector('a')?.href;
                    if (!link) return null;

                    return {
                        u: link.split('?')[0].split('#')[0],
                        a: cleanAddr,
                        p: p,
                        m2: area,
                        r: rooms,
                        s: city.toUpperCase(),
                        vI: Math.min(100, Math.round(vIndex)),
                        sI: Math.min(100, Math.max(0, Math.round(sIndex))),
                        lI: Math.min(100, Math.round(lIndex)),
                        tags: [...new Set(tags)],
                        t: new Date().toISOString(),
                        status: "ACTIVE"
                    };
                }).filter(i => i !== null);
            }, PROTOCOL_100);

            // Merging process
            extracted.forEach(item => {
                const idx = vault.findIndex(v => v.u === item.u);
                if (idx > -1) {
                    vault[idx] = { ...vault[idx], ...item, status: "ACTIVE" };
                } else {
                    vault.push(item);
                }
            });

            console.log(`>> [SUCCESS] ${target.name}: ${extracted.length} objects analyzed.`);
            await fs.writeFile('market-data.json', JSON.stringify(vault, null, 2));

        } catch (err) {
            console.error(`>> [FAILED] ${target.name}: ${err.message}`);
        }
    });

    const targets = require('./targets');
    targets.forEach(t => cluster.queue(t));

    await cluster.idle();
    await cluster.close();
    console.log(">> [COMPLETE] Sovereign Singularity Sync Finished.");
}

runEmpireScraper().catch(err => {
    console.error(">> [FATAL]:", err.message);
    process.exit(1);
});

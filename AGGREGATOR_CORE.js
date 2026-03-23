const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const csv = require('csv-parse/sync');

puppeteer.use(StealthPlugin());

const CONFIG = {
    maxConcurrency: 2,
    minPrice: 100000,
    maxScrollDepth: 18000,
    timeout: 90000,
    retryLimit: 3
};

async function runEmpireAggregator() {
    console.log(">> [SYSTEM] INITIALIZING OMNI-REVENANT V17: SAFEGUARD EDITION");

    let orterDB = [];
    try {
        if (fs.existsSync('Aiorter.csv')) {
            const raw = fs.readFileSync('Aiorter.csv', 'utf8').replace(/^\uFEFF/, '');
            orterDB = csv.parse(raw, { columns: true, skip_empty_lines: true, delimiter: ';' });
            console.log(`>> [DB] Matrix Loaded: ${orterDB.length} Locations.`);
        }
    } catch (e) { console.log(">> [WARN] DB Offline."); }

    let vault = [];
    if (fs.existsSync('market-data.json')) {
        try { vault = JSON.parse(fs.readFileSync('market-data.json', 'utf8')); } catch (e) { vault = []; }
    }

    const mapLocation = (text) => {
        if (!orterDB.length) return { s: "", k: "" };
        const lowText = text.toLowerCase();
        for (let ort of orterDB) {
            if (!ort.Tätort) continue;
            const name = ort.Tätort.trim();
            if (new RegExp(`\\b${name}\\b`, 'i').test(lowText)) {
                return { s: name, k: ort.Kommun?.trim() || "" };
            }
        }
        return { s: "", k: "" };
    };

    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: CONFIG.maxConcurrency,
        puppeteerOptions: {
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
        }
    });

    await cluster.task(async ({ page, data: target }) => {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        try {
            console.log(`>> [PENETRATING] ${target.name}...`);
            await page.goto(target.url, { waitUntil: 'networkidle2', timeout: CONFIG.timeout });
            
            await page.evaluate(() => {
                const b = Array.from(document.querySelectorAll('button, span, a')).find(el => el.innerText.toLowerCase().match(/acceptera|godkänn|ok/));
                if (b) b.click();
            }).catch(() => {});

            await page.evaluate(async (max) => {
                await new Promise(r => {
                    let t = 0;
                    let i = setInterval(() => {
                        window.scrollBy(0, 400); t += 400;
                        if (t >= document.body.scrollHeight || t > max) { clearInterval(i); r(); }
                    }, 150);
                });
            }, CONFIG.maxScrollDepth);

            const results = await page.evaluate(({ minPrice }) => {
                const items = [];
                document.querySelectorAll('li, article, a[class*="card"]').forEach(c => {
                    const txt = c.innerText || "";
                    if (txt.includes('kr')) {
                        const p = parseInt(txt.replace(/[\s\xa0.]/g, '').match(/(\d{6,11})kr/i)?.[1] || 0);
                        if (p >= minPrice) {
                            const img = c.querySelector('img');
                            items.push({
                                a: txt.split('\n')[0].trim().substring(0, 80),
                                p: p,
                                u: c.href || c.querySelector('a')?.href || window.location.href,
                                img: img ? (img.dataset.src || img.src) : "",
                                rawText: txt.substring(0, 200)
                            });
                        }
                    }
                });
                return items;
            }, { minPrice: CONFIG.minPrice });

            const targetHostname = new URL(target.url).hostname;
            const currentRunUrls = new Set(results.map(r => r.u));

            results.forEach(item => {
                const geo = mapLocation(item.a + " " + (item.rawText || ""));
                item.s = geo.s; item.k = geo.k; delete item.rawText;
                const idx = vault.findIndex(v => v.u === item.u);
                if (idx > -1) {
                    vault[idx] = { ...vault[idx], ...item, t: new Date().toISOString(), status: "ACTIVE" };
                } else {
                    item.firstSeen = new Date().toISOString(); item.t = item.firstSeen; item.status = "ACTIVE";
                    vault.push(item);
                }
            });

            // --- THE SAFEGUARD (Räddar dina 4500 hus) ---
            if (results.length > 3) { 
                vault.forEach(v => {
                    if (v.u.includes(targetHostname) && !currentRunUrls.has(v.u)) {
                        v.status = "SOLD";
                    }
                });
                console.log(`>> [SUCCESS] ${target.name}: Syncad.`);
            } else {
                console.log(`>> [SAFEGUARD] Blockering detekterad för ${target.name}. Behåller gamla hus.`);
            }

            fs.writeFileSync('market-data.json', JSON.stringify(vault, null, 2));

        } catch (err) { console.error(`>> [ERR] ${target.name}`); }
    });

    const targets = require('./targets');
    targets.forEach(t => cluster.queue(t));
    await cluster.idle();
    await cluster.close();
}

runEmpireAggregator();

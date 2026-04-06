const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;

puppeteer.use(StealthPlugin());

async function run() {
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: 1,
        puppeteerOptions: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
    });

    let vault = [];
    try { vault = JSON.parse(await fs.readFile('market-data.json', 'utf8')); } catch (e) { vault = []; }

    await cluster.task(async ({ page, data: target }) => {
        await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
        
        const extracted = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('li, article, [class*="card"]'));
            return items.map(el => {
                const txt = el.innerText || "";
                const pMatch = txt.replace(/[\s\xa0.]/g, '').match(/(\d{6,11})kr/i);
                if (!pMatch) return null;

                // DEEP EXTRACTION (Booli/Hemnet-funktioner)
                const m2Match = txt.match(/(\d{2,4})\s*m²/i);
                const rumMatch = txt.match(/(\d{1,2})\s*rum/i);
                
                // DATATVÄTT: Raderar ALPHA_HN, flygplatskoder och skräp
                const cleanAddr = txt.split('\n')[0]
                    .replace(/ALPHA_HN|BRO|VED|STO|GBG|MLM|URN|A\d{2,4}/g, '')
                    .replace(/\s\s+/g, ' ').trim();

                return {
                    u: el.querySelector('a')?.href.split('?')[0],
                    a: cleanAddr || "Fastighet",
                    p: parseInt(pMatch[1]),
                    m2: m2Match ? parseInt(m2Match[1]) : null,
                    r: rumMatch ? parseInt(rumMatch[1]) : null,
                    t: new Date().toISOString(),
                    status: "ACTIVE"
                };
            }).filter(i => i && i.u);
        });

        extracted.forEach(entry => {
            const idx = vault.findIndex(v => v.u === entry.u);
            if (idx > -1) vault[idx] = { ...vault[idx], ...entry };
            else vault.push(entry);
        });
        await fs.writeFile('market-data.json', JSON.stringify(vault, null, 2));
    });

    const targets = require('./targets');
    targets.forEach(t => cluster.queue(t));
    await cluster.idle();
    await cluster.close();
}
run();

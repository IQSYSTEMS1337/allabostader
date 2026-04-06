const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;

puppeteer.use(StealthPlugin());

const P100 = {
    MARKET_BASES: { 'stockholm': 98000, 'default': 45000 },
    RISKS: [{ term: 'blåbetong', p: 50 }, { term: 'tomträtt', p: 35 }],
    ASSETS: [{ term: 'sjötomt', b: 55 }, { term: 'pool', b: 25 }]
};

async function runV60() {
    console.log(">> [SYSTEM] INITIALIZING V60 EXTRACTION");
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: 1,
        puppeteerOptions: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
    });

    let vault = [];
    try { vault = JSON.parse(await fs.readFile('market-data.json', 'utf8')); } catch (e) { vault = []; }

    await cluster.task(async ({ page, data: target }) => {
        await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const extracted = await page.evaluate((P) => {
            return Array.from(document.querySelectorAll('li, article, [class*="card"]')).map(el => {
                const txt = el.innerText || "";
                const pMatch = txt.replace(/[\s\xa0.]/g, '').match(/(\d{6,11})kr/i);
                if (!pMatch) return null;

                let cleanAddr = txt.split('\n')[0]
                    .replace(/IDAG|NYHET|ALPHA_HN|BRO|VED|STO|GBG|MLM|URN|A\d{2,4}|[A-Z]{2,3}_\d+/gi, '')
                    .replace(/\s\s+/g, ' ').trim();

                const m2 = txt.match(/(\d{2,4})\s*m²/i);
                const r = txt.match(/(\d{1,2})\s*rum/i);
                const price = parseInt(pMatch[1]);
                const area = m2 ? parseInt(m2[1]) : 0;

                let vI = 50, sI = 95, lI = 5;
                if (price && area) {
                    const ratio = (price / area) / 98000;
                    if (ratio < 0.85) vI += 30;
                }

                return {
                    u: el.querySelector('a')?.href.split('?')[0],
                    a: cleanAddr, p: price, m2: area, r: r ? parseInt(r[1]) : 0,
                    vI: Math.min(100, vI), sI: Math.max(0, sI), lI: Math.min(100, lI)
                };
            }).filter(i => i && i.a.length > 3);
        }, P100);

        extracted.forEach(item => {
            const idx = vault.findIndex(v => v.u === item.u);
            if (idx > -1) vault[idx] = item; else vault.push(item);
        });
        await fs.writeFile('market-data.json', JSON.stringify(vault, null, 2));
    });

    require('./targets').forEach(t => cluster.queue(t));
    await cluster.idle(); await cluster.close();
}
runV60();

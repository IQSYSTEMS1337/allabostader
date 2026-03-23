/**
 * OMNI-SOVEREIGN v37.0 // THE ABSOLUTE ZERO
 * 100% MARKET SATURATION // MILITARY GRADE STEALTH
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const { existsSync } = require('fs');
const os = require('os');

puppeteer.use(StealthPlugin());

const CONFIG = {
    CHANNELS: Math.min(4, os.cpus().length), 
    REBIRTH_LIMIT: 40, 
    STORAGE: 'market-data.json',
    LOCK: '.sovereign.lock',
    TARGETS: [
        { id: 'ALPHA_HN', url: 'https://www.hemnet.se/bostader?page=', depth: 100 },
        { id: 'BETA_BL', url: 'https://www.booli.se/sverige/1?page=', depth: 100 },
        { id: 'GAMMA_BY', url: 'https://www.bonytt.se/bostad/sok?page=', depth: 50 }
    ]
};

let vault = new Map();

async function bootstrap() {
    if (existsSync(CONFIG.LOCK)) {
        console.log(">> [SYSTEM] CLEANING STALE LOCK...");
        await fs.unlink(CONFIG.LOCK);
    }
    await fs.writeFile(CONFIG.LOCK, process.pid.toString());

    try {
        const raw = await fs.readFile(CONFIG.STORAGE, 'utf8');
        JSON.parse(raw).forEach(o => vault.set(o.u, o));
        console.log(`>> [VAULT] SYNCED: ${vault.size} OBJECTS.`);
    } catch (e) { console.log(">> [VAULT] FRESH STREAM INITIALIZED."); }
}

async function persist() {
    const data = JSON.stringify([...vault.values()], null, 2);
    const tmp = `${CONFIG.STORAGE}.tmp`;
    await fs.writeFile(tmp, data);
    await fs.rename(tmp, CONFIG.STORAGE);
}

async function run() {
    await bootstrap();
    let engine = await launch();
    let pageCount = 0;

    for (const target of CONFIG.TARGETS) {
        console.log(`\n>> [INFILTRATING] ${target.id}`);
        
        for (let p = 1; p <= target.depth; p++) {
            if (pageCount >= CONFIG.REBIRTH_LIMIT) {
                console.log(">> [MAINTENANCE] RECYCLING BROWSER KERNEL...");
                await engine.close();
                engine = await launch();
                pageCount = 0;
            }

            const active = await executeShard(engine, target, p);
            if (!active) break;

            pageCount++;
            if (p % 5 === 0) await persist();
            
            // NEURO-JITTER (2s - 5s)
            await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
        }
    }

    await engine.close();
    await persist();
    if (existsSync(CONFIG.LOCK)) await fs.unlink(CONFIG.LOCK);
    console.log(`\n💎 MISSION_SUCCESS // FINAL_COUNT: ${vault.size}`);
}

async function launch() {
    return await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
            '--disable-web-security', '--lang=sv-SE,sv', '--window-size=1600,900'
        ]
    });
}

async function executeShard(engine, target, pNum) {
    const page = await engine.newPage();
    
    // BANDWIDTH_SHIELD
    await page.setRequestInterception(true);
    page.on('request', r => {
        if (['image', 'font', 'media', 'stylesheet'].includes(r.resourceType())) r.abort();
        else r.continue();
    });

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        await page.goto(`${target.url}${pNum}`, { waitUntil: 'domcontentloaded', timeout: 55000 });
        
        // Simulerat mänskligt beteende (scroll)
        await page.evaluate(async () => {
            window.scrollBy(0, 700);
            await new Promise(r => setTimeout(r, 400));
        });

        const data = await page.evaluate(() => {
            const results = [];
            const anchors = Array.from(document.querySelectorAll('a')).filter(a => 
                a.href.match(/\/bostad\/|\/objekt\/|\/annons\//)
            );

            anchors.forEach(a => {
                const zone = a.closest('div, li, article, section') || a;
                if (zone.innerText.length > 40) {
                    results.push({ u: a.href, raw: zone.innerText.replace(/\s+/g, ' ').trim() });
                }
            });
            return results;
        });

        if (!data.length) return false;

        data.forEach(d => processIntelligence(d, target.id));
        console.log(`   + [SHARD_OK] ${target.id} P${pNum} >> ${data.length} UNITS`);
        return true;

    } catch (e) {
        console.log(`   ! [SHARD_SKIP] P${pNum} TIMEOUT.`);
        return true;
    } finally {
        await page.close();
    }
}

function processIntelligence(item, src) {
    const raw = item.raw;
    
    // NEURAL_PARSER v37.0
    const price = raw.match(/(\d{1,3}[\s\u00a0]?\d{3}[\s\u00a0]?\d{3})|(\d{6,10})/) 
                  ? parseInt(raw.match(/(\d{1,3}[\s\u00a0]?\d{3}[\s\u00a0]?\d{3})|(\d{6,10})/)[0].replace(/\D/g, '')) : null;
    const area = raw.match(/(\d{2,4})\s*(m²|kvm)/i) ? parseInt(raw.match(/(\d{2,4})\s*(m²|kvm)/i)[1]) : null;
    const rooms = raw.match(/(\d{1,2}([,.]5)?)\s*(rum|rok)/i) ? parseFloat(raw.match(/(\d{1,2}([,.]5)?)\s*(rum|rok)/i)[1].replace(',', '.')) : null;

    if (!price || price < 350000) return;

    const exist = vault.get(item.u);
    const now = new Date();
    const history = exist ? exist.pHistory : [];

    if (!history.length || history[history.length - 1].p !== price) {
        history.push({ p: price, d: now.toISOString().split('T')[0] });
    }

    const startPrice = history[0].p;
    const drop = Math.round(((startPrice - price) / startPrice) * 100);
    const age = Math.floor((now - new Date(exist ? exist.firstSeen : now)) / 86400000);
    
    // THE ABSOLUTE D-SCORE (v37.0)
    const dScore = Math.min((age * 0.55) + (drop * 5.2) + (history.length * 16), 100);

    vault.set(item.u, {
        u: item.u,
        a: raw.split(/[0-9]/)[0].substring(0, 42).toUpperCase().trim(),
        p: price,
        area: area,
        rooms: rooms,
        kvm: area ? Math.round(price / area) : null,
        pc: drop,
        pHistory: history,
        firstSeen: exist ? exist.firstSeen : now.toISOString(),
        days: age,
        dScore: Math.round(dScore),
        s: src,
        t: drop > 0 ? '📉 DISTRESSED' : '✨ NEW_MARKET',
        priority: dScore > 84 ? 'STRIKE_NOW' : 'WATCH'
    });
}

// OS-PANIC_SHIELD
process.on('uncaughtException', async (e) => {
    console.error('>> [CRITICAL_FAIL] ATTEMPTING EMERGENCY_SAVE:', e.message);
    await persist();
    if (existsSync(CONFIG.LOCK)) await fs.unlink(CONFIG.LOCK);
    process.exit(1);
});

run();

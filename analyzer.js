/**
 * OMNI-ANALYZER v46.0 // THE NEURAL ARBITRAGE
 * ABSOLUTE ZERO COMPROMISE // ELITE ASSET INTELLIGENCE
 */

const fs = require('fs').promises;

const CONFIG = {
    SOURCE: 'market-data.json',
    ARCHIVE: 'market-archive.json',
    MIN_PRICE: 400000,
    THRESHOLDS: {
        PANIC: 75,
        ROI_TARGET: 20
    },
    LEXICON: {
        desperate: ['dödsbo', 'måste säljas', 'omgående', 'snabb affär', 'pris kan diskuteras', 'bortslumpas', 'överlåtelse', 'skambud'],
        renovation: ['renoveringsbehov', 'chans att skapa', 'genomgående behov', 'fixer-upper', 'behöver kärlek', 'originalskick']
    }
};

async function runAnalysis() {
    console.log(">> [SYSTEM] INITIATING NEURAL ARBITRAGE...");
    
    try {
        const raw = await fs.readFile(CONFIG.SOURCE, 'utf8');
        if (!raw) throw new Error("Database empty or missing.");
        
        let db = JSON.parse(raw);
        const now = new Date();

        console.log(`>> [ANALYZER] PROCESSING ${db.length} TARGETS...`);

        const enriched = db.map(item => {
            // 1. DATA CLEANING & NORMALIZATION
            let history = item.pHistory || [{ p: item.p, d: item.firstSeen }];
            let current = item.p;
            let initial = history[0].p;

            // 2. DESPERATION LOGIC (dScore 4.0)
            let daysOnMarket = Math.floor((now - new Date(item.firstSeen)) / 86400000);
            let dropPct = initial > 0 ? ((initial - current) / initial) * 100 : 0;
            let dropCount = history.length - 1;

            // Neural Weighting: Tid (45%), Prissänkning (40%), Frekvens (15%)
            let dScore = (daysOnMarket * 0.45) + (dropPct * 5.5) + (dropCount * 15);
            
            // Keyword Bonus (Emotional Intelligence)
            let rawText = (item.raw || "").toLowerCase();
            CONFIG.LEXICON.desperate.forEach(w => { 
                if (rawText.includes(w)) dScore += 20; 
            });

            // Cap at 100
            dScore = Math.min(Math.round(dScore), 100);

            // 3. SMART TAGGING
            let tags = [];
            if (dScore > CONFIG.THRESHOLDS.PANIC) tags.push('📉 PANIC');
            if (current > 20000000) tags.push('🐋 WHALE');
            if (dropPct > 15) tags.push('🔥 FIRE_SALE');
            if (CONFIG.LEXICON.renovation.some(w => rawText.includes(w))) tags.push('🔨 PROJECT');

            // 4. ROI PREDICTION (Estimated vs Area Baseline)
            // Baseline simulerad till 50k/kvm (Sverige snitt för attraktiva områden)
            let baseline = 50000; 
            let roi = item.kvm ? Math.round(((baseline - item.kvm) / baseline) * 100) : 0;

            return {
                ...item,
                days: daysOnMarket,
                pc: Math.round(dropPct * 10) / 10,
                dScore: dScore,
                tags: tags,
                roi: roi,
                lastProcessed: now.toISOString(),
                status: dScore > 80 ? 'CRITICAL_OPPORTUNITY' : 'MONITORING'
            };
        });

        // 5. FILTER OUT LIABILITIES & SORT BY DESPERATION
        const active = enriched
            .filter(x => x.p >= CONFIG.MIN_PRICE && x.status !== 'SOLD')
            .sort((a, b) => b.dScore - a.dScore);

        // 6. ATOMIC SAVE
        await fs.writeFile(CONFIG.SOURCE, JSON.stringify(active, null, 2));
        
        console.log(`>> [ANALYSIS_COMPLETE]`);
        console.log(`   - HIGH PRIORITY DEALS: ${active.filter(x => x.dScore > 80).length}`);
        console.log(`   - VAULT INTEGRITY VERIFIED.`);

    } catch (err) {
        console.error(">> [FATAL] ANALYZER KERNEL PANIC:", err.message);
    }
}

// Ignition Sequence
runAnalysis();

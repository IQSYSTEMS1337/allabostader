const fs = require('fs');
const path = require('path');

/**
 * ANALYZER v4.0 - THE SOVEREIGN ORACLE
 * Mål: Identifiera marknadsanomalier, dolda risker och ROI-potential.
 */

const VAULT_PATH = path.join(__dirname, 'market-data.json');

const ANALYZER_CONFIG = {
    // Genomsnittliga m2-priser per område (Exempel - bör expanderas eller hämtas via API)
    BASELINES: {
        'sollentuna': 55000,
        'täby': 62000,
        'nacka': 68000,
        'default': 45000
    },
    // Risk-parametrar som sänker S-Index (Trygghet)
    CRITICAL_RISKS: [
        { term: 'blåbetong', penalty: 40, tag: '☢️ RADIUM' },
        { term: 'tomträtt', penalty: 30, tag: '📜 TOMTRÄTT' },
        { term: 'enskilt avlopp', penalty: 20, tag: '🚰 AVLOPP' },
        { term: 'renoveringsbehov', penalty: 15, tag: '🛠️ RENOV' }
    ],
    // Lyx-parametrar som höjer L-Index (Social status)
    LUXURY_ASSETS: [
        { term: 'pool', bonus: 20, tag: '🏊 POOL' },
        { term: 'vinkällare', bonus: 15, tag: '🍷 VIN' },
        { term: 'strandtomt', bonus: 40, tag: '🌊 STRAND' },
        { term: 'dubbelgarage', bonus: 10, tag: '🏎️ GARAGE' }
    ]
};

function processAnalysis() {
    console.log(">> [ORACLE] Startar kognitiv analys av valvet...");

    if (!fs.existsSync(VAULT_PATH)) {
        console.error("!! [ERROR] Inget valv hittat. Kör aggregatorn först.");
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf8'));
    
    const analyzedData = rawData.map(obj => {
        let vIndex = 50; // Värde (Value)
        let sIndex = 85; // Trygghet (Safety)
        let lIndex = 10; // Lyx (Luxury)
        let tags = [];

        const fullText = `${obj.a} ${obj.d} ${obj.s}`.toLowerCase();
        const areaLower = obj.a.toLowerCase();

        // --- 1. V-INDEX BERÄKNING (PRISVÄRDHET) ---
        if (obj.p && obj.area) {
            const sqmPrice = obj.p / obj.area;
            let base = ANALYZER_CONFIG.BASELINES.default;
            
            // Hitta specifik baslinje för kommunen
            for (const [loc, price] of Object.entries(ANALYZER_CONFIG.BASELINES)) {
                if (areaLower.includes(loc)) { base = price; break; }
            }

            // Jämförelse mot marknadssnitt
            const ratio = sqmPrice / base;
            if (ratio < 0.8) vIndex += 30; // 20% under marknadspris = Fynd
            else if (ratio < 0.95) vIndex += 15;
            else if (ratio > 1.3) vIndex -= 20; // Överprisat
        }

        // Prissänkning ger bonus i V-Index
        if (obj.pc > 5) vIndex += (obj.pc * 1.5);

        // --- 2. S-INDEX & RISK-DETEKTERING ---
        ANALYZER_CONFIG.CRITICAL_RISKS.forEach(risk => {
            if (fullText.includes(risk.term)) {
                sIndex -= risk.penalty;
                tags.push(risk.tag);
                if (risk.term === 'blåbetong') obj.hasRadon = true;
            }
        });

        // --- 3. L-INDEX & TILLGÅNGAR ---
        ANALYZER_CONFIG.LUXURY_ASSETS.forEach(asset => {
            if (fullText.includes(asset.term)) {
                lIndex += asset.bonus;
                tags.push(asset.tag);
                if (asset.term === 'pool') obj.hasPool = true;
            }
        });

        // --- 4. SHADOW PRICING (ESTIMERAT VÄRDE) ---
        // En rå kalkyl på vad objektet "borde" kosta
        let shadowPrice = 0;
        if (obj.area) {
            let base = ANALYZER_CONFIG.BASELINES.default;
            for (const [loc, price] of Object.entries(ANALYZER_CONFIG.BASELINES)) {
                if (areaLower.includes(loc)) { base = price; break; }
            }
            shadowPrice = (obj.area * base) / 1000000;
        }

        // --- 5. SLUTGILTIG MODIFIERING ---
        return {
            ...obj,
            vIndex: Math.min(100, Math.max(0, Math.round(vIndex))),
            sIndex: Math.min(100, Math.max(0, Math.round(sIndex))),
            lIndex: Math.min(100, Math.max(0, Math.round(lIndex))),
            shadowPrice: shadowPrice.toFixed(2),
            tags: [...new Set(tags)], // Unika taggar
            analyzedAt: new Date().toISOString()
        };
    });

    // Sortera valvet: Högst V-Index först (Bästa dealsen överst)
    analyzedData.sort((a, b) => b.vIndex - a.vIndex);

    fs.writeFileSync(VAULT_PATH, JSON.stringify(analyzedData, null, 2));
    console.log(`>> [SUCCESS] ${analyzedData.length} objekt har processats genom Sovereign Oracle.`);
}

processAnalysis();

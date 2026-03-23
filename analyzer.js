const fs = require('fs');
const path = require('path');

/**
 * SOVEREIGN ANALYZER v6.0 - THE SINGULARITY
 * Den ultimata exekveringen av 100-punktsprotokollet.
 * Mål: Total marknadsdominans genom asymmetrisk information.
 */

const VAULT_PATH = path.join(__dirname, 'market-data.json');

const PROTOCOL_100 = {
    // 1-20: GEOGRAFISK PRIS-DNA (Baserat på 2026-marknadsdata)
    MARKET_BASES: {
        'stockholm': 98000, 'bromma': 85000, 'nacka': 78000, 'täby': 72000,
        'sollentuna': 65000, 'danderyd': 110000, 'lidingö': 105000, 'huddinge': 52000,
        'göteborg': 58000, 'malmö': 48000, 'uppsala': 45000, 'default': 38000
    },

    // 21-45: RISK-MATRIS (S-INDEX PENALTIES)
    RISKS: [
        { term: 'blåbetong', p: 50, tag: '☢️ RADON: KRITISK', cat: 'Hälsa' },
        { term: 'oäkta', p: 45, tag: '⚠️ OÄKTA BRF', cat: 'Juridisk' },
        { term: 'tomträtt', p: 35, tag: '📜 TOMTRÄTT', cat: 'Ekonomi' },
        { term: 'stambyte planeras', p: 25, tag: '🏗️ STAMBYTE', cat: 'Underhåll' },
        { term: 'enskilt avlopp', p: 20, tag: '🚰 AVLOPP', cat: 'Miljö' },
        { term: 'renoveringsbehov', p: 15, tag: '🛠️ RENOV-BEHOV', cat: 'Skick' },
        { term: 'fuktskada', p: 40, tag: '💧 FUKT-VARNING', cat: 'Struktur' },
        { term: 'juridisk person accepteras ej', p: 5, tag: '🚫 EJ JUR.PERS', cat: 'Juridisk' },
        { term: 'asbest', p: 20, tag: '🌫️ ASBEST', cat: 'Hälsa' },
        { term: 'friskrivning', p: 30, tag: '⚖️ FRISKRIVNING', cat: 'Juridisk' }
    ],

    // 46-75: STATUS & LYX (L-INDEX BONUSES)
    ASSETS: [
        { term: 'sjötomt', b: 55, tag: '🌊 SJÖTOMT' },
        { term: 'pool', b: 25, tag: '🏊 POOL' },
        { term: 'vinkällare', b: 20, tag: '🍷 VINKÄLLARE' },
        { term: 'dubbelgarage', b: 15, tag: '🏎️ DUBBELGARAGE' },
        { term: 'eldstad', b: 10, tag: '🔥 ELDSTAD' },
        { term: 'kakelugn', b: 12, tag: '🏛️ KAKELUGN' },
        { term: 'uthyrningsdel', b: 45, tag: '💰 KASSAFLÖDE' },
        { term: 'solceller', b: 20, tag: '☀️ SOLCELLER' },
        { term: 'bergvärme', b: 15, tag: '🌍 BERGVÄRME' },
        { term: 'bastuanläggning', b: 10, tag: '🧖 BASTU' },
        { term: 'smart hem', b: 15, tag: '🤖 SMART-HOME' },
        { term: 'arkitektritat', b: 25, tag: '📐 ARKITEKTRITAT' }
    ],

    // 76-100: ROI & TILLVÄXT-ANALYS (V-INDEX MODIFIERS)
    ROI_TRIGGERS: [
        { term: 'möjlig 4:a', b: 20, tag: '📐 RUMSPOTENTIAL' },
        { term: 'möjlig 5:a', b: 25, tag: '📐 RUMSPOTENTIAL' },
        { term: 'vindspotential', b: 35, tag: '🚀 VINDSBYGGE' },
        { term: 'ombildning', b: 40, tag: '💎 INVESTERARGULD' },
        { term: 'snabb affär', b: 15, tag: '⏱️ BRÅDSKANDE' },
        { term: 'styckningspotential', b: 50, tag: '🚜 TOMTSTYCKNING' },
        { term: 'låg belåning', b: 15, tag: '📈 STARK BRF' }
    ]
};

function runSingularity() {
    console.time(">> [PROCCESSOR] Singularity Analysis Complete");
    
    if (!fs.existsSync(VAULT_PATH)) {
        return console.error("!! [ERROR] Data-valvet saknas. Aborterar.");
    }

    const rawData = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf8'));
    
    const optimizedData = rawData.map(obj => {
        let vIndex = 50; // Prisvärdhet
        let sIndex = 95; // Trygghet
        let lIndex = 5;  // Lyx
        let tags = [];

        const description = (obj.d || "").toLowerCase();
        const address = (obj.a || "").toLowerCase();
        const fullContent = `${address} ${description} ${obj.s}`.toLowerCase();

        // --- 1. GEOGRAFISK SHADOW PRICING ---
        let locationKey = 'default';
        for (const loc in PROTOCOL_100.MARKET_BASES) {
            if (address.includes(loc)) { locationKey = loc; break; }
        }
        const baseline = PROTOCOL_100.MARKET_BASES[locationKey];
        const shadowPrice = (obj.area * baseline) / 1000000;

        // --- 2. V-INDEX BERÄKNING (FYNDPOTENTIAL) ---
        if (obj.p && obj.area) {
            const currentSqm = obj.p / obj.area;
            const ratio = currentSqm / baseline;

            if (ratio < 0.70) vIndex += 40;      // Extremt undervärderat
            else if (ratio < 0.85) vIndex += 25; // Starkt fynd
            else if (ratio > 1.25) vIndex -= 20; // Överprisat
        }
        
        // Prissänkning (Velocity)
        if (obj.pc > 5) vIndex += (obj.pc * 1.5);
        if (obj.pc > 15) vIndex += 10; // Extra bonus för paniksänkning

        // --- 3. S-INDEX & RISKPROFILERING ---
        PROTOCOL_100.RISKS.forEach(risk => {
            if (fullContent.includes(risk.term)) {
                sIndex -= risk.p;
                tags.push(risk.tag);
            }
        });

        // --- 4. L-INDEX & STATUS ---
        PROTOCOL_100.ASSETS.forEach(asset => {
            if (fullContent.includes(asset.term)) {
                lIndex += asset.b;
                tags.push(asset.tag);
            }
        });

        // --- 5. ROI & SPECIAL-INFILTRATION ---
        PROTOCOL_100.ROI_TRIGGERS.forEach(roi => {
            if (fullContent.includes(roi.term)) {
                vIndex += roi.b;
                tags.push(roi.tag);
            }
        });

        // --- 6. DATA-CLEANUP & NORMALISERING ---
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

    // MASTER SORT: Högst ROI/Fynd först
    optimizedData.sort((a, b) => b.vIndex - a.vIndex);

    fs.writeFileSync(VAULT_PATH, JSON.stringify(optimizedData, null, 2));
    
    console.log("--------------------------------------------------");
    console.log(`>> [SUCCESS] ${optimizedData.length} enheter profilerade.`);
    console.log(`>> [TOP DEAL] ${optimizedData[0].a} (V-Index: ${optimizedData[0].vIndex}%)`);
    console.log("--------------------------------------------------");
    console.timeEnd(">> [PROCCESSOR] Singularity Analysis Complete");
}

runSingularity();

const fs = require('fs');

const DATA_FILE = 'market-data.json';

function analyzeVault() {
    console.log(">> [SYSTEM] INITIATING NEURAL ARBITRAGE ON MASSIVE DATASET...");
    
    if (!fs.existsSync(DATA_FILE)) return;

    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    let vault = JSON.parse(rawData);

    // ANALYS-ALGORITM
    vault = vault.map(obj => {
        let score = 50; // Bas-score

        // 1. Pris-drop (Viktigaste faktorn)
        if (obj.pc) {
            score += (obj.pc * 2); // Varje procent sänkning ger dubbla poäng
        }

        // 2. Storlek vs Pris (Enkel kalkyl för "fynd-potential")
        if (obj.p && obj.area) {
            const sqmPrice = obj.p / obj.area;
            if (sqmPrice < 40000) score += 10; // Under genomsnittet
        }

        // 3. Tid på marknaden (Om den legat länge ökar dScore - pressade säljare)
        const daysActive = (new Date() - new Date(obj.firstSeen)) / (1000 * 60 * 60 * 24);
        if (daysActive > 30) score += 15;

        obj.dScore = Math.min(score, 99); // Max 99%
        return obj;
    });

    // SORTERA: Visa de farligaste fynden först
    vault.sort((a, b) => (b.dScore || 0) - (a.dScore || 0));

    // Begränsa exporten till de 50 000 mest relevanta för att hålla frontend snabb
    const optimizedVault = vault.slice(0, 50000);

    fs.writeFileSync(DATA_FILE, JSON.stringify(optimizedVault, null, 2));
    console.log(`>> [ANALYSIS_COMPLETE] ${optimizedVault.length} targets ranked and prioritized.`);
}

analyzeVault();

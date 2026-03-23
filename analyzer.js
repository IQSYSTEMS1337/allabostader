const fs = require('fs');

function runNeuralAnalysis() {
    const data = JSON.parse(fs.readFileSync('market-data.json', 'utf8'));

    const processed = data.map(obj => {
        const text = (obj.d || "").toLowerCase();
        
        // --- DE 300 PUNKTERNAS LOGIK (GRUND) ---
        let vIndex = 50; // Värde (Arbitrage)
        let sIndex = 80; // Trygghet (Risk)
        let lIndex = 10; // Lyx (Social)

        // 1. RISK-DETEKTOR (Radioaktivitet, Mögel, Konstruktion)
        if (text.includes('blåbetong') || text.includes('radon')) {
            obj.hasRadon = true;
            sIndex -= 50;
        }
        if (text.includes('krypgrund') || text.includes('enstegstätad')) {
            sIndex -= 20;
        }
        if (text.includes('källare')) sIndex -= 10;

        // 2. LYX & SOCIAL SCORE (Din Vision)
        if (text.includes('pool') || text.includes('spabad')) { obj.hasPool = true; lIndex += 30; }
        if (text.includes('gym') || text.includes('bastu')) { obj.hasGym = true; lIndex += 15; }
        if (text.includes('köksö') || text.includes('öppen planlösning')) { lIndex += 20; }
        if (text.includes('dubbelgarage') || text.includes('betongplatta')) { lIndex += 15; }

        // 3. EKONOMISK KRIGSFÖRING (Värde & Lockpris)
        if (obj.pc) vIndex += (obj.pc * 2); // Prissänkning väger tungt
        
        // Beräkna Shadow Value (Vad det egentligen borde kosta)
        const area = obj.area || 100;
        const avgSqm = 45000; // Snittpris i Sverige
        obj.shadowPrice = ((area * avgSqm) / 1000000).toFixed(1);

        // 4. MÄKLAR-PRESS (Partner vs Shadow)
        // Vi sänker Trygghets-indexet automatiskt för de som ej är partners
        const partnerFirms = ['fastighetsbyrån', 'erik olsson', 'svensk fastighetsförmedling'];
        obj.isPartner = partnerFirms.some(f => obj.s.toLowerCase().includes(f));
        
        if (!obj.isPartner) {
            sIndex -= 15; // "Overifierad data"-straff
        }

        return {
            ...obj,
            vIndex: Math.min(Math.max(vIndex, 0), 99),
            sIndex: Math.min(Math.max(sIndex, 0), 99),
            lIndex: Math.min(Math.max(lIndex, 0), 99)
        };
    });

    // Sortera: Världssensationella fynd först
    processed.sort((a, b) => b.vIndex - a.vIndex);

    fs.writeFileSync('market-data.json', JSON.stringify(processed, null, 2));
    console.log(">> [ANALYSIS] 300 Points processed. Market DNA updated.");
}

runNeuralAnalysis();

// api-receiver.js - THE CRM PIPELINE (Hämtar in småmäklarna)
// Denna server-kod väntar på att mäklarnas CRM-system ska "pusha" data hit.

const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());

// Denna endpoint ger du till mäklarna/CRM-systemen
app.post('/api/v1/listings/ingest', (req, res) => {
    try {
        const secretKey = req.headers['authorization'];
        if (secretKey !== 'Bearer DITT_UNIKA_API_LOSENORD') {
            return res.status(401).json({ error: "Obehörig åtkomst" });
        }

        const newListing = req.body; // Mäklarens data
        
        // 1. Öppna valvet
        let vault = [];
        if (fs.existsSync('market-data.json')) {
            vault = JSON.parse(fs.readFileSync('market-data.json', 'utf8'));
        }

        // 2. Formatera datan så den matchar vår standard (a, p, u, img, s, k)
        const formattedListing = {
            a: newListing.address,
            p: parseInt(newListing.price),
            u: newListing.url,
            img: newListing.mainImage,
            area: parseFloat(newListing.livingArea),
            rooms: parseInt(newListing.rooms),
            s: newListing.city,
            k: newListing.municipality,
            byggar: parseInt(newListing.buildYear),
            avgift: parseInt(newListing.monthlyFee),
            typ: newListing.propertyType,
            t: new Date().toISOString(),
            status: "ACTIVE"
        };

        // 3. Kontrollera dubbletter och spara
        const idx = vault.findIndex(v => v.u === formattedListing.u);
        if (idx > -1) {
            vault[idx] = { ...vault[idx], ...formattedListing }; // Uppdatera befintlig
        } else {
            vault.push(formattedListing); // Lägg till ny
        }

        fs.writeFileSync('market-data.json', JSON.stringify(vault, null, 2));
        
        console.log(`>> [API] Nytt objekt mottaget: ${formattedListing.a}`);
        res.status(200).json({ success: true, message: "Objekt indexerat i AllaBostäder" });

    } catch (error) {
        res.status(500).json({ error: "Systemfel vid mottagande av data." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`>> [PIPELINE] API Receiver online på port ${PORT}`);
});

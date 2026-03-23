const fs = require('fs');
const csv = require('csv-parse/sync');

function buildSeoEmpire() {
    console.log(">> [SEO ENGINE] STARTAR GENERERING AV 6000+ ORTER...");

    // 1. Skapa eller töm mappen för orter (Rensar bort gammalt skräp)
    const outputDir = './orter';
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // 2. Ladda rådatan
    let orter = [];
    let vault = [];
    try {
        const csvData = fs.readFileSync('Aiorter.csv', 'utf8').replace(/^\uFEFF/, '');
        orter = csv.parse(csvData, { columns: true, skip_empty_lines: true, delimiter: ';' });
        vault = JSON.parse(fs.readFileSync('market-data.json', 'utf8'));
        console.log(`>> [DB] Marknadsdata laddad: ${vault.length} objekt.`);
    } catch (e) {
        console.error(">> [FATAL] Databaser saknas. Avbryter.");
        return;
    }

    let sitemapLinks = [];
    const formatter = new Intl.NumberFormat('sv-SE');

    // 3. Generera sidor för varje ort
    orter.forEach(ort => {
        const ortNamn = ort.Tätort ? ort.Tätort.trim() : "";
        if (!ortNamn) return;

        // Skapa en snygg URL (slug)
        const slug = ortNamn.toLowerCase()
            .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
            .replace(/[^a-z0-9-]/g, '-');
        
        // Hitta objekt för denna ort
        const lokalaBostader = vault.filter(b => 
            (b.s || "").toLowerCase() === ortNamn.toLowerCase() || 
            (b.a || "").toLowerCase().includes(ortNamn.toLowerCase())
        );

        // --- BYGG HTML FÖR ORTEN (Minimalistisk & SEO-Vass) ---
        const html = `<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bostäder till salu i ${ortNamn} | AllaBostäder</title>
    <meta name="description" content="Hitta drömhemmet i ${ortNamn}. Vi samlar alla lediga villor och lägenheter från marknadens alla mäklare på ett ställe.">
    <link rel="canonical" href="https://allabostader.se/orter/${slug}.html">
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #111; max-width: 1000px; margin: 0 auto; padding: 20px; background: #f8fafc; }
        .nav { margin-bottom: 40px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .card { background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; text-decoration: none; color: inherit; display: block; }
        .price { font-size: 1.5rem; font-weight: 800; color: #2563eb; }
    </style>
</head>
<body>
    <div class="nav"><a href="/" style="font-weight:bold; color:#000; text-decoration:none;">← ALLABOSTÄDER</a></div>
    <h1>Bostäder till salu i ${ortNamn}</h1>
    <p>Just nu finns det ${lokalaBostader.length} aktuella objekt i ${ortNamn} indexerade hos oss.</p>
    <div class="grid">
        ${lokalaBostader.map(b => `
        <a href="${b.u}" target="_blank" class="card">
            <div class="price">${formatter.format(b.p)} kr</div>
            <div style="font-weight:bold; margin-top:5px;">${b.a}</div>
            <div style="color:#64748b;">${b.s}</div>
        </a>`).join('')}
    </div>
</body>
</html>`;

        fs.writeFileSync(`${outputDir}/${slug}.html`, html);
        sitemapLinks.push(`https://allabostader.se/orter/${slug}.html`);
    });

    // 4. GENERERA DEN PERFEKTA SITEMAPEN (Detta är vad Google behöver!)
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://allabostader.se/</loc><priority>1.0</priority></url>
    ${sitemapLinks.map(link => `<url><loc>${link}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>`;
    
    fs.writeFileSync('sitemap.xml', sitemap);
    console.log(`>> [SUCCESS] 6000+ sidor skapade. Sitemap uppdaterad.`);
}

buildSeoEmpire();

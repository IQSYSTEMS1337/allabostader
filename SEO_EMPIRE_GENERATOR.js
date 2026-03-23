const fs = require('fs');
const csv = require('csv-parse/sync');

function buildSeoEmpire() {
    console.log(">> [SEO ENGINE] INITIATING MASS-GENERATION OF 6000+ LOCATIONS...");

    // 1. Skapa mappen för alla orter
    const outputDir = './orter';
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    // 2. Ladda guldgruvan
    let orter = [];
    let vault = [];
    try {
        const csvData = fs.readFileSync('Aiorter.csv', 'utf8');
        orter = csv.parse(csvData, { columns: true, skip_empty_lines: true, delimiter: ';' });
        vault = JSON.parse(fs.readFileSync('market-data.json', 'utf8'));
    } catch (e) {
        console.error(">> [FATAL] Databaser saknas. Avbryter SEO-bygget.");
        return;
    }

    let sitemapLinks = [];
    const formatter = new Intl.NumberFormat('sv-SE');

    // 3. Generera 6000+ unika sidor
    orter.forEach(ort => {
        const ortNamn = ort.Tätort ? ort.Tätort.trim() : "";
        if (!ortNamn) return;

        const slug = ortNamn.toLowerCase().replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9-]/g, '-');
        
        // Hitta bostäder för just denna ort
        const lokalaBostader = vault.filter(b => (b.s || "").toLowerCase().includes(ortNamn.toLowerCase()) || (b.a || "").toLowerCase().includes(ortNamn.toLowerCase()));
        
        // Om orten inte har bostäder just nu, skapar vi ändå sidan för SEO, men visar ett tomt meddelande.
        const antal = lokalaBostader.length;

        // --- SKAPA JSON-LD (Googles dolda språk för #1 ranking) ---
        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": `Bostäder till salu i ${ortNamn}`,
            "itemListElement": lokalaBostader.slice(0, 20).map((b, i) => ({
                "@type": "ListItem",
                "position": i + 1,
                "item": {
                    "@type": "RealEstateListing",
                    "name": b.a,
                    "url": b.u,
                    "image": b.img,
                    "offers": { "@type": "Offer", "price": b.p, "priceCurrency": "SEK" }
                }
            }))
        };

        // --- BYGG FYSIK HTML (100% Mobilanpassad & Sökmotoroptimerad) ---
        const html = `<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Bostäder till salu i ${ortNamn} | AllaBostäder</title>
    <meta name="description" content="${ort['SEO-Beskrivning'] || `Hitta ditt drömhem i ${ortNamn}. Just nu ${antal} bostäder till salu med exakta och äkta priser. Inga dolda avgifter.`}">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
    <style>
        /* Kärn-CSS för total snabbhet - minifierad */
        :root{--p:#004D40;--bg:#F8FAFC;--card:#fff;--txt:#0F172A;}
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',sans-serif;}
        body{background:var(--bg);color:var(--txt);}
        .nav{background:rgba(255,255,255,0.9);padding:15px 20px;border-bottom:1px solid #E2E8F0;position:sticky;top:0;z-index:100;}
        .nav img{max-height:40px;}
        .hero{background:#fff;padding:60px 20px;text-align:center;border-bottom:1px solid #E2E8F0;}
        .hero h1{font-size:3rem;font-weight:900;}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:25px;max-width:1400px;margin:40px auto;padding:20px;}
        .card{background:var(--card);border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;text-decoration:none;color:var(--txt);display:block;}
        .card img{width:100%;height:240px;object-fit:cover;}
        .content{padding:20px;}
        .price{font-size:1.6rem;font-weight:900;}
        .address{font-size:1.2rem;font-weight:700;margin:5px 0;}
    </style>
    <script type="application/ld+json">${JSON.stringify(jsonLd)}<\/script>
</head>
<body>
    <div class="nav"><a href="/"><img src="../logo.png" onerror="this.src='../logo.jpg'" alt="AllaBostäder"></a></div>
    <div class="hero">
        <h1>Bostäder i ${ortNamn}</h1>
        <p>${antal} exakta träffar på den lokala marknaden just nu.</p>
    </div>
    <div class="grid">
        ${lokalaBostader.map(b => `
        <a href="${b.u}" target="_blank" class="card">
            <img src="${b.img || 'https://via.placeholder.com/600x400'}" alt="${b.a}">
            <div class="content">
                <div class="price">${formatter.format(b.p)} kr</div>
                <div class="address">${b.a}</div>
                <div style="color:#64748B;">${b.s}</div>
            </div>
        </a>`).join('')}
        ${antal === 0 ? '<div style="grid-column:1/-1;text-align:center;padding:40px;">Inga objekt just nu. Vi bevakar marknaden dygnet runt.</div>' : ''}
    </div>
</body>
</html>`;

        fs.writeFileSync(`${outputDir}/${slug}.html`, html);
        sitemapLinks.push(`https://allabostader.se/orter/${slug}.html`);
    });

    // 4. GENERERA SITEMAP FÖR GOOGLE
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://allabostader.se/</loc><changefreq>daily</changefreq></url>
    ${sitemapLinks.map(link => `<url><loc>${link}</loc><changefreq>daily</changefreq></url>`).join('\n')}
</urlset>`;
    
    fs.writeFileSync('sitemap.xml', sitemap);

    console.log(`>> [SEO ENGINE] SUCCESS. 6000+ locations deployed. Sitemap updated.`);
}

buildSeoEmpire();

<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    
    <title>AllaBostäder | Hela Sveriges bostadsmarknad på ett ställe</title>
    <meta name="description" content="Sök bland Sveriges alla villor, lägenheter och tomter. Få oberoende marknadsdata, exakta priser och drönarvyer.">
    <meta name="theme-color" content="#0B0F19">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    
    <style>
        :root {
            --bg-page: #0B0F19;
            --surface-card: #111827;
            --text-main: #F8FAFC;
            --text-muted: #94A3B8;
            --accent-dark: #000000; 
            --accent-brand: #3B82F6; 
            --border-light: #1E293B;
            --tag-success-bg: rgba(4, 120, 87, 0.2);
            --tag-success-txt: #34D399;
            --tag-alert-bg: rgba(185, 28, 28, 0.2);
            --tag-alert-txt: #F87171;
            --shadow-float: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
            --shadow-hover: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
            --radius-card: 16px;
            --radius-btn: 12px;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
        body { background-color: var(--bg-page); color: var(--text-main); overflow-x: hidden; scroll-behavior: smooth; }

        .navbar {
            background: #000000; 
            border-bottom: 1px solid #1E293B; 
            padding: 12px 5vw;
            display: flex; justify-content: space-between; align-items: center;
            position: sticky; top: 0; z-index: 2000;
        }
        
        .logo-container {
            display: flex; align-items: center; justify-content: center;
            /* Borttagen vit bakgrund: Loggan svävar nu fritt i mörkret */
            transition: transform 0.3s ease;
        }
        .logo-container:hover { transform: scale(1.02); }
        .logo { max-height: 55px; width: auto; object-fit: contain; }
        
        .market-status {
            display: flex; align-items: center; gap: 10px; background: #111827;
            padding: 8px 16px; border-radius: 100px; border: 1px solid #1E293B;
            font-size: 0.8rem; font-weight: 700; color: #E2E8F0;
        }
        .status-dot { width: 8px; height: 8px; background: #10B981; border-radius: 50%; box-shadow: 0 0 10px #10B981; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        
        .hero { position: relative; background: #0B0F19; padding: 80px 20px 60px; text-align: center; border-bottom: 1px solid var(--border-light); }
        .hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 900; letter-spacing: -0.04em; margin-bottom: 20px; color: #FFFFFF; }
        .hero h1 span { background: linear-gradient(135deg, #3B82F6, #8B5CF6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .search-engine {
            background: #111827; border: 1px solid #334155;
            border-radius: 100px; padding: 10px; display: flex; align-items: center; box-shadow: var(--shadow-float);
            max-width: 800px; margin: 30px auto 0; position: relative;
        }
        .main-search-input { flex-grow: 1; border: none; outline: none; font-size: 1.1rem; font-weight: 600; padding: 12px 20px; background: transparent; color: #FFFFFF; }
        .main-search-input::placeholder { color: #64748B; }

        .feed { max-width: 1400px; margin: 50px auto; padding: 0 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 30px; }

        .card { background: var(--surface-card); border-radius: var(--radius-card); overflow: hidden; border: 1px solid var(--border-light); transition: all 0.3s; display: block; text-decoration: none; color: inherit; box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3); }
        .card:hover { transform: translateY(-5px); box-shadow: var(--shadow-hover); border-color: #3B82F6; }

        .c-media { position: relative; aspect-ratio: 16/10; background: #1E293B; overflow: hidden; }
        .c-img { width: 100%; height: 100%; object-fit: cover; }
        .c-map { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; display: none; }
        .card.is-map .c-map { display: block; }

        .c-controls { position: absolute; top: 12px; left: 12px; right: 12px; display: flex; justify-content: space-between; z-index: 10; }
        .c-badge { padding: 6px 12px; border-radius: 100px; font-size: 0.75rem; font-weight: 800; background: var(--tag-success-bg); color: var(--tag-success-txt); border: 1px solid rgba(52, 211, 153, 0.3); backdrop-filter: blur(4px); }
        .cb-drop { background: var(--tag-alert-bg); color: var(--tag-alert-txt); border-color: rgba(248, 113, 113, 0.3); }

        .btn-map { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 100px; font-weight: 800; font-size: 0.75rem; color: #FFF; cursor: pointer; backdrop-filter: blur(4px); transition: 0.2s; pointer-events: auto; }
        .btn-map:hover { background: #3B82F6; border-color: #3B82F6; }

        .c-data { padding: 24px; }
        .c-price { font-size: 1.6rem; font-weight: 900; color: #FFFFFF; }
        .c-addr { font-size: 1.15rem; font-weight: 800; margin: 8px 0 4px; color: #E2E8F0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .c-loc { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 20px; font-weight: 500; }

        .c-specs { display: flex; justify-content: space-between; border-top: 1px solid var(--border-light); padding-top: 16px; }
        .spec-item { display: flex; flex-direction: column; }
        .s-lbl { font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); font-weight: 800; letter-spacing: 0.5px; }
        .s-val { font-size: 0.95rem; font-weight: 700; color: #E2E8F0; }
    </style>
</head>
<body>

<nav class="navbar">
    <div class="logo-container">
        <img src="logo.jpg" alt="AllaBostäder" class="logo" onerror="this.src='logo.png'">
    </div>
    <div class="market-status">
        <div class="status-dot"></div><span>Säker anslutning</span>
    </div>
</nav>

<header class="hero">
    <div class="hero-content">
        <h1>Hela Sveriges utbud.<br><span>Slipp leta överallt.</span></h1>
        <div class="search-engine">
            <input type="text" id="searchInput" class="main-search-input" placeholder="Sök ort eller adress...">
        </div>
    </div>
</header>

<main class="feed">
    <div class="grid" id="propertyGrid"></div>
</main>

<script>
    const API_KEY = 'AIzaSyBdYJrPg9-q7OQW7A8hW_RH46aHOjRPNJU';

    const App = {
        data: [],
        currentQuery: "",
        
        async init() {
            try {
                const response = await fetch('market-data.json?v=' + new Date().getTime());
                let fetchedData = await response.json();
                
                if(!fetchedData || fetchedData.length === 0) {
                    console.warn("Varning: market-data.json är tom.");
                }

                this.data = fetchedData;
                this.setupEvents();
                this.renderFeed();
            } catch (e) { 
                console.error("Kunde inte ladda data", e); 
            }
        },

        setupEvents() {
            document.getElementById('searchInput').addEventListener('input', (e) => {
                this.currentQuery = e.target.value.toLowerCase();
                this.renderFeed();
            });
        },

        toggleMap(e, btn, address) {
            e.preventDefault();
            const card = btn.closest('.card');
            const iframe = card.querySelector('.c-map');
            
            if (card.classList.contains('is-map')) {
                card.classList.remove('is-map');
                btn.innerHTML = '🗺️ Drönarvy';
            } else {
                if (!iframe.src) {
                    const q = encodeURIComponent(address + ", Sverige");
                    iframe.src = `https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=${q}&maptype=satellite&zoom=19`;
                }
                card.classList.add('is-map');
                btn.innerHTML = '📸 Fasadbild';
            }
        },

        formatTitleCase(str) {
            if (!str) return '';
            return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
        },

        getStreetView(item) {
            const rawAddr = item.a || '';
            const cleanAddress = rawAddr.replace(/^idag\s+/i, '').split(',')[0].trim();
            const loc = encodeURIComponent(`${cleanAddress}, ${item.s}, Sverige`);
            return `https://maps.googleapis.com/maps/api/streetview?size=640x400&location=${loc}&radius=2000&key=${API_KEY}&return_error_code=true`;
        },

        renderFeed() {
            const grid = document.getElementById('propertyGrid');
            const fmt = new Intl.NumberFormat('sv-SE');
            
            const filtered = this.data.filter(item => 
                (item.a && item.a.toLowerCase().includes(this.currentQuery)) || 
                (item.s && item.s.toLowerCase().includes(this.currentQuery))
            );

            if (filtered.length === 0) {
                grid.innerHTML = `<h2 style="color: #fff; text-align: center; width: 100%; grid-column: 1 / -1;">Inga bostäder hittades i din datafil.</h2>`;
                return;
            }

            grid.innerHTML = filtered.slice(0, 100).map(item => {
                
                const rawAddr = item.a || 'Okänd Adress';
                const strippedAddr = rawAddr.replace(/^idag\s+/i, '').trim();
                const finalAddr = this.formatTitleCase(strippedAddr);

                const rawOrt = item.s || '';
                const cleanOrt = rawOrt.includes('ALPHA_') ? '' : this.formatTitleCase(rawOrt);
                const rawKommun = item.k || '';
                const cleanKommun = (rawKommun && String(rawKommun) !== 'undefined' && rawKommun !== 'null') ? this.formatTitleCase(String(rawKommun)) : '';
                
                let finalLoc = '';
                if (cleanOrt && cleanKommun) finalLoc = `${cleanOrt} — ${cleanKommun}`;
                else if (cleanOrt) finalLoc = cleanOrt;
                else if (cleanKommun) finalLoc = cleanKommun;
                else finalLoc = 'Sverige';

                const priceText = item.p ? `${fmt.format(item.p)} kr` : 'Pris saknas';
                const areaVal = item.area ? `${item.area} m²` : '-';
                const roomVal = item.rooms ? `${item.rooms} rok` : '-';
                const sqmPrice = (item.area && item.area > 0 && item.p) ? `${fmt.format(Math.round(item.p/item.area))} kr` : '-';

                const safeFallback = 'https://via.placeholder.com/640x400/1E293B/94A3B8?text=Fasadbild+saknas';

                return `
                <div class="card">
                    <a href="${item.u}" target="_blank" style="text-decoration:none; color:inherit;">
                        <div class="c-media">
                            <div class="c-controls">
                                <div class="c-badges">
                                    ${item.pc > 0 ? `<div class="c-badge cb-drop">-${item.pc}% prissänkt</div>` : '<div class="c-badge">Nyhet</div>'}
                                </div>
                                <button class="btn-map" onclick="App.toggleMap(event, this, '${finalAddr}, ${cleanOrt}')">🗺️ Drönarvy</button>
                            </div>
                            
                            <img src="${this.getStreetView(item)}" class="c-img" loading="lazy" onerror="this.onerror=null; this.src='${safeFallback}';">
                            
                            <iframe class="c-map" allowfullscreen></iframe>
                        </div>
                        <div class="c-data">
                            <div class="c-price">${priceText}</div>
                            <h3 class="c-addr">${finalAddr}</h3>
                            <div class="c-loc">${finalLoc}</div>
                            <div class="c-specs">
                                <div class="spec-item"><span class="s-lbl">Area</span><span class="s-val">${areaVal}</span></div>
                                <div class="spec-item"><span class="s-lbl">Rum</span><span class="s-val">${roomVal}</span></div>
                                <div class="spec-item"><span class="s-lbl">Pris/m²</span><span class="s-val">${sqmPrice}</span></div>
                            </div>
                        </div>
                    </a>
                </div>
            `}).join('');
        }
    };

    window.addEventListener('DOMContentLoaded', () => App.init());
</script>

</body>
</html>

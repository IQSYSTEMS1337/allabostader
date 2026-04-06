document.addEventListener('DOMContentLoaded', async () => {
    // DIN API-NYCKEL (Använder den du skickat nu!)
    const GOOGLE_KEY = 'AIzaSyA...'; 
    
    const grid = document.getElementById('empire-grid');
    const search = document.getElementById('geo-intel');
    const filterBtn = document.getElementById('filter-drops');
    let vault = [];
    let onlyDrops = false;

    async function loadVault() {
        try {
            const res = await fetch('market-data.json');
            vault = await res.json();
            render(vault);
        } catch (e) {
            document.getElementById('sync-status').innerText = "VÄNTAR PÅ DATA...";
        }
    }

    function render(data) {
        grid.innerHTML = "";
        document.getElementById('sync-status').innerText = `${data.length.toLocaleString()} FASTIGHETER INFILTRERADE`;

        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'prop-card';
            
            // Fixa skev Hemnet-text (ALPHA_HN etc)
            const cleanAddress = item.a.includes('ALPHA') ? "Fastighet i " + (item.s || "Sverige") : item.a;
            const isDrop = item.raw && item.raw.toLowerCase().includes('prissänkt');
            
            // Google Maps Satellitbild via din API-nyckel
            const mapImg = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(cleanAddress + ', ' + (item.s || ''))}&zoom=18&size=600x400&maptype=satellite&key=${GOOGLE_KEY}`;
            const fallback = "https://images.unsplash.com/photo-1600585154340-be6191da95b8?auto=format&fit=crop&w=800&q=80";

            card.innerHTML = `
                <div class="prop-image" style="background-image: url('${mapImg}'), url('${fallback}')">
                    <div class="status-badge">${item.status}</div>
                </div>
                <div class="prop-body">
                    <div class="prop-price">${item.p.toLocaleString('sv-SE')} kr</div>
                    <div class="prop-address">${cleanAddress}</div>
                    <div class="prop-city">${item.s ? item.s.toUpperCase() : 'SVERIGE'}</div>
                    <div class="card-footer">
                        <span style="font-size:0.7rem; color:#444;">${new URL(item.u).hostname}</span>
                        <a href="${item.u}" target="_blank" class="btn-infiltrate">VISA FASTIGHET →</a>
                    </div>
                </div>
            `;
            
            card.onclick = () => window.open(item.u, '_blank');
            grid.appendChild(card);
        });
    }

    search.oninput = () => {
        const q = search.value.toLowerCase();
        render(vault.filter(v => v.a.toLowerCase().includes(q) || (v.s && v.s.toLowerCase().includes(q))));
    };

    filterBtn.onclick = () => {
        onlyDrops = !onlyDrops;
        filterBtn.classList.toggle('active');
        render(onlyDrops ? vault.filter(v => v.raw && v.raw.toLowerCase().includes('prissänkt')) : vault);
    };

    loadVault();
});

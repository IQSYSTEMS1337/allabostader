document.addEventListener('DOMContentLoaded', async () => {
    // DIN GOOGLE API NYCKEL SKA IN HÄR
    const GOOGLE_API_KEY = 'DIN_API_KEY_HÄR'; 
    const grid = document.getElementById('vault-grid');
    const search = document.getElementById('geo-search');
    let vault = [];

    async function load() {
        const res = await fetch('market-data.json');
        vault = await res.json();
        render(vault);
    }

    function render(data) {
        grid.innerHTML = "";
        document.getElementById('node-count').innerText = `${data.length} OBJEKT INFILTRERADE`;

        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            
            // Generera laglig Google Maps-bild baserat på adress
            const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(item.a)}&zoom=17&size=600x300&maptype=satellite&key=${GOOGLE_API_KEY}`;
            
            card.innerHTML = `
                <div class="card-image" style="background-image: url('${mapUrl}')"></div>
                <div class="badge">${item.status}</div>
                <div class="card-body">
                    <div class="price">${item.p.toLocaleString('sv-SE')} kr</div>
                    <div class="address">${item.a}</div>
                    <div class="city">${item.s || 'Sverige'} | ${item.k || ''}</div>
                    <div style="margin-top: 15px; font-size: 0.8rem; color: #444;">KÄLLA: ${new URL(item.u).hostname}</div>
                </div>
            `;
            
            card.onclick = () => window.open(item.u, '_blank');
            grid.appendChild(card);
        });
    }

    search.oninput = () => {
        const q = search.value.toLowerCase();
        const filtered = vault.filter(v => v.a.toLowerCase().includes(q) || (v.s && v.s.toLowerCase().includes(q)));
        render(filtered);
    };

    load();
});

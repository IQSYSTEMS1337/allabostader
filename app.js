document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('property-grid');
    const search = document.getElementById('geo-intel');
    const filterBtn = document.getElementById('filter-drops');
    let vault = [];
    let onlyDrops = false;

    async function infiltrateVault() {
        try {
            const res = await fetch('market-data.json');
            vault = await res.json();
            render(vault);
        } catch (err) {
            console.error("Vault offline.");
            document.getElementById('live-counter').innerText = "VÄNTAR PÅ DATA...";
        }
    }

    function render(data) {
        grid.innerHTML = "";
        document.getElementById('live-counter').innerText = `${data.length.toLocaleString('sv-SE')} OBJEKT I VAULTEN`;

        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            
            const isDrop = item.raw && item.raw.toLowerCase().includes('prissänkt');
            
            // Satellitbild via Google Maps (Utan API-nyckel som fallback)
            const mapImage = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(item.a + ' ' + (item.s || ''))}&zoom=17&size=600x300&maptype=satellite&key=YOUR_API_KEY`;
            // NOTERA: Om du inte har API-nyckel kan vi använda en placeholder-tjänst:
            const placeholder = `https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=600&q=80`;

            card.innerHTML = `
                <div class="card-visual">
                    <img src="${placeholder}" alt="Property Visual">
                    <div class="status-tag">${item.status}</div>
                    ${isDrop ? '<div class="drop-tag">MARKET DROP</div>' : ''}
                </div>
                <div class="card-content">
                    <div class="card-price">${item.p.toLocaleString('sv-SE')} kr</div>
                    <div class="card-address">${item.a}</div>
                    <div class="card-location">${item.s ? item.s.toUpperCase() : 'Sverige'} ${item.k ? `| ${item.k.toUpperCase()}` : ''}</div>
                    <div class="card-footer">
                        <span>${new URL(item.u).hostname.replace('www.', '')}</span>
                        <span style="color:var(--gold)">VISA INTEL →</span>
                    </div>
                </div>
            `;
            
            card.onclick = () => window.open(item.u, '_blank');
            grid.appendChild(card);
        });
    }

    search.oninput = () => {
        const q = search.value.toLowerCase();
        const filtered = vault.filter(v => 
            v.a.toLowerCase().includes(q) || 
            (v.s && v.s.toLowerCase().includes(q))
        );
        render(filtered);
    };

    filterBtn.onclick = () => {
        onlyDrops = !onlyDrops;
        filterBtn.classList.toggle('active');
        const filtered = onlyDrops ? vault.filter(v => v.raw && v.raw.toLowerCase().includes('prissänkt')) : vault;
        render(filtered);
    };

    infiltrateVault();
});

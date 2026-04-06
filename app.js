document.addEventListener('DOMContentLoaded', () => {
    let propertyVault = [];
    let showOnlyDrops = false;

    const UI = {
        grid: document.getElementById('vault-grid'),
        counter: document.getElementById('node-count'),
        sync: document.getElementById('sync-time'),
        search: document.getElementById('geo-search'),
        dropBtn: document.getElementById('toggle-price-drop')
    };

    /**
     * INITIALISERING: Hämta guldet från JSON
     */
    async function loadVault() {
        try {
            const res = await fetch('market-data.json');
            if (!res.ok) throw new Error("Vault not found");
            propertyVault = await res.json();
            
            updateStats();
            render(propertyVault);
        } catch (err) {
            UI.counter.innerText = "OFFLINE: INGEN DATA HITTADES";
            console.error("Vault Error:", err);
        }
    }

    /**
     * RENDERING: Skapa den exklusiva grid-vyn
     */
    function render(data) {
        UI.grid.innerHTML = "";
        
        // Sortera: Aktiva först, sen dyrast
        data.sort((a,b) => (a.status === 'ACTIVE' ? -1 : 1) || b.p - a.p);

        data.forEach(item => {
            const isDrop = item.raw && item.raw.toLowerCase().includes('prissänkt');
            const card = document.createElement('div');
            card.className = 'property-card';
            
            card.innerHTML = `
                <div class="card-visual">
                    <span class="city-name">${item.s ? item.s.substring(0,3).toUpperCase() : 'SWE'}</span>
                </div>
                <span class="badge badge-${item.status.toLowerCase()}">${item.status}</span>
                ${isDrop ? '<span class="market-drop">MARKET DROP</span>' : ''}
                <div class="card-body">
                    <div class="price-tag">${item.p.toLocaleString('sv-SE')} kr</div>
                    <div class="location-primary">${item.s ? item.s.toUpperCase() : 'Sverige'}</div>
                    <div class="location-secondary">${item.a}</div>
                    <div class="card-footer">
                        <span class="source-tag">${new URL(item.u).hostname}</span>
                        <a href="${item.u}" target="_blank" class="btn-intel">VISA INTEL →</a>
                    </div>
                </div>
            `;

            card.onclick = () => window.open(item.u, '_blank');
            UI.grid.appendChild(card);
        });
    }

    /**
     * FILTRERING: Infiltrera datan i realtid
     */
    function infiltrate() {
        const query = UI.search.value.toLowerCase().trim();
        let filtered = propertyVault;

        if (showOnlyDrops) {
            filtered = filtered.filter(p => p.raw && p.raw.toLowerCase().includes('prissänkt'));
        }

        if (query) {
            filtered = filtered.filter(p => 
                p.a.toLowerCase().includes(query) || 
                (p.s && p.s.toLowerCase().includes(query)) ||
                (p.k && p.k.toLowerCase().includes(query))
            );
        }

        render(filtered);
    }

    function updateStats() {
        UI.counter.innerText = `${propertyVault.length.toLocaleString('sv-SE')} AKTIVA NODER`;
        const lastSync = new Date(); // Kan hämtas från senaste item.t om du vill vara exakt
        UI.sync.innerText = `Senaste synk: ${lastSync.toLocaleTimeString('sv-SE')}`;
    }

    // Event listeners
    UI.search.addEventListener('input', infiltrate);
    UI.dropBtn.onclick = () => {
        showOnlyDrops = !showOnlyDrops;
        UI.dropBtn.classList.toggle('active');
        infiltrate();
    };

    loadVault();
});

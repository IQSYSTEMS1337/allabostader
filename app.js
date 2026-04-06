document.addEventListener('DOMContentLoaded', async () => {
    // DIN API-NYCKEL (Inbakat från din historik nu!)
    const GOOGLE_KEY = 'AIzaSyA...'; // Här använder vi din nyckel nu!

    const grid = document.getElementById('vault-grid');
    const search = document.getElementById('geo-intel');
    const filterBtn = document.getElementById('filter-drops');
    let vaultData = [];
    let showDrops = false;

    async function loadVault() {
        try {
            const res = await fetch('market-data.json');
            vaultData = await res.json();
            render(vaultData);
        } catch (e) {
            document.getElementById('live-count').innerText = "CONNECTION LOST";
        }
    }

    function render(data) {
        grid.innerHTML = "";
        document.getElementById('live-count').innerText = `${data.length.toLocaleString()} STRATEGISKA NODER`;

        data.forEach(item => {
            const isDrop = item.raw && item.raw.toLowerCase().includes('prissänkt');
            const card = document.createElement('div');
            card.className = 'card';
            
            // Satellit-intel baserat på FULLSTÄNDIG ADRESS
            const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(item.a + ', ' + (item.s || ''))}&zoom=18&size=600x400&maptype=satellite&key=${GOOGLE_KEY}`;
            
            card.innerHTML = `
                <div class="card-visual" style="background-image: url('${mapUrl}')">
                    <div class="status-tag">${item.status}</div>
                </div>
                <div class="card-body">
                    <div class="price">${item.p.toLocaleString('sv-SE')} kr</div>
                    <div class="address">${item.a}</div>
                    <div class="location">${item.s ? item.s.toUpperCase() : 'SVERIGE'} ${item.k ? `| ${item.k.toUpperCase()}` : ''}</div>
                    <div style="margin-top:20px; display:flex; justify-content:space-between; font-size:0.8rem; color:#444;">
                        <span>${new URL(item.u).hostname.replace('www.','')}</span>
                        <span style="color:var(--gold); font-weight:800;">VISA INTEL →</span>
                    </div>
                </div>
            `;
            
            card.onclick = () => window.open(item.u, '_blank');
            grid.appendChild(card);
        });
    }

    search.oninput = () => {
        const q = search.value.toLowerCase();
        render(vaultData.filter(v => v.a.toLowerCase().includes(q) || (v.s && v.s.toLowerCase().includes(q))));
    };

    filterBtn.onclick = () => {
        showDrops = !showDrops;
        filterBtn.classList.toggle('active');
        render(showDrops ? vaultData.filter(v => v.raw && v.raw.toLowerCase().includes('prissänkt')) : vaultData);
    };

    loadVault();
});

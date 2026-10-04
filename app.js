// 1. Inisialisasi Supabase (ISI NANTI SETELAH BUAT PROJECT DI SUPABASE)
const SUPABASE_URL = 'https://xxxxx.supabase.co'; 
const SUPABASE_KEY = 'eyJhbG...xxxxx'; 
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const defaultImg = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=300&h=300&fit=crop';
let dataKafe = [];
let isSplitActive = false;

// 2. Inisialisasi Peta
const map = L.map('map', { zoomControl: false }).setView([-6.2, 106.8], 12);
L.control.zoom({ position: 'topright' }).addTo(map);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map);

// 3. Ambil Data dari Supabase
async function loadDataKafe() {
    const { data, error } = await supabase.from('kafe').select('*').order('id', { ascending: false });
    
    if (error) {
        console.error("Gagal ambil data:", error);
        document.getElementById('kafeCount').textContent = "Gagal memuat data";
        return;
    }

    dataKafe = data;
    document.getElementById('kafeCount').textContent = `${dataKafe.length} Kafe Tersedia`;
    renderPeta();
    renderList();
}

function renderPeta() {
    dataKafe.forEach(k => {
        const popupHtml = `
            <div class="popup-horizontal">
                <div class="popup-img-left"><img src="${k.foto || defaultImg}" onerror="this.src='${defaultImg}'"></div>
                <div class="popup-info-right">
                    <div style="font-weight:700;font-size:0.85rem;">${k.nama}</div>
                    <div style="font-size:0.68rem;color:#6b7280;">${k.alamat || '-'}</div>
                    <button class="popup-btn-detail" onclick="bukaDetail(${k.id})">Lihat Detail</button>
                </div>
            </div>`;
        L.marker([parseFloat(k.lat), parseFloat(k.lng)]).addTo(map).bindPopup(popupHtml, { maxWidth: 320 });
    });
}

function renderList() {
    const container = document.getElementById('kafeListContainer');
    container.innerHTML = dataKafe.map(k => `
        <div class="list-item" onclick="bukaDetail(${k.id})">
            <img src="${k.foto || defaultImg}" class="list-item-img" onerror="this.src='${defaultImg}'">
            <div class="list-item-content">
                <div class="list-item-nama">${k.nama}</div>
                <div class="list-item-alamat">${k.alamat || 'Alamat tidak tersedia'}</div>
            </div>
        </div>
    `).join('');
}

// 4. Fungsi UI (Split View & Modal)
function toggleSplitView() {
    isSplitActive = !isSplitActive;
    document.getElementById('splitView').classList.toggle('active', isSplitActive);
    document.body.classList.toggle('split-active', isSplitActive);
    setTimeout(() => map.invalidateSize(), 350);
}

function bukaDetail(id) {
    const k = dataKafe.find(item => item.id === id);
    if (!k) return;

    document.getElementById('modalImg').src = k.foto || defaultImg;
    document.getElementById('modalNama').textContent = k.nama;
    document.getElementById('modalAlamat').textContent = k.alamat || 'Alamat tidak tersedia';
    document.getElementById('modalDeskripsi').textContent = k.deskripsi || 'Tidak ada deskripsi.';
    document.getElementById('modalMaps').href = `https://www.google.com/maps?q=${k.lat},${k.lng}`;
    
    document.getElementById('modalDetail').classList.add('active');
    map.closePopup();
}

function tutupModal() {
    document.getElementById('modalDetail').classList.remove('active');
}

document.getElementById('modalDetail').addEventListener('click', function(e) {
    if (e.target === this) tutupModal();
});

// Jalankan saat halaman siap
document.addEventListener('DOMContentLoaded', loadDataKafe);
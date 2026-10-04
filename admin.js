const SUPABASE_URL = 'https://xxxxx.supabase.co'; // SAMA DENGAN app.js
const SUPABASE_KEY = 'eyJhbG...xxxxx'; // SAMA DENGAN app.js
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let mapAdmin, markerAdmin;

// 1. Cek Sesi Login
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        initMap();
        loadAdminList();
    }
}

// 2. Fungsi Login/Logout
async function login() {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        document.getElementById('loginMsg').textContent = error.message;
    } else {
        checkSession();
    }
}

async function logout() {
    await supabase.auth.signOut();
    window.location.reload();
}

// 3. Inisialisasi Peta Admin
function initMap() {
    mapAdmin = L.map('map-admin').setView([-6.2, 106.8], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapAdmin);
    
    mapAdmin.on('click', function(e) {
        document.getElementById('inputLat').value = e.latlng.lat.toFixed(7);
        document.getElementById('inputLng').value = e.latlng.lng.toFixed(7);
        if (markerAdmin) mapAdmin.removeLayer(markerAdmin);
        markerAdmin = L.marker([e.latlng.lat, e.latlng.lng]).addTo(mapAdmin);
    });
}

// 4. Preview Gambar
document.getElementById('inputFoto').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('previewFoto').src = URL.createObjectURL(file);
        document.getElementById('previewFoto').style.display = 'block';
    }
});

// 5. Simpan Data (Termasuk Upload ke Supabase Storage)
async function simpanData() {
    const nama = document.getElementById('inputNama').value;
    const alamat = document.getElementById('inputAlamat').value;
    const deskripsi = document.getElementById('inputDeskripsi').value;
    const lat = document.getElementById('inputLat').value;
    const lng = document.getElementById('inputLng').value;
    const editId = document.getElementById('editId').value;
    const fileInput = document.getElementById('inputFoto');

    if (!nama || !lat || !lng) {
        alert("Nama, Latitude, dan Longitude wajib diisi!");
        return;
    }

    let fotoUrl = null;
    // Jika ada file baru, upload ke Supabase Storage
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
        
        const { error: uploadError } = await supabase.storage
            .from('kafe-foto') // Pastikan Anda sudah buat bucket ini di Supabase
            .upload(fileName, file);

        if (uploadError) {
            alert("Gagal upload gambar: " + uploadError.message);
            return;
        }

        const { data: { publicUrl } } = supabase.storage.from('kafe-foto').getPublicUrl(fileName);
        fotoUrl = publicUrl;
    }

    if (editId) {
        // UPDATE
        const updateData = { nama, alamat, deskripsi, lat, lng };
        if (fotoUrl) updateData.foto = fotoUrl; // Hanya update foto jika ada file baru
        
        const { error } = await supabase.from('kafe').update(updateData).eq('id', editId);
        if (error) alert("Gagal update: " + error.message);
        else { alert("Berhasil diupdate!"); resetForm(); loadAdminList(); }
    } else {
        // INSERT
        const { error } = await supabase.from('kafe').insert([{ 
            nama, alamat, deskripsi, lat, lng, foto: fotoUrl 
        }]);
        if (error) alert("Gagal simpan: " + error.message);
        else { alert("Berhasil ditambahkan!"); resetForm(); loadAdminList(); }
    }
}

// 6. Load List untuk Admin
async function loadAdminList() {
    const { data, error } = await supabase.from('kafe').select('*').order('id', { ascending: false });
    if (error) return;

    const container = document.getElementById('adminList');
    container.innerHTML = data.map(k => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid #eee;">
            <div style="display:flex;align-items:center;gap:10px;">
                <img src="${k.foto || 'https://via.placeholder.com/50'}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;">
                <div>
                    <div style="font-weight:600;">${k.nama}</div>
                    <div style="font-size:0.8rem;color:#666;">${k.alamat}</div>
                </div>
            </div>
            <div>
                <button onclick="editData(${k.id})" style="background:#f39c12;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;margin-right:5px;">Edit</button>
                <button onclick="hapusData(${k.id})" style="background:#e74c3c;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;">Hapus</button>
            </div>
        </div>
    `).join('');
}

async function hapusData(id) {
    if (!confirm("Yakin ingin menghapus kafe ini?")) return;
    const { error } = await supabase.from('kafe').delete().eq('id', id);
    if (error) alert("Gagal hapus: " + error.message);
    else loadAdminList();
}

async function editData(id) {
    const { data } = await supabase.from('kafe').select('*').eq('id', id).single();
    if (!data) return;

    document.getElementById('editId').value = data.id;
    document.getElementById('inputNama').value = data.nama;
    document.getElementById('inputAlamat').value = data.alamat || '';
    document.getElementById('inputDeskripsi').value = data.deskripsi || '';
    document.getElementById('inputLat').value = data.lat;
    document.getElementById('inputLng').value = data.lng;
    document.getElementById('formTitle').textContent = '✏️ Edit Kafe';
    
    if (data.foto) {
        document.getElementById('previewFoto').src = data.foto;
        document.getElementById('previewFoto').style.display = 'block';
    }

    if (markerAdmin) mapAdmin.removeLayer(markerAdmin);
    markerAdmin = L.marker([data.lat, data.lng]).addTo(mapAdmin);
    mapAdmin.setView([data.lat, data.lng], 15);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('editId').value = '';
    document.getElementById('inputNama').value = '';
    document.getElementById('inputAlamat').value = '';
    document.getElementById('inputDeskripsi').value = '';
    document.getElementById('inputLat').value = '';
    document.getElementById('inputLng').value = '';
    document.getElementById('inputFoto').value = '';
    document.getElementById('previewFoto').style.display = 'none';
    document.getElementById('formTitle').textContent = '➕ Tambah Kafe Baru';
    if (markerAdmin) mapAdmin.removeLayer(markerAdmin);
}

document.addEventListener('DOMContentLoaded', checkSession);
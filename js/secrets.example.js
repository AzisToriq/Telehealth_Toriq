/**
 * Template konfigurasi lokal.
 * Salin file ini menjadi `js/secrets.local.js` untuk pengembangan lokal.
 * File `js/secrets.local.js` otomatis diabaikan oleh .gitignore saat push ke GitHub.
 */
window.__LOCAL_SECRETS__ = {
  apiBase: 'https://telehealth.informatikaunimus.site/api',
  mahasiswa: {
    nim: 'C2C023180',
    nama: 'Azis Toriq Maulana',
    kelas: 'E REGULER'
  },
  presets: [
    { id: 'P-001', nama: 'Budi Santoso', keterangan: 'Pasien umum', token: 'ISI_TOKEN_P001' },
    { id: 'P-002', nama: 'Siti Aminah', keterangan: 'Pasien diisi pendamping', token: 'ISI_TOKEN_P002' },
    { id: 'P-003', nama: 'Andi Wijaya', keterangan: 'Pasien umum', token: 'ISI_TOKEN_P003' }
  ]
};

/**
 * js/config.js
 * Konfigurasi terpusat PulseCare Telehealth v2.0.
 * Memisahkan sesi Demo Sandbox (publik, tanpa menyentuh server API asli)
 * dengan sesi Live API pemilik (dilindungi otorisasi password sesi).
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'pulsecare_uts_toriq_v5';
  const THEME_KEY = 'pulsecare_uts_toriq_theme_v5';
  const LIVE_AUTH_KEY = 'pulsecare_live_owner_unlocked_v5';
  const DEFAULT_API_BASE = 'https://telehealth.informatikaunimus.site/api';

  // Hash otorisasi pemilik untuk membuka akses Live API
  const OWNER_SHA256 = 'c2626e43f7ce6bd506409b5541ab6cfeb426b74b38448ac3a69c416a69e17785';
  const OWNER_FALLBACK_HASH = '34111c76a6097896';

  function syncHash(input) {
    let h1 = 0x811c9dc5;
    let h2 = 0x9e3779b9;
    const salted = `pc_v4::${input}::telehealth`;
    for (let i = 0; i < salted.length; i++) {
      const c = salted.charCodeAt(i);
      h1 = Math.imul((h1 ^ c) >>> 0, 0x01000193) >>> 0;
      h2 = (Math.imul(h2, 31) + c) >>> 0;
    }
    return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  }

  async function verifyOwnerPassword(password) {
    const raw = String(password || '').trim();
    if (!raw) return false;
    try {
      if (global.crypto && global.crypto.subtle && global.TextEncoder) {
        const buf = await global.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
        const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
        return hex === OWNER_SHA256;
      }
    } catch {}
    return syncHash(raw) === OWNER_FALLBACK_HASH;
  }

  function isLiveUnlocked() {
    try {
      return sessionStorage.getItem(LIVE_AUTH_KEY) === '1';
    } catch {
      return false;
    }
  }

  function unlockLiveSession() {
    try {
      sessionStorage.setItem(LIVE_AUTH_KEY, '1');
    } catch {}
  }

  function lockLiveSession() {
    try {
      sessionStorage.removeItem(LIVE_AUTH_KEY);
    } catch {}
    const cfg = loadRawConfig();
    cfg.mode = 'demo';
    saveRawConfig(cfg);
  }

  function getLocalSecrets() {
    return (global.__LOCAL_SECRETS__ && typeof global.__LOCAL_SECRETS__ === 'object')
      ? global.__LOCAL_SECRETS__
      : null;
  }

  function getPatientPresets() {
    const local = getLocalSecrets();
    if (local && Array.isArray(local.presets) && local.presets.length > 0) {
      return local.presets;
    }
    return [
      { id: 'P-001', nama: 'Budi Santoso', keterangan: 'Pasien umum', token: '' },
      { id: 'P-002', nama: 'Siti Aminah', keterangan: 'Pasien diisi pendamping', token: '' },
      { id: 'P-003', nama: 'Andi Wijaya', keterangan: 'Pasien umum', token: '' }
    ];
  }

  const UTS_FEATURE_FALLBACK = [
    { kode: 'buat', label: 'Membuat self-assessment (dengan persetujuan)', actionHash: '#guide/FRM-KELUHAN', actionText: 'Buat Baru' },
    { kode: 'simpan_draf', label: 'Menyimpan draf / melanjutkan pengisian', actionHash: '#history?filter=draft', actionText: 'Buka Draf' },
    { kode: 'validasi', label: 'Memeriksa jawaban sebelum kirim (validate)', actionHash: '#history?filter=draft', actionText: 'Periksa Draf' },
    { kode: 'kirim', label: 'Mengirim formulir keluhan (FRM-KELUHAN)', actionHash: '#guide/FRM-KELUHAN', actionText: 'Isi & Kirim' },
    { kode: 'riwayat', label: 'Menampilkan riwayat berdasarkan NIM', actionHash: '#history', actionText: 'Buka Riwayat' },
    { kode: 'hasil', label: 'Menampilkan hasil assessment', actionHash: '#history', actionText: 'Lihat Hasil' },
    { kode: 'status', label: 'Menampilkan tracking status & timeline', actionHash: '#history', actionText: 'Pantau Status' },
    { kode: 'klarifikasi', label: 'Menjawab klarifikasi petugas', actionHash: '#history?filter=perlu_klarifikasi', actionText: 'Cek Klarifikasi' },
    { kode: 'tindak_lanjut', label: 'Menampilkan arahan tindak lanjut dosen', actionHash: '#history?filter=sudah_ditinjau', actionText: 'Cek Tindak Lanjut' },
    { kode: 'gad7', label: 'Bonus: Mengirim kuesioner kecemasan GAD-7', actionHash: '#guide/FRM-GAD7', actionText: 'Isi GAD-7' }
  ];

  function getDefaultConfig() {
    const local = getLocalSecrets();
    const presets = getPatientPresets();
    const firstValidToken = (presets.find((p) => p.token && !p.token.startsWith('ISI_')) || {}).token || '';

    return {
      // Default selalu dimulai di Mode Demo yang aman sampai pemilik membuka sesi Live dengan password
      mode: 'demo',
      apiBase: (local?.apiBase || DEFAULT_API_BASE).replace(/\/+$/, ''),
      token: firstValidToken,
      liveMahasiswa: {
        nim: (local?.mahasiswa?.nim || 'C2C023180').toUpperCase(),
        nama: local?.mahasiswa?.nama || 'Azis Toriq Maulana',
        kelas: local?.mahasiswa?.kelas || 'E REGULER'
      },
      demoMahasiswa: {
        nim: 'DEMO2026',
        nama: 'Pengunjung Demo',
        kelas: 'SANDBOX'
      },
      autoSave: true
    };
  }

  function loadRawConfig() {
    const defaults = getDefaultConfig();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      return {
        mode: parsed.mode === 'live' ? 'live' : 'demo',
        apiBase: (parsed.apiBase || defaults.apiBase).replace(/\/+$/, ''),
        token: String(parsed.token !== undefined ? parsed.token : defaults.token).trim(),
        liveMahasiswa: {
          nim: (parsed.liveMahasiswa?.nim || defaults.liveMahasiswa.nim).toUpperCase().trim(),
          nama: (parsed.liveMahasiswa?.nama || defaults.liveMahasiswa.nama).trim(),
          kelas: (parsed.liveMahasiswa?.kelas || defaults.liveMahasiswa.kelas).trim()
        },
        demoMahasiswa: {
          nim: (parsed.demoMahasiswa?.nim || defaults.demoMahasiswa.nim).toUpperCase().trim(),
          nama: (parsed.demoMahasiswa?.nama || defaults.demoMahasiswa.nama).trim(),
          kelas: (parsed.demoMahasiswa?.kelas || defaults.demoMahasiswa.kelas).trim()
        },
        autoSave: parsed.autoSave !== false
      };
    } catch {
      return defaults;
    }
  }

  function saveRawConfig(raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
  }

  function loadConfig() {
    const raw = loadRawConfig();
    const effectiveMode = (raw.mode === 'live' && isLiveUnlocked()) ? 'live' : 'demo';
    return {
      ...raw,
      mode: effectiveMode,
      mahasiswa: effectiveMode === 'live' ? { ...raw.liveMahasiswa } : { ...raw.demoMahasiswa }
    };
  }

  function saveConfig(update) {
    const cur = loadRawConfig();
    const nextMode = (update.mode === 'live' && isLiveUnlocked()) ? 'live' : 'demo';
    const next = {
      ...cur,
      mode: nextMode,
      apiBase: (update.apiBase || cur.apiBase || DEFAULT_API_BASE).trim().replace(/\/+$/, ''),
      token: update.token !== undefined ? String(update.token).trim() : cur.token,
      autoSave: update.autoSave !== undefined ? Boolean(update.autoSave) : cur.autoSave
    };

    if (update.mahasiswa) {
      const cleanMhs = {
        nim: (update.mahasiswa.nim || '').toUpperCase().trim(),
        nama: (update.mahasiswa.nama || '').trim(),
        kelas: (update.mahasiswa.kelas || '').trim()
      };
      if (nextMode === 'live') next.liveMahasiswa = cleanMhs;
      else next.demoMahasiswa = cleanMhs;
    }
    if (update.liveMahasiswa && isLiveUnlocked()) {
      next.liveMahasiswa = {
        nim: (update.liveMahasiswa.nim || '').toUpperCase().trim(),
        nama: (update.liveMahasiswa.nama || '').trim(),
        kelas: (update.liveMahasiswa.kelas || '').trim()
      };
    }
    if (update.demoMahasiswa) {
      next.demoMahasiswa = {
        nim: (update.demoMahasiswa.nim || '').toUpperCase().trim(),
        nama: (update.demoMahasiswa.nama || '').trim(),
        kelas: (update.demoMahasiswa.kelas || '').trim()
      };
    }

    saveRawConfig(next);
    return loadConfig();
  }

  function resetConfig() {
    localStorage.removeItem(STORAGE_KEY);
    return loadConfig();
  }

  function isConfigured(cfg) {
    const c = cfg || loadConfig();
    if (c.mode === 'demo') {
      return Boolean(c.mahasiswa.nim && c.mahasiswa.nama && c.mahasiswa.kelas);
    }
    return Boolean(
      isLiveUnlocked() &&
      c.apiBase &&
      c.token &&
      c.mahasiswa.nim &&
      c.mahasiswa.nim.length >= 5 &&
      c.mahasiswa.nama &&
      c.mahasiswa.nama.length >= 3 &&
      c.mahasiswa.kelas
    );
  }

  function validateMahasiswaInput(mhs) {
    const errors = [];
    const nim = (mhs.nim || '').trim().toUpperCase();
    const nama = (mhs.nama || '').trim();
    const kelas = (mhs.kelas || '').trim();
    if (!/^[A-Z0-9]{5,20}$/.test(nim)) {
      errors.push('NIM harus terdiri dari 5–20 karakter huruf/angka tanpa spasi.');
    }
    if (nama.length < 3 || nama.length > 100) {
      errors.push('Nama lengkap harus 3–100 karakter.');
    }
    if (!kelas || kelas.length > 20) {
      errors.push('Kelas wajib diisi (maks. 20 karakter, mis. E REGULER).');
    }
    return errors;
  }

  function getTheme() { return localStorage.getItem(THEME_KEY) || 'light'; }
  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  global.TelehealthConfig = {
    DEFAULT_API_BASE,
    UTS_FEATURE_FALLBACK,
    verifyOwnerPassword,
    isLiveUnlocked,
    unlockLiveSession,
    lockLiveSession,
    getPatientPresets,
    getDefaultConfig,
    loadConfig,
    saveConfig,
    resetConfig,
    isConfigured,
    validateMahasiswaInput,
    getTheme,
    setTheme
  };
})(window);

/**
 * js/views.js
 * Seluruh halaman Portal PulseCare Telehealth v2.0:
 * Welcome Landing (Interactive Preview), Beranda (Personal Greeting), Analitik Klinis,
 * Petunjuk & Persetujuan, Split-Screen Form Wizard, Periksa & Kirim, Konfirmasi,
 * Riwayat, Hasil Assessment, Tracking Status + Klarifikasi + Tindak Lanjut, UTS, & Pengaturan.
 */
(function (global) {
  'use strict';

  const C = () => global.TelehealthConfig;
  const U = () => global.TelehealthUtils;
  const API = () => global.TelehealthAPI;
  const FE = () => global.TelehealthFormEngine;
  const CH = () => global.TelehealthCharts;

  function renderSkeleton(rows = 3) {
    return `
      <div class="stack-md">
        <div class="skeleton" style="height:155px;"></div>
        <div class="grid-2">
          ${Array.from({ length: rows }).map(() => `<div class="skeleton" style="height:115px;"></div>`).join('')}
        </div>
      </div>
    `;
  }

  function renderErrorCard(err, retryFn) {
    const esc = U().escapeHtml;
    const statusBadge = err?.status ? `<span class="badge badge-danger mono">HTTP ${esc(err.status)}</span>` : '';
    const html = `
      <div class="card">
        <div class="alert alert-danger" style="margin-bottom:16px;">
          ${U().icon('alertTriangle')}
          <div class="alert-body">
            <div class="alert-title" style="display:flex;align-items:center;gap:8px;">
              <span>Gagal Memuat Data</span> ${statusBadge}
            </div>
            <p>${esc(err?.message || 'Terjadi kesalahan saat menghubungi API.')}</p>
          </div>
        </div>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" id="btn-error-retry">${U().icon('refresh')} Coba Lagi</button>
          <button type="button" class="btn btn-indigo" id="btn-error-demo">${U().icon('sparkles')} Coba Mode Demo</button>
          <a href="#settings" class="btn btn-secondary">${U().icon('settings')} Pengaturan API</a>
        </div>
      </div>
    `;
    return {
      html,
      bind: (root, app) => {
        root.querySelector('#btn-error-retry')?.addEventListener('click', retryFn);
        root.querySelector('#btn-error-demo')?.addEventListener('click', () => {
          const cfg = C().loadConfig();
          cfg.mode = 'demo';
          C().saveConfig(cfg);
          if (app) { app.syncChromeState(); app.toast('Beralih ke Mode Demo Interaktif.', 'info'); }
          location.hash = '#home';
        });
      }
    };
  }

  function extractGadPoints(items) {
    return (items || [])
      .filter((it) => {
        const fid = String(it.form?.id || it.form_id || '').toUpperCase();
        return fid.includes('GAD') && (it.skor?.total !== undefined || (typeof it.judul === 'string' && /skor\s+(\d+)/i.test(it.judul)));
      })
      .map((it) => {
        let score = it.skor?.total;
        if (score === undefined && typeof it.judul === 'string') {
          const m = it.judul.match(/skor\s+(\d+)/i);
          if (m) score = Number(m[1]);
        }
        return {
          id: it.id,
          date: it.dikirim_pada || it.dibuat_pada,
          label: `${it.id} (${U().formatShortDate(it.dikirim_pada || it.dibuat_pada)})`,
          score: Number(score ?? 0)
        };
      })
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  }

  /* ========================================================================
     0. WELCOME LANDING PAGE (#welcome)
     ======================================================================== */
  function renderWelcomeView(app) {
    const cfg = C().loadConfig();
    const esc = U().escapeHtml;
    const hasLiveToken = Boolean(cfg.token);

    app.setHeader('Selamat Datang', '', null, { isLanding: true });

    const showcasePanels = {
      wizard: {
        badge: 'Split-Screen Form Engine',
        title: 'Formulir Bercabang & Auto-Save Real-Time',
        desc: 'Setiap pertanyaan dirender dinamis dari definisi REST API. Jawaban Anda langsung mengatur pertanyaan lanjutan (show_if), membedakan data pengukuran objektif dari laporan subjektif, serta menyimpan draf otomatis.',
        bullets: [
          'Menjawab "Tidak" pada keluhan otomatis menyingkat 4 bagian menjadi 3 bagian.',
          'Opsi eksklusif "Tidak ada" otomatis melepas pilihan riwayat penyakit lain.',
          'Membedakan secara tegas jawaban "Tidak" dengan "Belum diisi" (null).'
        ],
        mockHtml: `
          <div class="showcase-mock-ui">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span class="badge badge-primary mono">FRM-KELUHAN v1.0</span>
              <span class="badge badge-info">${U().icon('gitBranch')} 3 dari 4 bagian aktif</span>
            </div>
            <div style="font-size:0.86rem;font-weight:800;margin-bottom:8px;">Suhu tubuh terakhir yang diukur</div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:10px;background:var(--bg-subtle);border:1px solid rgba(14,165,233,0.35);margin-bottom:10px;">
              <span class="mono fw-700">36.8</span>
              <span class="badge badge-info">${U().icon('thermometer')} °C · Pengukuran</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.76rem;color:var(--text-muted);margin-bottom:5px;">
              <span>Kelengkapan Kolom Wajib</span><span class="mono fw-700">100%</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:100%;"></div></div>
          </div>
        `
      },
      gad7: {
        badge: 'Instrumen Klinis GAD-7',
        title: 'Skor Kecemasan Otomatis & Grafik Tren',
        desc: 'Dilengkapi instrumen tervalidasi Generalized Anxiety Disorder-7 (0–21). Sistem menghitung kategori gejala otomatis, menampilkan perbandingan perubahan skor (delta) antar pengisian, serta grafik tren klinis.',
        bullets: [
          'Ambang kategori transparan: Minimal (0–4), Ringan (5–9), Sedang (10–14), Berat (15–21).',
          'Perbandingan otomatis antar sesi (contoh: Skor 7 → 10, naik +3 poin).',
          'Selalu disertai pernyataan bahwa hasil adalah bahan peninjauan, bukan diagnosis.'
        ],
        mockHtml: `
          <div class="showcase-mock-ui">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <span class="badge badge-indigo">GAD-7 · 2 Minggu Terakhir</span>
              <span class="badge badge-warning mono">Skor 10 / 21 · Sedang</span>
            </div>
            <div class="gad-scale-bar" style="margin-top:0;margin-bottom:12px;">
              <div class="gad-segment seg-minimal">0–4</div>
              <div class="gad-segment seg-ringan">5–9</div>
              <div class="gad-segment seg-sedang active">10–14</div>
              <div class="gad-segment seg-berat">15–21</div>
            </div>
            <div style="padding:10px 12px;border-radius:10px;background:var(--bg-subtle);font-size:0.78rem;display:flex;justify-content:space-between;">
              <span class="text-muted">Perbandingan sebelumnya</span>
              <strong class="mono" style="color:var(--warning-text);">7 → 10 (+3)</strong>
            </div>
          </div>
        `
      },
      tracking: {
        badge: 'Pelacakan & Tindak Lanjut',
        title: 'Tracking 2-Arah, Klarifikasi & Jadwal .ics',
        desc: 'Status pengiriman dan status peninjauan petugas dipisahkan secara jelas. Pasien dapat membalas pertanyaan klarifikasi dari tenaga kesehatan, melihat timeline kronologis, dan menyimpan jadwal konsultasi ke kalender.',
        bullets: [
          'Status pengiriman (Draf / Terkirim) terpisah dari status peninjauan petugas.',
          'Auto-Sync berkala tiap 30 detik & balasan klarifikasi langsung ke API.',
          'Ekspor resume medis ke PDF/JSON dan jadwal konsultasi ke file kalender (.ics).'
        ],
        mockHtml: `
          <div class="showcase-mock-ui">
            <div class="badge-cluster" style="margin-bottom:12px;">
              <span class="badge badge-success">Terkirim</span>
              <span class="badge badge-success">Sudah Ditinjau</span>
              <span class="badge badge-primary">Jadwalkan Konsultasi</span>
            </div>
            <div style="padding:11px 12px;border-radius:11px;background:var(--success-bg);border:1px solid var(--success-border);font-size:0.8rem;">
              <div class="fw-700" style="color:var(--success-text);">Arahan Petugas · Ns. Rina Kartika, S.Kep.</div>
              <div style="margin-top:3px;color:var(--text-secondary);">Disarankan konsultasi telemedisin lanjutan untuk evaluasi pola tidur.</div>
            </div>
          </div>
        `
      }
    };

    app.root.innerHTML = `
      <div class="welcome-wrap">
        <!-- 1. Centered Spectacular Hero -->
        <section class="welcome-hero">
          <div class="welcome-hero-inner">
            <div class="welcome-pill">
              ${U().icon('sparkles')}
              <span>Portal Self-Assessment Telehealth · REST API v2.0</span>
            </div>
            <h1 class="welcome-title">Kenali &amp; Sampaikan Keluhan Anda Sebelum Konsultasi Medis</h1>
            <p class="welcome-lead">
              <strong>PulseCare Telehealth</strong> adalah aplikasi web pasien untuk mengisi formulir keluhan pra-konsultasi, skrining kecemasan tervalidasi (<strong>GAD-7</strong>), memantau status peninjauan petugas secara real-time, menjawab klarifikasi, hingga menerima jadwal tindak lanjut.
            </p>

            <div class="welcome-cta-group">
              <button type="button" class="btn btn-hero-white btn-lg" id="btn-enter-demo">
                ${U().icon('sparkles')} Coba Demo Interaktif (Publik)
              </button>
              <button type="button" class="btn btn-hero-glass btn-lg" id="btn-enter-live">
                ${C().isLiveUnlocked() ? U().icon('unlock') : U().icon('lock')} Masuk Pemilik (${esc(cfg.liveMahasiswa?.nama || 'Azis Toriq Maulana')})
              </button>
            </div>

            <div class="welcome-metrics">
              <div class="welcome-metric-box">
                <div class="welcome-metric-val">2 Instrumen</div>
                <div class="welcome-metric-lbl">Keluhan &amp; GAD-7</div>
              </div>
              <div class="welcome-metric-box">
                <div class="welcome-metric-val">show_if</div>
                <div class="welcome-metric-lbl">Percabangan Dinamis</div>
              </div>
              <div class="welcome-metric-box">
                <div class="welcome-metric-val">Real-Time</div>
                <div class="welcome-metric-lbl">Status &amp; Klarifikasi</div>
              </div>
              <div class="welcome-metric-box">
                <div class="welcome-metric-val">10 / 10</div>
                <div class="welcome-metric-lbl">Bukti Fitur API v2.0</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Clinical Disclaimer -->
        <div class="alert alert-warning" style="margin-bottom:0;">
          ${U().icon('shieldAlert')}
          <div class="alert-body">
            <div class="alert-title">Pernyataan Medis Penting</div>
            <p>Hasil self-assessment pada aplikasi ini <strong>bukan diagnosis medis</strong>. Seluruh jawaban yang dikirim digunakan sebagai bahan persiapan konsultasi dan akan ditinjau oleh tenaga kesehatan berwenang.</p>
          </div>
        </div>

        <!-- 2. Interactive Showcase Widget -->
        <section id="sec-preview">
          <div class="welcome-section-head">
            <h2>Pratinjau Interaktif Aplikasi</h2>
            <p>Klik tab di bawah untuk melihat bagaimana modul formulir, skrining GAD-7, dan pelacakan status bekerja sebelum Anda masuk.</p>
          </div>
          <div class="showcase-card">
            <div class="showcase-tabs" id="showcase-tabs">
              <button type="button" class="showcase-tab active" data-tab="wizard">${U().icon('clipboard')} Formulir Bercabang</button>
              <button type="button" class="showcase-tab" data-tab="gad7">${U().icon('brain')} Skor GAD-7 &amp; Tren</button>
              <button type="button" class="showcase-tab" data-tab="tracking">${U().icon('activity')} Tracking &amp; Tindak Lanjut</button>
            </div>
            <div id="showcase-stage-mount"></div>
          </div>
        </section>

        <!-- 3. 4-Step Workflow -->
        <section id="sec-workflow">
          <div class="welcome-section-head">
            <h2>Alur Penggunaan Pasien</h2>
            <p>Dirancang sederhana, jelas, dan transparan dari mulai mengisi hingga menerima arahan tenaga kesehatan.</p>
          </div>
          <div class="flow-grid">
            <div class="flow-step-card">
              <div class="flow-num">01</div>
              <h4>Petunjuk &amp; Persetujuan</h4>
              <p>Baca tujuan formulir, pahami batasan non-diagnosis, lalu centang persetujuan penggunaan data.</p>
            </div>
            <div class="flow-step-card">
              <div class="flow-num">02</div>
              <h4>Isi Bertahap &amp; Draf</h4>
              <p>Pertanyaan menyesuaikan jawaban Anda otomatis dan tersimpan sebagai draf kapan saja.</p>
            </div>
            <div class="flow-step-card">
              <div class="flow-num">03</div>
              <h4>Periksa &amp; Kirim</h4>
              <p>Validasi kelengkapan wajib via API, cek ringkasan jawaban, lalu kirim untuk ditinjau.</p>
            </div>
            <div class="flow-step-card">
              <div class="flow-num">04</div>
              <h4>Status &amp; Tindak Lanjut</h4>
              <p>Pantau timeline peninjauan, jawab klarifikasi petugas, dan simpan jadwal konsultasi (.ics).</p>
            </div>
          </div>
        </section>

        <!-- 4. Feature Bento Grid -->
        <section id="sec-features">
          <div class="welcome-section-head">
            <h2>Keunggulan PulseCare Telehealth</h2>
            <p>Antarmuka modern terpusat dengan dukungan penuh seluruh spesifikasi REST API Telehealth v2.0.</p>
          </div>
          <div class="feature-bento">
            <div class="feature-card">
              <div class="form-icon-box">${U().icon('clipboard')}</div>
              <h3>Split-Screen Form Wizard</h3>
              <p>Pengisian bertahap lengkap dengan panel <em>Live Clinical Preview</em>, validasi per kolom, dan pembeda data subjektif vs pengukuran vital.</p>
            </div>
            <div class="feature-card">
              <div class="form-icon-box" style="background:var(--indigo-bg);color:var(--indigo-text);">${U().icon('brain')}</div>
              <h3>Skrining GAD-7 &amp; Delta Skor</h3>
              <p>Hitung skor kecemasan 0–21 otomatis beserta ambang kategori, kurva perkembangan, dan perbandingan perubahan antar pengisian.</p>
            </div>
            <div class="feature-card">
              <div class="form-icon-box" style="background:var(--info-bg);color:var(--info-text);">${U().icon('barChart')}</div>
              <h3>Analitik Klinis Interaktif</h3>
              <p>Grafik distribusi status laporan, komposisi formulir, serta tabel otomatis riwayat suhu tubuh dan berat badan pasien.</p>
            </div>
            <div class="feature-card">
              <div class="form-icon-box" style="background:var(--warning-bg);color:var(--warning-text);">${U().icon('message')}</div>
              <h3>Tracking &amp; Klarifikasi 2-Arah</h3>
              <p>Status pengiriman &amp; peninjauan terpisah, Auto-Sync 30 detik, timeline kronologis, dan form balasan klarifikasi.</p>
            </div>
            <div class="feature-card">
              <div class="form-icon-box" style="background:var(--success-bg);color:var(--success-text);">${U().icon('calendar')}</div>
              <h3>Resume PDF &amp; Kalender .ics</h3>
              <p>Cetak hasil assessment rapi untuk dokumentasi, ekspor data JSON, dan tambahkan jadwal konsultasi ke kalender pribadi.</p>
            </div>
            <div class="feature-card">
              <div class="form-icon-box" style="background:var(--neutral-bg);color:var(--text-primary);">${U().icon('terminal')}</div>
              <h3>Live API Inspector &amp; Sandbox</h3>
              <p>Pantau payload request &amp; response JSON secara real-time, plus Mode Demo Sandbox agar publik bisa langsung mencoba.</p>
            </div>
          </div>
        </section>

        <!-- 5. Dual Access Cards (Live API vs Public Visitor Demo) -->
        <section id="sec-access">
          <div class="welcome-section-head">
            <h2>Pilih Cara Masuk Aplikasi</h2>
            <p>Gunakan akun Live API jika Anda memiliki Token Bearer dosen, atau pilih Mode Demo Interaktif untuk langsung bereksplorasi.</p>
          </div>
          <div class="access-dual-grid">
            <div class="access-card demo-accent">
              <span class="badge badge-indigo" style="width:fit-content;">Akses Terbuka · Pure Sandbox</span>
              <h3 class="card-title" style="font-size:1.2rem;">Mode Demo Interaktif (Untuk Pengunjung)</h3>
              <p class="text-sm text-muted" style="margin:0;">
                Berjalan <strong>100% lokal di browser</strong> tanpa menyentuh server API asli. Pengunjung dapat langsung mengetes formulir bercabang, skor GAD-7, grafik analitik, hingga simulasi klarifikasi &amp; tindak lanjut petugas.
              </p>
              <div style="margin-top:auto;padding-top:10px;">
                <button type="button" class="btn btn-indigo btn-block btn-lg" id="btn-bottom-demo">
                  ${U().icon('sparkles')} Mulai Demo Sekarang
                </button>
              </div>
            </div>

            <div class="access-card">
              <span class="badge badge-primary" style="width:fit-content;">${C().isLiveUnlocked() ? U().icon('unlock') : U().icon('lock')} Khusus Pemilik · Live API</span>
              <h3 class="card-title" style="font-size:1.2rem;">Portal Live API (${esc(cfg.liveMahasiswa?.nama || 'Azis Toriq Maulana')})</h3>
              <p class="text-sm text-muted" style="margin:0;">
                Terhubung langsung ke server resmi <code class="mono">telehealth.informatikaunimus.site/api</code> dengan Token Bearer dan dilindungi password pemilik agar data asli tetap aman.
              </p>
              <div style="margin-top:auto;padding-top:10px;">
                <button type="button" class="btn btn-primary btn-block btn-lg" id="btn-bottom-live">
                  ${C().isLiveUnlocked() ? U().icon('unlock') : U().icon('lock')} ${C().isLiveUnlocked() ? 'Buka Beranda Live API' : 'Verifikasi Password Pemilik'} ${U().icon('arrowRight')}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    // Render interactive showcase tab
    const stageMount = app.root.querySelector('#showcase-stage-mount');
    function renderShowcaseTab(key) {
      const p = showcasePanels[key] || showcasePanels.wizard;
      stageMount.innerHTML = `
        <div class="showcase-stage">
          <div>
            <span class="badge badge-primary" style="margin-bottom:10px;">${esc(p.badge)}</span>
            <h3 style="margin:0 0 8px;font-size:1.2rem;font-weight:800;">${esc(p.title)}</h3>
            <p class="text-sm text-muted" style="margin:0 0 12px;">${esc(p.desc)}</p>
            <ul style="margin:0;padding-left:18px;display:grid;gap:6px;font-size:0.83rem;color:var(--text-secondary);">
              ${p.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}
            </ul>
          </div>
          <div>${p.mockHtml}</div>
        </div>
      `;
    }
    renderShowcaseTab('wizard');

    app.root.querySelectorAll('#showcase-tabs .showcase-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        app.root.querySelectorAll('#showcase-tabs .showcase-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        renderShowcaseTab(tab.dataset.tab);
      });
    });

    app.root.querySelector('#btn-enter-live')?.addEventListener('click', () => app.enterLivePortal());
    app.root.querySelector('#btn-bottom-live')?.addEventListener('click', () => app.enterLivePortal());
    app.root.querySelector('#btn-enter-demo')?.addEventListener('click', () => app.openDemoEntryModal());
    app.root.querySelector('#btn-bottom-demo')?.addEventListener('click', () => app.openDemoEntryModal());
  }

  /* ========================================================================
     1. BERANDA — PERSONAL GREETING (HALO AZIS TORIQ MAULANA!)
     ======================================================================== */
  async function renderHomeView(app) {
    const cfg = C().loadConfig();
    if (!C().isConfigured(cfg)) { location.hash = '#settings'; return; }

    const esc = U().escapeHtml;
    app.setHeader('Beranda Pasien', `Ringkasan laporan, grafik analitik & status UTS · NIM ${cfg.mahasiswa.nim}`, null);
    app.root.innerHTML = renderSkeleton(4);

    try {
      const [meRes, formsRes, listRes, utsRes] = await Promise.all([
        API().getMe(cfg.mahasiswa.nim),
        API().getForms(),
        API().listAssessments({ nim: cfg.mahasiswa.nim }).catch(() => ({ data: [] })),
        API().getUtsStatus(cfg.mahasiswa.nim).catch((e) => (e.status === 404 ? { data: null } : null))
      ]);

      const me = meRes.data || {};
      const stats = me.statistik || {};
      const forms = Array.isArray(formsRes.data) ? formsRes.data : [];
      const historyItems = Array.isArray(listRes.data) ? listRes.data : [];
      const uts = utsRes?.data || null;

      app.state.patient = me;
      app.syncChromeState();
      app.updateClarificationBadges(stats.perlu_klarifikasi || 0);
      app.setConnectionStatus(cfg.mode === 'demo' ? 'demo' : 'online', cfg.mode === 'demo' ? 'Mode Demo' : `Live · ${me.id || 'API'}`);

      const achieved = uts?.bukti_fitur?.tercapai ?? 0;
      const totalFeat = uts?.bukti_fitur?.total ?? 10;
      const featPct = totalFeat > 0 ? Math.round((achieved / totalFeat) * 100) : 0;
      app.updateUtsBadge(achieved, totalFeat);

      const radius = 38;
      const circ = 2 * Math.PI * radius;
      const dashOffset = circ - (featPct / 100) * circ;

      const gadPoints = extractGadPoints(historyItems);
      const recentItems = historyItems.slice(0, 4);

      const formsHtml = forms.length > 0 ? forms.map((f) => {
        const isBonus = String(f.id || '').toUpperCase().includes('GAD');
        const est = f.estimasi_menit || f.estimasi_waktu || 5;
        const resultType = f.jenis_hasil || f.jenis || (isBonus ? 'Skor 0–21 + kategori' : 'Ringkasan jawaban');
        return `
          <div class="form-launch-card">
            <div style="display:flex;gap:14px;align-items:flex-start;">
              <div class="form-icon-box" style="${isBonus ? 'background:var(--indigo-bg);color:var(--indigo-text);' : ''}">
                ${isBonus ? U().icon('brain') : U().icon('clipboard')}
              </div>
              <div style="flex:1;">
                <div class="badge-cluster" style="margin-bottom:6px;">
                  <span class="badge ${isBonus ? 'badge-indigo' : 'badge-primary'}">${isBonus ? 'Instrumen Bonus' : 'Formulir Wajib'}</span>
                  <span class="badge badge-neutral mono">${esc(f.id)}</span>
                </div>
                <h3 class="form-launch-title">${esc(f.judul || f.title || f.id)}</h3>
                ${f.deskripsi ? `<p class="card-desc">${esc(f.deskripsi)}</p>` : ''}
                <div class="form-launch-meta" style="margin-top:8px;">
                  <span>${U().icon('clock')} ±${esc(est)} menit</span>
                  <span>•</span>
                  <span>Hasil: <strong>${esc(resultType)}</strong></span>
                </div>
              </div>
            </div>
            <div class="btn-row">
              <a href="#guide/${encodeURIComponent(f.id)}" class="btn btn-primary btn-sm">
                Mulai Self-Assessment ${U().icon('arrowRight')}
              </a>
            </div>
          </div>
        `;
      }).join('') : `<div class="empty-mini">Belum ada formulir tersedia.</div>`;

      app.root.innerHTML = `
        <div class="hero-card">
          <div class="hero-grid">
            <div>
              <div class="hero-eyebrow">${U().icon('activity')} ${cfg.mode === 'demo' ? 'Mode Demo Sandbox Interaktif' : 'Portal Self-Assessment Telehealth v2.0'}</div>
              <h2 class="hero-title">Halo, ${esc(cfg.mahasiswa.nama)}</h2>
              <div class="hero-meta">
                <span>NIM: <strong class="mono">${esc(cfg.mahasiswa.nim)}</strong></span>
                <span>Kelas: <strong>${esc(cfg.mahasiswa.kelas)}</strong></span>
                <span>Akun Pasien API: <strong>${esc(me.nama || 'Pasien')} (${esc(me.id || '—')})</strong></span>
              </div>
              <div class="hero-cta-row">
                <a href="#guide/FRM-KELUHAN" class="btn btn-hero-white">${U().icon('plus')} Mulai Formulir Keluhan</a>
                <a href="#guide/FRM-GAD7" class="btn btn-hero-glass">${U().icon('brain')} Kuesioner GAD-7 (Bonus)</a>
                <a href="#analytics" class="btn btn-hero-glass">${U().icon('barChart')} Analitik Klinis</a>
              </div>
            </div>
            <div class="hero-pill-group">
              <div class="hero-glass-box">
                <div class="hero-glass-label">Pasien Simulasi</div>
                <div class="hero-glass-val">${esc(me.id || 'P-001')}</div>
                <div class="hero-glass-sub">${esc(me.nama || '—')} · ${esc(me.no_rm || '—')}</div>
              </div>
              <div class="hero-glass-box">
                <div class="hero-glass-label">Progress UTS</div>
                <div class="hero-glass-val">${achieved} / ${totalFeat} Fitur</div>
                <div class="hero-glass-sub">${uts?.penilaian?.status?.label || 'Tercatat Otomatis'}</div>
              </div>
            </div>
          </div>
        </div>

        ${(stats.perlu_klarifikasi || 0) > 0 ? `
          <div class="alert alert-warning">
            ${U().icon('message')}
            <div class="alert-body">
              <div class="alert-title">Perhatian: ${stats.perlu_klarifikasi} Laporan Membutuhkan Klarifikasi Petugas</div>
              <p>Petugas kesehatan meminta keterangan tambahan. Jawab segera agar peninjauan dapat dilanjutkan.</p>
            </div>
            <a href="#history?filter=perlu_klarifikasi" class="btn btn-warning btn-sm">Jawab Klarifikasi</a>
          </div>
        ` : ''}

        <div class="kpi-grid">
          <button type="button" class="kpi-card" data-jump="#history">
            <div class="kpi-top">
              <span class="kpi-label">Total Laporan</span>
              <span class="kpi-icon" style="background:var(--primary-50);color:var(--primary-600);">${U().icon('clipboard')}</span>
            </div>
            <div class="kpi-val">${stats.total ?? historyItems.length}</div>
            <span class="text-muted text-sm">Filter NIM ${esc(cfg.mahasiswa.nim)}</span>
          </button>

          <button type="button" class="kpi-card" data-jump="#history?filter=draft">
            <div class="kpi-top">
              <span class="kpi-label">Draf Tersimpan</span>
              <span class="kpi-icon" style="background:var(--neutral-bg);color:var(--neutral-text);">${U().icon('save')}</span>
            </div>
            <div class="kpi-val">${stats.draf ?? 0}</div>
            <span class="text-muted text-sm">Siap dilanjutkan</span>
          </button>

          <button type="button" class="kpi-card" data-jump="#history?filter=diproses">
            <div class="kpi-top">
              <span class="kpi-label">Dalam Peninjauan</span>
              <span class="kpi-icon" style="background:var(--info-bg);color:var(--info-text);">${U().icon('clock')}</span>
            </div>
            <div class="kpi-val">${(stats.menunggu ?? 0) + (stats.sedang_ditinjau ?? 0)}</div>
            <span class="text-muted text-sm">Antrean petugas</span>
          </button>

          <button type="button" class="kpi-card" data-jump="#history?filter=sudah_ditinjau">
            <div class="kpi-top">
              <span class="kpi-label">Selesai Ditinjau</span>
              <span class="kpi-icon" style="background:var(--success-bg);color:var(--success-text);">${U().icon('check')}</span>
            </div>
            <div class="kpi-val">${stats.sudah_ditinjau ?? 0}</div>
            <span class="text-muted text-sm">Ada tindak lanjut</span>
          </button>
        </div>

        <div class="charts-grid">
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Tren Skor Kecemasan (GAD-7)</h3>
                <p class="card-desc">Visualisasi skor 0–21 dari riwayat pengisian Anda (bukan diagnosis)</p>
              </div>
              <a href="#analytics" class="btn btn-ghost btn-sm">Analitik ${U().icon('arrowRight')}</a>
            </div>
            ${gadPoints.length > 0 ? `
              <div class="chart-canvas-wrap"><canvas id="home-gad-chart"></canvas></div>
            ` : `
              <div class="empty-mini" style="padding:46px 16px;">
                Belum ada laporan <strong>GAD-7</strong> terkirim untuk menampilkan grafik tren.<br/>
                <a href="#guide/FRM-GAD7" class="btn btn-secondary btn-sm" style="margin-top:12px;">Isi Kuesioner GAD-7</a>
              </div>
            `}
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Distribusi Status Laporan</h3>
                <p class="card-desc">Ringkasan proporsi draf, proses, klarifikasi &amp; selesai</p>
              </div>
              <span class="badge ${cfg.mode === 'demo' ? 'badge-indigo' : 'badge-primary'} mono">${cfg.mode === 'demo' ? 'Sandbox' : 'Live API'}</span>
            </div>
            <div class="chart-canvas-wrap"><canvas id="home-status-chart"></canvas></div>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="stack-lg">
            <section class="stack-md">
              <div>
                <h3 class="card-title">Pilih Formulir Self-Assessment</h3>
                <p class="card-desc">Seluruh pertanyaan dimuat secara dinamis dari server API</p>
              </div>
              <div class="forms-stack">${formsHtml}</div>
            </section>

            <section class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Aktivitas Terbaru</h3>
                  <p class="card-desc">4 laporan terakhir milik NIM ${esc(cfg.mahasiswa.nim)}</p>
                </div>
                <a href="#history" class="btn btn-ghost btn-sm">Semua Riwayat ${U().icon('arrowRight')}</a>
              </div>
              ${recentItems.length > 0 ? `
                <div class="stack-sm">
                  ${recentItems.map((it) => {
                    const isDraft = it.status_pengiriman?.kode === 'draft';
                    const fid = it.form?.id || it.form_id || 'FRM-KELUHAN';
                    const targetHref = isDraft
                      ? `#fill/${encodeURIComponent(fid)}/${encodeURIComponent(it.id)}`
                      : `#status/${encodeURIComponent(it.id)}`;
                    return `
                      <a href="${targetHref}" class="activity-row">
                        <div style="min-width:0;">
                          <div class="fw-700" style="font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(it.judul || it.form?.judul || it.id)}</div>
                          <div class="text-muted" style="font-size:0.76rem;"><span class="mono">${esc(it.id)}</span> · ${esc(U().formatDateTime(it.dikirim_pada || it.dibuat_pada))}</div>
                        </div>
                        <div class="badge-cluster" style="flex-shrink:0;">
                          ${U().getReviewBadge(it.status_peninjauan)}
                        </div>
                      </a>
                    `;
                  }).join('')}
                </div>
              ` : `<div class="empty-mini">Belum ada aktivitas pengisian.</div>`}
            </section>
          </div>

          <aside class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">UTS Mission Control</h3>
                <p class="card-desc">Bukti fitur terekam otomatis</p>
              </div>
              ${uts?.penilaian?.status ? U().getGradingBadge(uts.penilaian.status) : `<span class="badge badge-neutral">Belum Mulai</span>`}
            </div>

            <div class="uts-ring-row">
              <div class="score-ring-wrap" style="width:94px;height:94px;">
                <svg width="94" height="94" viewBox="0 0 94 94">
                  <circle cx="47" cy="47" r="${radius}" fill="none" stroke="var(--border-strong)" stroke-width="8"></circle>
                  <circle cx="47" cy="47" r="${radius}" fill="none" stroke="var(--primary-600)" stroke-width="8"
                    stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${dashOffset}"
                    transform="rotate(-90 47 47)"></circle>
                </svg>
                <div class="score-ring-text">
                  <span class="score-big" style="font-size:1.28rem;">${achieved}/${totalFeat}</span>
                  <span class="score-max">${featPct}%</span>
                </div>
              </div>
              <div style="flex:1;">
                <div class="fw-700" style="font-size:0.93rem;">${achieved === totalFeat ? 'Misi 10/10 Tercapai!' : `${totalFeat - achieved} Bukti Fitur Tersisa`}</div>
                <p class="text-muted text-sm" style="margin:4px 0 0;">Pantau detail checklist dan tombol aksi langsung di halaman UTS.</p>
              </div>
            </div>

            <div class="stack-sm" style="margin-bottom:16px;">
              ${(uts?.bukti_fitur?.daftar || C().UTS_FEATURE_FALLBACK).slice(0, 6).map((item) => `
                <div class="uts-mini-row">
                  <span style="display:flex;align-items:center;gap:8px;">
                    <span style="color:${item.tercapai ? 'var(--success-text)' : 'var(--text-muted)'};">${item.tercapai ? U().icon('check') : '○'}</span>
                    <span>${esc(item.label || item.kode)}</span>
                  </span>
                  <span class="mono text-muted" style="font-size:0.7rem;">${esc(item.kode)}</span>
                </div>
              `).join('')}
            </div>

            <a href="#uts" class="btn btn-primary btn-block">Buka Detail Progress UTS ${U().icon('arrowRight')}</a>
          </aside>
        </div>
      `;

      app.root.querySelectorAll('[data-jump]').forEach((btn) => {
        btn.addEventListener('click', () => { location.hash = btn.dataset.jump; });
      });

      CH().renderStatusDonut('home-status-chart', stats);
      if (gadPoints.length > 0) CH().renderGadTrend('home-gad-chart', gadPoints);
    } catch (err) {
      app.setConnectionStatus('error', `HTTP ${err.status || 'ERR'}`);
      const eCard = renderErrorCard(err, () => renderHomeView(app));
      app.root.innerHTML = eCard.html;
      eCard.bind(app.root, app);
    }
  }

  /* ========================================================================
     2. ANALITIK KLINIS
     ======================================================================== */
  async function renderAnalyticsView(app) {
    const cfg = C().loadConfig();
    if (!C().isConfigured(cfg)) { location.hash = '#settings'; return; }

    const esc = U().escapeHtml;
    app.setHeader('Analitik Klinis', `Visualisasi tren GAD-7, status, & pengukuran vital · ${cfg.mahasiswa.nama}`, null);
    app.root.innerHTML = renderSkeleton(4);

    try {
      const [meRes, listRes] = await Promise.all([
        API().getMe(cfg.mahasiswa.nim),
        API().listAssessments({ nim: cfg.mahasiswa.nim })
      ]);

      const stats = meRes.data?.statistik || {};
      const items = Array.isArray(listRes.data) ? listRes.data : [];
      const keluhanItems = items.filter((it) => String(it.form?.id || it.form_id || '').includes('KELUHAN')).slice(0, 6);
      const keluhanDetails = await Promise.all(
        keluhanItems.map((it) => API().getAssessment(it.id).then((r) => r.data).catch(() => null))
      );

      const measurements = keluhanDetails
        .filter((d) => d && d.answers && (d.answers.suhu_tubuh !== undefined || d.answers.berat_badan !== undefined))
        .map((d) => ({
          id: d.id,
          tanggal: d.answers.tanggal_pengukuran || U().formatShortDate(d.dikirim_pada || d.dibuat_pada),
          suhu: d.answers.suhu_tubuh ?? null,
          berat: d.answers.berat_badan ?? null,
          keluhan: d.answers.keluhan_utama || d.judul || '—'
        }));

      const gadPoints = extractGadPoints(items);
      const compCounts = {
        keluhanTerkirim: items.filter((i) => String(i.form?.id || '').includes('KELUHAN') && i.status_pengiriman?.kode === 'terkirim').length,
        keluhanDraf: items.filter((i) => String(i.form?.id || '').includes('KELUHAN') && i.status_pengiriman?.kode !== 'terkirim').length,
        gadTerkirim: items.filter((i) => String(i.form?.id || '').includes('GAD') && i.status_pengiriman?.kode === 'terkirim').length,
        gadDraf: items.filter((i) => String(i.form?.id || '').includes('GAD') && i.status_pengiriman?.kode !== 'terkirim').length
      };

      const latestGad = gadPoints.length > 0 ? gadPoints[gadPoints.length - 1] : null;
      const prevGad = gadPoints.length > 1 ? gadPoints[gadPoints.length - 2] : null;
      const gadDelta = (latestGad && prevGad) ? (latestGad.score - prevGad.score) : null;

      app.root.innerHTML = `
        <div class="stack-lg">
          <div class="alert alert-warning" style="margin-bottom:0;">
            ${U().icon('shieldAlert')}
            <div class="alert-body">
              <strong>Pernyataan Klinis:</strong> Grafik dan ringkasan di bawah ini bertujuan membantu pemantauan mandiri dan <strong>bukan diagnosis medis</strong>.
            </div>
          </div>

          <div class="kpi-grid">
            <div class="card card-compact">
              <span class="kpi-label">Total Laporan</span>
              <div class="kpi-val" style="margin-top:6px;">${items.length}</div>
              <span class="text-sm text-muted">NIM ${esc(cfg.mahasiswa.nim)}</span>
            </div>
            <div class="card card-compact">
              <span class="kpi-label">Skor GAD-7 Terakhir</span>
              <div class="kpi-val" style="margin-top:6px;">${latestGad ? `${latestGad.score}/21` : '—'}</div>
              <span class="text-sm text-muted">${gadDelta !== null ? `Delta: ${gadDelta > 0 ? '+' : ''}${gadDelta} poin` : 'Butuh ≥2 GAD-7'}</span>
            </div>
            <div class="card card-compact">
              <span class="kpi-label">Rekam Pengukuran Vital</span>
              <div class="kpi-val" style="margin-top:6px;">${measurements.length}</div>
              <span class="text-sm text-muted">Suhu tubuh / berat badan</span>
            </div>
            <div class="card card-compact">
              <span class="kpi-label">Rasio Selesai Ditinjau</span>
              <div class="kpi-val" style="margin-top:6px;">${items.length > 0 ? Math.round(((stats.sudah_ditinjau ?? 0) / items.length) * 100) : 0}%</div>
              <span class="text-sm text-muted">Selesai dengan tindak lanjut</span>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <h2 class="card-title">Kurva Perkembangan Skor GAD-7 (0–21)</h2>
                <p class="card-desc">Ambang instrumen: 0–4 Minimal · 5–9 Ringan · 10–14 Sedang · 15–21 Berat</p>
              </div>
              <a href="#guide/FRM-GAD7" class="btn btn-primary btn-sm">${U().icon('plus')} Isi GAD-7 Baru</a>
            </div>
            ${gadPoints.length > 0 ? `
              <div class="chart-canvas-wrap tall"><canvas id="an-gad-chart"></canvas></div>
            ` : `<div class="empty-mini" style="padding:48px 16px;">Isi dan kirim minimal 2 kuesioner GAD-7 untuk melihat kurva perkembangan skor.</div>`}
          </div>

          <div class="grid-2">
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Komposisi Jenis Formulir</h3>
                  <p class="card-desc">Keluhan Pra-Konsultasi vs GAD-7</p>
                </div>
              </div>
              <div class="chart-canvas-wrap"><canvas id="an-comp-chart"></canvas></div>
            </div>
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Sebaran Status Peninjauan</h3>
                  <p class="card-desc">Proporsi status seluruh laporan</p>
                </div>
              </div>
              <div class="chart-canvas-wrap"><canvas id="an-status-chart"></canvas></div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Riwayat Data Pengukuran Objektif (Vital)</h3>
                <p class="card-desc">Data suhu tubuh (°C) dan berat badan (kg) dari formulir keluhan Anda</p>
              </div>
              <span class="badge badge-info">${U().icon('thermometer')} data_type: pengukuran</span>
            </div>
            ${measurements.length > 0 ? `
              <div class="data-table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>ID</th><th>Tanggal Ukur</th><th>Keluhan Utama</th><th>Suhu Tubuh</th><th>Berat Badan</th><th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${measurements.map((m) => `
                      <tr>
                        <td class="mono fw-700">${esc(m.id)}</td>
                        <td>${esc(m.tanggal)}</td>
                        <td>${esc(m.keluhan)}</td>
                        <td>${m.suhu !== null ? `<span class="badge ${m.suhu >= 37.5 ? 'badge-warning' : 'badge-success'} mono">${esc(m.suhu)} °C</span>` : '<span class="unfilled-pill">Belum diisi</span>'}</td>
                        <td>${m.berat !== null ? `<span class="mono fw-700">${esc(m.berat)} kg</span>` : '<span class="unfilled-pill">Belum diisi</span>'}</td>
                        <td><a href="#result/${encodeURIComponent(m.id)}" class="btn btn-secondary btn-sm">Hasil</a></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : `<div class="empty-mini">Belum ada catatan suhu tubuh atau berat badan.</div>`}
          </div>
        </div>
      `;

      if (gadPoints.length > 0) CH().renderGadTrend('an-gad-chart', gadPoints);
      CH().renderFormCompositionBar('an-comp-chart', compCounts);
      CH().renderStatusDonut('an-status-chart', stats);
    } catch (err) {
      const eCard = renderErrorCard(err, () => renderAnalyticsView(app));
      app.root.innerHTML = eCard.html;
      eCard.bind(app.root, app);
    }
  }

  /* ========================================================================
     3. PETUNJUK & PERSETUJUAN PENGISIAN
     ======================================================================== */
  async function renderGuideView(app, formId) {
    const cfg = C().loadConfig();
    if (!C().isConfigured(cfg)) { location.hash = '#settings'; return; }

    const esc = U().escapeHtml;
    app.setHeader('Petunjuk Pengisian', `Persiapan & persetujuan formulir ${formId}`, '#home');
    app.root.innerHTML = renderSkeleton(2);

    try {
      const res = await API().getFormDetail(formId);
      const form = FE().normalizeForm(res.data || {});
      app.state.formCache[formId] = form;
      const isBonus = String(form.id).toUpperCase().includes('GAD');

      app.root.innerHTML = `
        <div class="stack-lg" style="max-width:780px;margin:0 auto;">
          <div class="card">
            <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">
              <div class="form-icon-box" style="width:54px;height:54px;${isBonus ? 'background:var(--indigo-bg);color:var(--indigo-text);' : ''}">
                ${isBonus ? U().icon('brain') : U().icon('clipboard')}
              </div>
              <div style="flex:1;min-width:min(100%, 220px);">
                <div class="badge-cluster" style="margin-bottom:8px;">
                  <span class="badge badge-primary mono">${esc(form.id)} v${esc(form.version)}</span>
                  <span class="badge badge-neutral">${U().icon('clock')} ±${esc(form.estimatedMinutes)} menit</span>
                  <span class="badge badge-info">${form.sections.length} Bagian</span>
                </div>
                <h2 class="card-title" style="font-size:1.3rem;">${esc(form.title)}</h2>
                ${form.description ? `<p class="card-desc" style="font-size:0.9rem;">${esc(form.description)}</p>` : ''}
                ${form.reportingPeriod ? `<p class="text-sm text-muted" style="margin:8px 0 0;">Periode pelaporan: <strong>${esc(form.reportingPeriod)}</strong></p>` : ''}
              </div>
            </div>
          </div>

          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Petunjuk Pengisian</h3>
            <ul style="margin:0;padding-left:20px;display:grid;gap:9px;color:var(--text-secondary);font-size:0.9rem;">
              ${(form.petunjuk.length > 0 ? form.petunjuk : [
                'Jawab sesuai kondisi yang Anda rasakan saat ini. Tidak ada jawaban benar atau salah.',
                'Kolom bertanda (*) wajib diisi sebelum formulir dapat dikirim.',
                'Draf jawaban tersimpan otomatis (Auto-Save) dan dapat dilanjutkan kapan saja melalui Riwayat.',
                'Jawaban "Tidak" dibedakan dari "Belum diisi".'
              ]).map((p) => `<li>${esc(p)}</li>`).join('')}
            </ul>
            <div class="alert alert-warning" style="margin-top:18px;margin-bottom:0;">
              ${U().icon('shieldAlert')}
              <div class="alert-body">
                <div class="alert-title">Hasil Self-Assessment Bukan Diagnosis</div>
                <p>${esc(form.keterbatasan)}</p>
              </div>
            </div>
          </div>

          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Persetujuan Penggunaan Data</h3>
            <label class="choice-option" id="consent-box" style="align-items:flex-start;">
              <input type="checkbox" id="consent-checkbox" style="margin-top:3px;" />
              <span class="choice-text" style="font-weight:500;line-height:1.5;">${esc(form.persetujuanText)}</span>
            </label>
            <div class="btn-row" style="margin-top:18px;justify-content:space-between;">
              <a href="#home" class="btn btn-secondary">${U().icon('arrowLeft')} Kembali</a>
              <button type="button" class="btn btn-primary btn-lg" id="btn-start-assessment" disabled>
                Mulai Mengisi Formulir ${U().icon('arrowRight')}
              </button>
            </div>
          </div>
        </div>
      `;

      const cb = app.root.querySelector('#consent-checkbox');
      const box = app.root.querySelector('#consent-box');
      const startBtn = app.root.querySelector('#btn-start-assessment');

      cb.addEventListener('change', () => {
        box.classList.toggle('selected', cb.checked);
        startBtn.disabled = !cb.checked;
      });

      startBtn.addEventListener('click', async () => {
        startBtn.disabled = true;
        startBtn.innerHTML = `<span class="spin">${U().icon('refresh')}</span> Membuat Draf...`;
        try {
          const createRes = await API().createAssessment({
            form_id: form.id,
            persetujuan: true,
            mahasiswa: cfg.mahasiswa,
            answers: {}
          });
          const draftId = createRes.data?.id;
          app.toast(`Draf ${draftId} berhasil dibuat.`, 'success');
          location.hash = `#fill/${encodeURIComponent(form.id)}/${encodeURIComponent(draftId)}`;
        } catch (err) {
          app.toast(err.message || 'Gagal memulai pengisian.', 'error');
          startBtn.disabled = false;
          startBtn.innerHTML = `Mulai Mengisi Formulir ${U().icon('arrowRight')}`;
        }
      });
    } catch (err) {
      const eCard = renderErrorCard(err, () => renderGuideView(app, formId));
      app.root.innerHTML = eCard.html;
      eCard.bind(app.root, app);
    }
  }

  /* ========================================================================
     4. SPLIT-SCREEN SMART WIZARD
     ======================================================================== */
  async function renderFillView(app, formId, assessmentId, query = {}) {
    const cfg = C().loadConfig();
    if (!C().isConfigured(cfg)) { location.hash = '#settings'; return; }

    const esc = U().escapeHtml;
    app.setHeader('Pengisian Formulir', `Memuat draf ${assessmentId}...`, '#history');
    app.root.innerHTML = renderSkeleton(3);

    try {
      const [formRes, detailRes] = await Promise.all([
        app.state.formCache[formId] ? Promise.resolve({ cached: app.state.formCache[formId] }) : API().getFormDetail(formId),
        API().getAssessment(assessmentId)
      ]);

      const form = formRes.cached || FE().normalizeForm(formRes.data || {});
      app.state.formCache[formId] = form;
      const assessment = detailRes.data || {};
      const deliveryCode = assessment.status_pengiriman?.kode || 'draft';

      app.setHeader(form.title, `Draf ${assessmentId} · ${form.id} v${form.version}`, '#history');

      if (deliveryCode === 'terkirim') {
        app.root.innerHTML = `
          <div class="card" style="max-width:680px;margin:0 auto;">
            <div class="alert alert-info">
              ${U().icon('shieldAlert')}
              <div class="alert-body">
                <div class="alert-title">Laporan Sudah Dikirim &amp; Terkunci (HTTP 409)</div>
                <p>Laporan <strong class="mono">${esc(assessmentId)}</strong> sudah dikirim ke petugas sehingga tidak dapat diubah lagi.</p>
              </div>
            </div>
            <div class="btn-row">
              <a href="#result/${encodeURIComponent(assessmentId)}" class="btn btn-primary">Lihat Hasil Assessment</a>
              <a href="#status/${encodeURIComponent(assessmentId)}" class="btn btn-secondary">Pantau Status</a>
            </div>
          </div>
        `;
        return;
      }

      const answers = { ...(assessment.answers || {}) };
      const touchedKeys = new Set();
      let fieldErrors = {};
      let currentStep = query.q ? FE().findQuestionSectionIndex(form, answers, query.q) : 0;
      let autoSaveEnabled = cfg.autoSave !== false;
      let autoSaveTimer = null;
      let lastSavedText = 'Belum diubah';

      function clearTimers() { if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null; } }
      app.registerCleanup(clearTimers);

      function renderLivePanelHtml() {
        const live = FE().computeLiveStats(form, answers);
        const visSecCount = FE().getVisibleSections(form, answers).length;
        const totalSecCount = form.sections.length;
        const branchActive = visSecCount !== totalSecCount;

        return `
          <div class="card card-compact stack-md">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div>
                <h3 class="card-title" style="font-size:0.95rem;">Live Clinical Preview</h3>
                <p class="card-desc" style="font-size:0.75rem;">Ringkasan jawaban real-time</p>
              </div>
              <span class="badge ${live.pct === 100 ? 'badge-success' : 'badge-primary'} mono">${live.pct}%</span>
            </div>

            <div>
              <div style="display:flex;justify-content:space-between;font-size:0.76rem;font-weight:700;margin-bottom:5px;">
                <span>Kolom Wajib Terisi</span>
                <span class="mono">${live.reqFilled} / ${live.reqTotal}</span>
              </div>
              <div class="progress-track"><div class="progress-fill" style="width:${live.pct}%;"></div></div>
            </div>

            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              <span class="badge ${branchActive ? 'badge-info' : 'badge-neutral'}">
                ${U().icon('gitBranch')} ${visSecCount} dari ${totalSecCount} bagian aktif
              </span>
              <span class="badge badge-neutral" id="autosave-status-badge">${esc(lastSavedText)}</span>
            </div>

            <label style="display:flex;align-items:center;gap:8px;font-size:0.78rem;font-weight:700;cursor:pointer;padding:8px 10px;border-radius:10px;background:var(--bg-subtle);border:1px solid var(--border-color);">
              <input type="checkbox" id="toggle-autosave" ${autoSaveEnabled ? 'checked' : ''} style="accent-color:var(--primary-600);" />
              <span>Auto-Save Draf (3 detik)</span>
            </label>

            ${live.gadEstimate ? `
              <div style="padding:12px;border-radius:12px;background:var(--indigo-bg);border:1px solid var(--indigo-border);">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:0.76rem;font-weight:800;color:var(--indigo-text);">Estimasi Skor GAD-7</span>
                  <span class="badge ${U().getScoreCategoryClass(live.gadEstimate.kategori.kode)} mono">${live.gadEstimate.total}/21 · ${live.gadEstimate.kategori.label}</span>
                </div>
                <div style="font-size:0.71rem;color:var(--text-muted);margin-top:4px;">${live.gadEstimate.answered}/7 butir terjawab · Bukan diagnosis medis.</div>
              </div>
            ` : ''}

            <div class="live-preview-scroll">
              ${live.visibleQs.map((q) => {
                const disp = FE().formatAnswerDisplay(q, answers[q.id]);
                return `
                  <div class="live-preview-item ${disp ? '' : 'is-empty'}">
                    <span class="live-preview-k">${esc(q.shortLabel)}</span>
                    <span class="live-preview-v">${disp ? esc(disp) : '<em>Belum diisi</em>'}</span>
                  </div>
                `;
              }).join('')}
            </div>

            <a href="#review/${encodeURIComponent(assessmentId)}" class="btn btn-secondary btn-sm btn-block" id="btn-live-review">
              Periksa Sebelum Kirim ${U().icon('arrowRight')}
            </a>
          </div>
        `;
      }

      async function saveDraftToServer(silent = false) {
        clearTimers();
        const payload = FE().buildPatchAnswers(form, answers, touchedKeys);
        if (Object.keys(payload).length === 0) return;
        const badge = app.root.querySelector('#autosave-status-badge');
        if (badge) badge.textContent = 'Menyimpan...';
        const res = await API().patchAssessment(assessmentId, payload);
        touchedKeys.clear();
        fieldErrors = {};
        lastSavedText = `Tersimpan ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
        const badgeAfter = app.root.querySelector('#autosave-status-badge');
        if (badgeAfter) badgeAfter.textContent = lastSavedText;
        if (!silent) app.toast('Draf jawaban berhasil disimpan.', 'success');
        return res;
      }

      function scheduleAutoSave() {
        clearTimers();
        if (!autoSaveEnabled) return;
        const badge = app.root.querySelector('#autosave-status-badge');
        if (badge) badge.textContent = 'Menunggu auto-save...';
        autoSaveTimer = setTimeout(async () => {
          try { await saveDraftToServer(true); }
          catch {
            const b = app.root.querySelector('#autosave-status-badge');
            if (b) b.textContent = 'Gagal auto-save';
          }
        }, 2800);
      }

      function renderWizardStep(focusQid = null) {
        const visibleSections = FE().getVisibleSections(form, answers);
        if (currentStep >= visibleSections.length) currentStep = Math.max(0, visibleSections.length - 1);
        const section = visibleSections[currentStep];
        const visibleQuestions = FE().getVisibleQuestions(section, answers);
        const progressPct = Math.round(((currentStep + 1) / Math.max(1, visibleSections.length)) * 100);
        const isLast = currentStep === visibleSections.length - 1;

        app.root.innerHTML = `
          <div class="wizard-split">
            <div>
              <div class="wizard-header">
                <div class="wizard-steps-meta">
                  <span>Bagian ${currentStep + 1} dari ${visibleSections.length} — ${esc(section.title)}</span>
                  <span class="mono" style="color:var(--primary-600);">${progressPct}%</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" style="width:${progressPct}%;"></div>
                </div>
                <div class="step-pills">
                  ${visibleSections.map((s, idx) => `
                    <button type="button" class="step-pill ${idx === currentStep ? 'active' : (idx < currentStep ? 'done' : '')}" data-step-jump="${idx}">
                      ${idx + 1}. ${esc(s.title)}
                    </button>
                  `).join('')}
                </div>
              </div>

              <div class="card">
                <div class="card-header">
                  <div>
                    <h2 class="card-title" style="font-size:1.15rem;">${esc(section.title)}</h2>
                    ${section.description ? `<p class="card-desc">${esc(section.description)}</p>` : ''}
                  </div>
                  <span class="badge badge-neutral mono">${esc(assessmentId)}</span>
                </div>

                <div id="wizard-questions">
                  ${visibleQuestions.map((q) => FE().renderQuestionHtml(q, answers[q.id], fieldErrors[q.id])).join('')}
                </div>

                <div id="wizard-banner"></div>
                <div class="divider"></div>

                <div class="btn-row wizard-actions-bar" style="justify-content:space-between;">
                  <div class="btn-row">
                    ${currentStep > 0 ? `<button type="button" class="btn btn-secondary" id="btn-prev-step">${U().icon('arrowLeft')} Sebelumnya</button>` : ''}
                    <button type="button" class="btn btn-secondary" id="btn-save-draft">${U().icon('save')} Simpan Draf</button>
                  </div>
                  <button type="button" class="btn btn-primary btn-lg" id="btn-next-step">
                    ${isLast ? `Periksa Sebelum Kirim ${U().icon('arrowRight')}` : `Simpan &amp; Lanjut ${U().icon('arrowRight')}`}
                  </button>
                </div>
              </div>
            </div>

            <aside class="wizard-live-panel" id="live-panel-mount">
              ${renderLivePanelHtml()}
            </aside>
          </div>
        `;

        const qContainer = app.root.querySelector('#wizard-questions');
        const bannerEl = app.root.querySelector('#wizard-banner');
        const liveMount = app.root.querySelector('#live-panel-mount');

        function refreshLivePanel() {
          if (!liveMount) return;
          liveMount.innerHTML = renderLivePanelHtml();
          bindLivePanelToggle();
        }

        function bindLivePanelToggle() {
          liveMount?.querySelector('#toggle-autosave')?.addEventListener('change', (e) => {
            autoSaveEnabled = e.target.checked;
            const c = C().loadConfig();
            c.autoSave = autoSaveEnabled;
            C().saveConfig(c);
            app.toast(`Auto-Save ${autoSaveEnabled ? 'diaktifkan' : 'dimatikan'}.`, 'info');
          });
          liveMount?.querySelector('#btn-live-review')?.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
              await saveDraftToServer(true);
              location.hash = `#review/${encodeURIComponent(assessmentId)}`;
            } catch (err) { handleSaveError(err); }
          });
        }
        bindLivePanelToggle();

        FE().bindSectionEvents(qContainer, section, answers, (qid, newVal, needsRerender) => {
          answers[qid] = newVal;
          touchedKeys.add(qid);
          if (fieldErrors[qid]) delete fieldErrors[qid];
          scheduleAutoSave();
          if (needsRerender) {
            renderWizardStep();
          } else {
            const wrap = qContainer.querySelector(`#wrap_${CSS.escape(qid)}`);
            if (wrap) {
              wrap.classList.remove('has-error');
              wrap.querySelector('.field-error')?.remove();
            }
            refreshLivePanel();
          }
        });

        function handleSaveError(err) {
          if (err.status === 422 && err.errors) {
            fieldErrors = { ...err.errors };
            renderWizardStep(Object.keys(err.errors)[0]);
            app.toast(err.message || 'Beberapa jawaban belum sesuai format.', 'warning');
          } else {
            bannerEl.innerHTML = `<div class="alert alert-danger" style="margin-top:12px;margin-bottom:0;">${U().icon('alertTriangle')}<div class="alert-body">${esc(err.message)}</div></div>`;
            app.toast(err.message, 'error');
          }
        }

        app.root.querySelectorAll('[data-step-jump]').forEach((pill) => {
          pill.addEventListener('click', async () => {
            const targetIdx = Number(pill.dataset.stepJump);
            if (targetIdx === currentStep) return;
            try {
              await saveDraftToServer(true);
              currentStep = targetIdx;
              renderWizardStep();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (err) { handleSaveError(err); }
          });
        });

        app.root.querySelector('#btn-prev-step')?.addEventListener('click', async () => {
          try {
            await saveDraftToServer(true);
            currentStep = Math.max(0, currentStep - 1);
            renderWizardStep();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (err) { handleSaveError(err); }
        });

        app.root.querySelector('#btn-save-draft').addEventListener('click', async (ev) => {
          const btn = ev.currentTarget;
          btn.disabled = true;
          try {
            if (touchedKeys.size === 0) Object.keys(answers).forEach((k) => touchedKeys.add(k));
            await saveDraftToServer(false);
          } catch (err) { handleSaveError(err); }
          finally { btn.disabled = false; }
        });

        app.root.querySelector('#btn-next-step').addEventListener('click', async (ev) => {
          const btn = ev.currentTarget;
          btn.disabled = true;
          try {
            await saveDraftToServer(true);
            if (isLast) location.hash = `#review/${encodeURIComponent(assessmentId)}`;
            else {
              currentStep += 1;
              renderWizardStep();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          } catch (err) {
            handleSaveError(err);
            btn.disabled = false;
          }
        });

        if (focusQid) {
          const targetEl = app.root.querySelector(`#wrap_${CSS.escape(focusQid)}`);
          if (targetEl) setTimeout(() => targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
        }
      }

      renderWizardStep(query.q || null);
    } catch (err) {
      const eCard = renderErrorCard(err, () => renderFillView(app, formId, assessmentId, query));
      app.root.innerHTML = eCard.html;
      eCard.bind(app.root, app);
    }
  }

  /* ========================================================================
     5. PERIKSA SEBELUM MENGIRIM
     ======================================================================== */
  async function renderReviewView(app, assessmentId) {
    const cfg = C().loadConfig();
    if (!C().isConfigured(cfg)) { location.hash = '#settings'; return; }

    const esc = U().escapeHtml;
    app.setHeader('Periksa Sebelum Mengirim', `Validasi kelengkapan ${assessmentId}`, '#history');
    app.root.innerHTML = renderSkeleton(3);

    try {
      const detailRes = await API().getAssessment(assessmentId);
      const assessment = detailRes.data || {};
      const formId = assessment.form?.id || assessment.form_id;
      const formRes = app.state.formCache[formId]
        ? { cached: app.state.formCache[formId] }
        : await API().getFormDetail(formId);
      const form = formRes.cached || FE().normalizeForm(formRes.data || {});
      app.state.formCache[formId] = form;

      if (assessment.status_pengiriman?.kode === 'terkirim') {
        location.hash = `#result/${encodeURIComponent(assessmentId)}`;
        return;
      }

      const cleanAnswers = FE().buildValidateAnswers(form, assessment.answers || {});
      const valRes = await API().validateForm(formId, cfg.mahasiswa.nim, cleanAnswers);
      const vData = valRes.data || {};
      const isValid = Boolean(vData.valid);
      const errorEntries = Object.entries(vData.errors || {});
      const kel = vData.kelengkapan || {};
      const pct = kel.persen ?? (isValid ? 100 : 0);
      const preview = vData.hasil_pratinjau || {};
      const ringkasan = Array.isArray(preview.ringkasan) ? preview.ringkasan : [];

      app.setHeader('Periksa Jawaban', `${form.title} · ${assessmentId}`, `#fill/${encodeURIComponent(formId)}/${encodeURIComponent(assessmentId)}`);

      app.root.innerHTML = `
        <div class="stack-lg" style="max-width:840px;margin:0 auto;">
          <div class="card">
            <div class="card-header">
              <div>
                <h2 class="card-title">Validasi &amp; Kelengkapan Formulir</h2>
                <p class="card-desc">${kel.wajib_terisi ?? 0} dari ${kel.wajib_total ?? 0} pertanyaan wajib telah terisi.</p>
              </div>
              <span class="badge ${isValid ? 'badge-success' : 'badge-warning'}">${esc(kel.label || (isValid ? 'Lengkap & Siap Dikirim' : 'Belum Lengkap'))} (${pct}%)</span>
            </div>
            <div class="progress-track" style="height:10px;">
              <div class="progress-fill" style="width:${pct}%;"></div>
            </div>

            ${errorEntries.length > 0 ? `
              <div class="alert alert-warning" style="margin-top:16px;margin-bottom:0;">
                ${U().icon('alertTriangle')}
                <div class="alert-body">
                  <div class="alert-title">Masih ada ${errorEntries.length} kolom yang perlu dilengkapi (klik untuk melompat):</div>
                  <ul style="margin:8px 0 0 18px;padding:0;display:grid;gap:6px;">
                    ${errorEntries.map(([qid, msg]) => `
                      <li>
                        <a href="#fill/${encodeURIComponent(formId)}/${encodeURIComponent(assessmentId)}?q=${encodeURIComponent(qid)}" style="text-decoration:underline;font-weight:700;">
                          ${esc(msg)}
                        </a>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              </div>
            ` : `
              <div class="alert alert-success" style="margin-top:16px;margin-bottom:0;">
                ${U().icon('check')}
                <div class="alert-body">
                  <div class="alert-title">Semua Jawaban Wajib Valid!</div>
                  <p>Periksa ringkasan di bawah. Setelah dikirim, laporan dikunci untuk ditinjau tenaga kesehatan.</p>
                </div>
              </div>
            `}
          </div>

          ${preview.skor ? `
            <div class="card">
              <div class="card-header" style="margin-bottom:8px;">
                <div>
                  <h3 class="card-title">Pratinjau Skor GAD-7</h3>
                  <p class="card-desc">Dihitung otomatis oleh API — bukan diagnosis medis</p>
                </div>
                <span class="badge ${U().getScoreCategoryClass(preview.skor.kategori?.kode)}">
                  Skor ${esc(preview.skor.total)} / ${esc(preview.skor.maks || 21)} · ${esc(preview.skor.kategori?.label || '')}
                </span>
              </div>
              <p class="text-sm text-muted" style="margin:0;">${esc(preview.skor.keterangan || '')}</p>
            </div>
          ` : ''}

          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Ringkasan Jawaban Pasien</h3>
                <p class="card-desc">Kolom kosong tampil sebagai <em>Belum diisi</em> — berbeda dari jawaban <strong>Tidak</strong>.</p>
              </div>
              <a href="#fill/${encodeURIComponent(formId)}/${encodeURIComponent(assessmentId)}" class="btn btn-secondary btn-sm">Ubah Jawaban</a>
            </div>
            <div class="summary-list">
              ${ringkasan.map((item) => {
                const isMeas = item.data_type === 'pengukuran';
                const filled = item.terisi !== false && item.jawaban_teks && item.jawaban_teks !== 'Belum diisi';
                const valHtml = filled
                  ? `${esc(item.jawaban_teks)}${item.satuan && !String(item.jawaban_teks).includes(item.satuan) ? ' ' + esc(item.satuan) : ''}`
                  : `<span class="unfilled-pill">Belum diisi</span>`;
                return `
                  <div class="summary-row">
                    <div class="summary-key">
                      <span>${esc(item.label || item.pertanyaan || item.question_id)}</span>
                      ${isMeas ? `<span class="badge badge-info" style="padding:2px 7px;font-size:0.68rem;">Pengukuran</span>` : ''}
                    </div>
                    <div class="summary-val">${valHtml}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="card">
            <div class="alert alert-warning" style="margin-bottom:16px;">
              ${U().icon('shieldAlert')}
              <div class="alert-body">
                <strong>Pernyataan Penting:</strong> Hasil self-assessment bukan diagnosis medis. Setelah dikirim, jawaban tidak dapat diubah lagi.
              </div>
            </div>
            <div class="btn-row" style="justify-content:space-between;">
              <a href="#fill/${encodeURIComponent(formId)}/${encodeURIComponent(assessmentId)}" class="btn btn-secondary">
                ${U().icon('arrowLeft')} Ubah Jawaban
              </a>
              <button type="button" class="btn btn-primary btn-lg" id="btn-submit-assessment" ${isValid ? '' : 'disabled'}>
                ${U().icon('send')} Kirim Jawaban ke Petugas
              </button>
            </div>
          </div>
        </div>
      `;

      app.root.querySelector('#btn-submit-assessment')?.addEventListener('click', () => {
        app.confirmModal({
          title: 'Kirim Laporan Self-Assessment?',
          body: `Laporan <strong class="mono">${esc(assessmentId)}</strong> akan dikirim ke tenaga kesehatan untuk ditinjau. Setelah dikirim, jawaban dikunci.`,
          confirmText: 'Ya, Kirim Sekarang',
          confirmClass: 'btn-primary',
          onConfirm: async () => {
            try {
              const submitRes = await API().submitAssessment(assessmentId);
              app.state.lastSubmission = { id: assessmentId, data: submitRes.data, message: submitRes.message };
              app.toast('Formulir berhasil dikirim!', 'success');
              location.hash = `#submitted/${encodeURIComponent(assessmentId)}`;
            } catch (err) {
              app.toast(err.message || 'Gagal mengirim formulir.', 'error');
              if (err.status === 422) renderReviewView(app, assessmentId);
            }
          }
        });
      });
    } catch (err) {
      const eCard = renderErrorCard(err, () => renderReviewView(app, assessmentId));
      app.root.innerHTML = eCard.html;
      eCard.bind(app.root, app);
    }
  }

  /* ========================================================================
     6. KONFIRMASI PENGIRIMAN
     ======================================================================== */
  async function renderSubmittedView(app, assessmentId) {
    const esc = U().escapeHtml;
    app.setHeader('Jawaban Berhasil Dikirim', `Konfirmasi laporan ${assessmentId}`, '#home');
    app.root.innerHTML = renderSkeleton(2);

    try {
      const statusRes = await API().getAssessmentStatus(assessmentId);
      const s = statusRes.data || {};
      const msg = app.state.lastSubmission?.id === assessmentId
        ? app.state.lastSubmission.message
        : 'Formulir Anda telah diterima.';

      app.root.innerHTML = `
        <div class="card confirm-card">
          <div class="confirm-icon">${U().icon('checkCircle')}</div>
          <h2 style="margin:0 0 8px;font-size:1.55rem;font-weight:800;">${esc(msg || 'Formulir Anda telah diterima.')}</h2>
          <p class="text-muted" style="margin:0 0 18px;">
            Nomor Laporan <strong class="mono" style="color:var(--text-primary);">${esc(assessmentId)}</strong>
            ${s.dikirim_pada ? ` · Dikirim ${esc(U().formatDateTime(s.dikirim_pada))}` : ''}
          </p>

          <div class="badge-cluster" style="justify-content:center;margin-bottom:18px;">
            ${U().getDeliveryBadge(s.status_pengiriman || { kode: 'terkirim', label: 'Terkirim' })}
            ${U().getReviewBadge(s.status_peninjauan || { kode: 'menunggu_peninjauan', label: 'Menunggu peninjauan' })}
          </div>

          <div class="alert alert-info" style="text-align:left;">
            ${U().icon('clock')}
            <div class="alert-body">
              <div class="alert-title">Status Peninjauan Saat Ini</div>
              <p>${esc(s.pesan || s.pesan_status || 'Laporan Anda sudah diterima dan sedang menunggu peninjauan petugas.')}</p>
            </div>
          </div>

          <div class="alert alert-warning" style="text-align:left;">
            ${U().icon('shieldAlert')}
            <div class="alert-body">Hasil self-assessment <strong>bukan diagnosis medis</strong>. Pantau status secara berkala untuk klarifikasi atau tindak lanjut dari petugas.</div>
          </div>

          <div class="btn-row" style="justify-content:center;margin-top:22px;">
            <a href="#result/${encodeURIComponent(assessmentId)}" class="btn btn-secondary">Lihat Hasil Assessment</a>
            <a href="#status/${encodeURIComponent(assessmentId)}" class="btn btn-primary">Pantau Status &amp; Timeline</a>
            <a href="#home" class="btn btn-ghost">Kembali ke Beranda</a>
          </div>
        </div>
      `;
    } catch (err) {
      const eCard = renderErrorCard(err, () => renderSubmittedView(app, assessmentId));
      app.root.innerHTML = eCard.html;
      eCard.bind(app.root, app);
    }
  }

  /* ========================================================================
     7. RIWAYAT SELF-ASSESSMENT
     ======================================================================== */
  async function renderHistoryView(app, query = {}) {
    const cfg = C().loadConfig();
    if (!C().isConfigured(cfg)) { location.hash = '#settings'; return; }

    const esc = U().escapeHtml;
    app.setHeader('Riwayat Self-Assessment', `Draf & laporan terkirim · ${cfg.mahasiswa.nama} (${cfg.mahasiswa.nim})`, null);

    let activeFilter = query.filter || 'semua';
    let formFilter = query.form_id || '';
    let searchText = query.q || '';
    let showAllDemo = false;

    app.root.innerHTML = `
      <div class="stack-md">
        <div class="card card-compact">
          <div class="filter-bar">
            <div class="tab-group" id="history-tabs">
              ${[
                ['semua', 'Semua'],
                ['draft', 'Draf'],
                ['diproses', 'Diproses'],
                ['perlu_klarifikasi', 'Perlu Klarifikasi'],
                ['sudah_ditinjau', 'Sudah Ditinjau']
              ].map(([key, label]) => `
                <button type="button" class="filter-tab ${activeFilter === key ? 'active' : ''}" data-filter="${key}">${label}</button>
              `).join('')}
            </div>

            ${cfg.mode === 'live' ? `
              <label style="display:inline-flex;align-items:center;gap:7px;font-size:0.79rem;font-weight:700;color:var(--text-secondary);cursor:pointer;">
                <input type="checkbox" id="toggle-demo-mode" style="accent-color:var(--primary-600);" />
                <span>Tampilkan Data Contoh Server (Tanpa Filter NIM)</span>
              </label>
            ` : `<span class="badge badge-indigo">Data Sandbox Demo</span>`}
          </div>

          <div class="grid-2" style="gap:10px;">
            <input type="search" id="history-search" class="text-input" placeholder="Cari judul keluhan atau ID laporan..." value="${esc(searchText)}" />
            <select id="history-form-filter" class="select-input">
              <option value="">Semua Jenis Formulir</option>
              <option value="FRM-KELUHAN" ${formFilter === 'FRM-KELUHAN' ? 'selected' : ''}>FRM-KELUHAN — Formulir Keluhan Pasien</option>
              <option value="FRM-GAD7" ${formFilter === 'FRM-GAD7' ? 'selected' : ''}>FRM-GAD7 — Kuesioner Kecemasan (GAD-7)</option>
            </select>
          </div>
        </div>

        <div id="history-list-mount">${renderSkeleton(2)}</div>
      </div>
    `;

    const listMount = app.root.querySelector('#history-list-mount');

    async function loadList() {
      listMount.innerHTML = renderSkeleton(2);
      try {
        const params = {};
        if (!showAllDemo) params.nim = cfg.mahasiswa.nim;
        if (formFilter) params.form_id = formFilter;
        if (searchText.trim()) params.q = searchText.trim();
        if (activeFilter === 'draft') params.status_pengiriman = 'draft';
        else if (activeFilter === 'perlu_klarifikasi') params.status_peninjauan = 'perlu_klarifikasi';
        else if (activeFilter === 'sudah_ditinjau') params.status_peninjauan = 'sudah_ditinjau';

        const res = await API().listAssessments(params);
        let items = Array.isArray(res.data) ? res.data : [];

        if (activeFilter === 'diproses') {
          items = items.filter((it) => ['menunggu_peninjauan', 'sedang_ditinjau', 'klarifikasi_dijawab'].includes(it.status_peninjauan?.kode));
        }

        if (items.length === 0) {
          listMount.innerHTML = `
            <div class="card empty-state">
              <div class="empty-icon">${U().icon('clipboard')}</div>
              <h3 style="margin:0 0 6px;">Belum Ada Laporan</h3>
              <p class="text-sm" style="margin:0 0 18px;">Belum ada self-assessment untuk filter ini.</p>
              <div class="btn-row" style="justify-content:center;">
                <a href="#guide/FRM-KELUHAN" class="btn btn-primary">Mulai Formulir Keluhan</a>
                <a href="#guide/FRM-GAD7" class="btn btn-secondary">Isi Kuesioner GAD-7</a>
              </div>
            </div>
          `;
          return;
        }

        listMount.innerHTML = `
          <div class="history-list">
            ${items.map((it) => {
              const delivCode = it.status_pengiriman?.kode || 'draft';
              const revCode = it.status_peninjauan?.kode || 'belum_dikirim';
              const isDraft = delivCode === 'draft';
              const needsClar = revCode === 'perlu_klarifikasi' || (it.klarifikasi_menunggu || 0) > 0;
              const isDone = revCode === 'sudah_ditinjau' || it.ada_tindak_lanjut;
              const formId = it.form?.id || it.form_id || 'FRM-KELUHAN';
              const timeStr = isDraft
                ? `Dibuat ${U().formatDateTime(it.dibuat_pada)}`
                : `Dikirim ${U().formatDateTime(it.dikirim_pada || it.dibuat_pada)}`;

              return `
                <article class="history-card">
                  <div class="history-card-top">
                    <div>
                      <h3 class="history-title">${esc(it.judul || it.form?.judul || it.id)}</h3>
                      <div class="history-meta">
                        <span class="mono fw-700">${esc(it.id)}</span>
                        <span>•</span>
                        <span>${esc(it.form?.judul || formId)}</span>
                        <span>•</span>
                        <span>${esc(timeStr)}</span>
                      </div>
                    </div>
                    <div class="badge-cluster">
                      ${U().getDeliveryBadge(it.status_pengiriman)}
                      ${U().getReviewBadge(it.status_peninjauan)}
                      ${it.status_kelengkapan === 'belum_lengkap' && isDraft ? `<span class="badge badge-warning">Belum Lengkap</span>` : ''}
                      ${it.skor ? `<span class="badge ${U().getScoreCategoryClass(it.skor.kategori?.kode)}">Skor ${esc(it.skor.total)} · ${esc(it.skor.kategori?.label || '')}</span>` : ''}
                    </div>
                  </div>

                  ${needsClar ? `
                    <div class="alert alert-warning" style="padding:10px 14px;margin:10px 0;">
                      ${U().icon('message')}
                      <div class="alert-body text-sm">Petugas meminta klarifikasi tambahan. Segera jawab agar laporan dapat ditinjau.</div>
                    </div>
                  ` : ''}

                  <div class="btn-row" style="margin-top:13px;">
                    ${isDraft ? `
                      <a href="#fill/${encodeURIComponent(formId)}/${encodeURIComponent(it.id)}" class="btn btn-primary btn-sm">Lanjutkan Pengisian</a>
                      <a href="#review/${encodeURIComponent(it.id)}" class="btn btn-secondary btn-sm">Periksa &amp; Kirim</a>
                      <button type="button" class="btn btn-danger btn-sm" data-delete-id="${esc(it.id)}">${U().icon('trash')} Hapus Draf</button>
                    ` : `
                      <a href="#result/${encodeURIComponent(it.id)}" class="btn btn-secondary btn-sm">Lihat Hasil</a>
                      <a href="#status/${encodeURIComponent(it.id)}" class="btn ${needsClar ? 'btn-warning' : 'btn-primary'} btn-sm">
                        ${needsClar ? 'Jawab Klarifikasi' : (isDone ? 'Lihat Tindak Lanjut' : 'Pantau Status')}
                      </a>
                    `}
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        `;

        listMount.querySelectorAll('[data-delete-id]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const delId = btn.dataset.deleteId;
            app.confirmModal({
              title: 'Hapus Draf Self-Assessment?',
              body: `Draf <strong class="mono">${esc(delId)}</strong> akan dihapus secara permanen.`,
              confirmText: 'Ya, Hapus Draf',
              confirmClass: 'btn-danger',
              onConfirm: async () => {
                try {
                  await API().deleteAssessment(delId);
                  app.toast(`Draf ${delId} berhasil dihapus.`, 'success');
                  loadList();
                } catch (err) {
                  app.toast(err.message || 'Gagal menghapus draf.', 'error');
                }
              }
            });
          });
        });
      } catch (err) {
        const eCard = renderErrorCard(err, loadList);
        listMount.innerHTML = eCard.html;
        eCard.bind(listMount, app);
      }
    }

    app.root.querySelectorAll('#history-tabs .filter-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        activeFilter = tab.dataset.filter;
        app.root.querySelectorAll('#history-tabs .filter-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        loadList();
      });
    });

    app.root.querySelector('#history-form-filter').addEventListener('change', (e) => { formFilter = e.target.value; loadList(); });
    let t = null;
    app.root.querySelector('#history-search').addEventListener('input', (e) => { searchText = e.target.value; clearTimeout(t); t = setTimeout(loadList, 300); });
    app.root.querySelector('#toggle-demo-mode')?.addEventListener('change', (e) => { showAllDemo = e.target.checked; loadList(); });

    loadList();
  }

  /* ========================================================================
     8. HASIL ASSESSMENT
     ======================================================================== */
  async function renderResultView(app, assessmentId) {
    const cfg = C().loadConfig();
    if (!C().isConfigured(cfg)) { location.hash = '#settings'; return; }

    const esc = U().escapeHtml;
    app.setHeader('Hasil Self-Assessment', `Resume klinis laporan ${assessmentId}`, '#history');
    app.root.innerHTML = renderSkeleton(3);

    try {
      const [hasilRes, detailRes] = await Promise.all([
        API().getAssessmentResult(assessmentId),
        API().getAssessment(assessmentId).catch(() => ({ data: {} }))
      ]);

      const raw = hasilRes.data || {};
      const detail = detailRes.data || {};
      const hasil = raw.hasil || raw;
      const perubahan = raw.perubahan || hasil.perubahan || detail.perubahan || null;
      const ringkasan = Array.isArray(hasil.ringkasan) ? hasil.ringkasan : [];
      const kel = hasil.kelengkapan || raw.kelengkapan || {};
      const skor = hasil.skor || raw.skor || null;
      const keterbatasan = hasil.keterbatasan || raw.keterbatasan || 'Hasil self-assessment bukan diagnosis. Hasil akan ditinjau bersama informasi lain oleh tenaga kesehatan.';
      const langkah = hasil.langkah_berikutnya || raw.langkah_berikutnya || 'Tunggu hasil peninjauan petugas. Pantau perkembangan di halaman Tracking Status.';

      let scoreCardHtml = '';
      if (skor) {
        const total = Number(skor.total ?? 0);
        const maks = Number(skor.maks ?? 21);
        const pct = Math.min(100, Math.round((total / Math.max(1, maks)) * 100));
        const r = 46;
        const c = 2 * Math.PI * r;
        const offset = c - (pct / 100) * c;
        const catKode = String(skor.kategori?.kode || '').toLowerCase();
        const strokeColor = catKode.includes('berat') ? '#e11d48'
          : catKode.includes('sedang') ? '#d97706'
          : catKode.includes('ringan') ? '#0284c7' : '#059669';

        scoreCardHtml = `
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Skor Instrumen GAD-7</h3>
                <p class="card-desc">Dihitung otomatis sesuai ambang instrumen klinis.</p>
              </div>
              <span class="badge ${U().getScoreCategoryClass(catKode)}">${esc(skor.kategori?.label || 'Skor')}</span>
            </div>
            <div class="score-hero">
              <div class="score-ring-wrap">
                <svg width="112" height="112" viewBox="0 0 112 112">
                  <circle cx="56" cy="56" r="${r}" fill="none" stroke="var(--border-strong)" stroke-width="10"></circle>
                  <circle cx="56" cy="56" r="${r}" fill="none" stroke="${strokeColor}" stroke-width="10"
                    stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}" transform="rotate(-90 56 56)"></circle>
                </svg>
                <div class="score-ring-text">
                  <span class="score-big">${total}</span>
                  <span class="score-max">dari ${maks}</span>
                </div>
              </div>
              <div>
                <p style="margin:0 0 10px;font-weight:600;">${esc(skor.keterangan || '')}</p>
                <div class="gad-scale-bar">
                  <div class="gad-segment seg-minimal ${catKode.includes('minimal') ? 'active' : ''}">0–4 Minimal</div>
                  <div class="gad-segment seg-ringan ${catKode.includes('ringan') ? 'active' : ''}">5–9 Ringan</div>
                  <div class="gad-segment seg-sedang ${catKode.includes('sedang') ? 'active' : ''}">10–14 Sedang</div>
                  <div class="gad-segment seg-berat ${catKode.includes('berat') ? 'active' : ''}">15–21 Berat</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      let diffCardHtml = '';
      if (perubahan && (perubahan.skor || (perubahan.perubahan && perubahan.perubahan.length > 0))) {
        const sc = perubahan.skor;
        const delta = sc ? Number(sc.selisih ?? (sc.sekarang - sc.sebelumnya)) : null;
        const deltaStr = delta !== null ? (delta > 0 ? `+${delta}` : `${delta}`) : '';
        const deltaCls = delta > 0 ? 'badge-warning' : (delta < 0 ? 'badge-success' : 'badge-neutral');

        diffCardHtml = `
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Perbandingan dengan Laporan Sebelumnya</h3>
                <p class="card-desc">Dibandingkan dengan <span class="mono fw-700">${esc(perubahan.pembanding_id || 'sebelumnya')}</span></p>
              </div>
              ${sc ? `<span class="badge ${deltaCls} mono">Skor ${esc(sc.sebelumnya)} → ${esc(sc.sekarang)} (${deltaStr})</span>` : ''}
            </div>
            ${Array.isArray(perubahan.perubahan) && perubahan.perubahan.length > 0 ? `
              <div class="summary-list">
                ${perubahan.perubahan.map((ch) => `
                  <div class="summary-row">
                    <div class="summary-key">${esc(ch.label || ch.question_id)}</div>
                    <div class="summary-val" style="font-weight:500;">
                      <span class="text-muted">${esc(ch.sebelumnya || 'Belum diisi')}</span>
                      <span style="margin:0 8px;color:var(--primary-600);font-weight:800;">→</span>
                      <strong>${esc(ch.sekarang || 'Belum diisi')}</strong>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : '<p class="text-sm text-muted" style="margin:0;">Tidak ada perubahan butir jawaban.</p>'}
          </div>
        `;
      }

      app.root.innerHTML = `
        <div class="stack-lg" style="max-width:880px;margin:0 auto;">
          <div class="card">
            <div class="card-header" style="margin-bottom:8px;">
              <div>
                <div class="badge-cluster" style="margin-bottom:8px;">
                  <span class="badge badge-primary mono">${esc(assessmentId)}</span>
                  ${detail.status_pengiriman ? U().getDeliveryBadge(detail.status_pengiriman) : ''}
                  ${detail.status_peninjauan ? U().getReviewBadge(detail.status_peninjauan) : ''}
                  ${kel.persen !== undefined ? `<span class="badge badge-success">Kelengkapan: ${esc(kel.label || '')} (${kel.persen}%)</span>` : ''}
                </div>
                <h2 class="card-title" style="font-size:1.32rem;">${esc(hasil.judul || detail.judul || detail.form?.judul || 'Resume Self-Assessment')}</h2>
                <p class="card-desc">
                  Pengisi: <strong>${esc(cfg.mahasiswa.nama)}</strong> (<span class="mono">${esc(cfg.mahasiswa.nim)}</span>)
                  · Akun Pasien: ${esc(app.state.patient?.nama || '—')}
                  ${detail.dikirim_pada ? ` · Dikirim ${esc(U().formatDateTime(detail.dikirim_pada))}` : ''}
                </p>
              </div>
              <div class="btn-row">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-export-json">${U().icon('download')} JSON</button>
                <button type="button" class="btn btn-primary btn-sm" id="btn-print-result">${U().icon('printer')} Cetak / PDF</button>
              </div>
            </div>
          </div>

          <div class="alert alert-warning" style="margin-bottom:0;">
            ${U().icon('shieldAlert')}
            <div class="alert-body">
              <div class="alert-title">Keterbatasan Hasil (Bukan Diagnosis Medis)</div>
              <p>${esc(keterbatasan)}</p>
            </div>
          </div>

          ${scoreCardHtml}
          ${diffCardHtml}

          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Ringkasan Jawaban Lengkap</h3>
                <p class="card-desc">Data pengukuran ditandai khusus; kolom kosong tampil sebagai <em>Belum diisi</em>.</p>
              </div>
            </div>
            <div class="summary-list">
              ${ringkasan.map((item) => {
                const isMeas = item.data_type === 'pengukuran';
                const filled = item.terisi !== false && item.jawaban_teks && item.jawaban_teks !== 'Belum diisi';
                const valHtml = filled
                  ? `${esc(item.jawaban_teks)}${item.satuan && !String(item.jawaban_teks).includes(item.satuan) ? ' ' + esc(item.satuan) : ''}`
                  : `<span class="unfilled-pill">Belum diisi</span>`;
                return `
                  <div class="summary-row">
                    <div class="summary-key">
                      <span>${esc(item.label || item.pertanyaan || item.question_id)}</span>
                      ${isMeas ? `<span class="badge badge-info" style="padding:2px 7px;font-size:0.68rem;">Pengukuran</span>` : ''}
                    </div>
                    <div class="summary-val">${valHtml}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="alert alert-info" style="margin-bottom:0;">
            ${U().icon('activity')}
            <div class="alert-body">
              <div class="alert-title">Langkah Berikutnya</div>
              <p>${esc(langkah)}</p>
            </div>
          </div>

          <div class="btn-row" style="justify-content:space-between;">
            <a href="#history" class="btn btn-secondary">${U().icon('arrowLeft')} Kembali ke Riwayat</a>
            <a href="#status/${encodeURIComponent(assessmentId)}" class="btn btn-primary btn-lg">Pantau Status &amp; Tindak Lanjut ${U().icon('arrowRight')}</a>
          </div>
        </div>
      `;

      app.root.querySelector('#btn-print-result')?.addEventListener('click', () => window.print());
      app.root.querySelector('#btn-export-json')?.addEventListener('click', () => {
        U().downloadFile(`hasil-${assessmentId}.json`, JSON.stringify({ hasil: raw, detail }, null, 2));
        app.toast(`File hasil-${assessmentId}.json diunduh.`, 'success');
      });
    } catch (err) {
      const eCard = renderErrorCard(err, () => renderResultView(app, assessmentId));
      app.root.innerHTML = eCard.html;
      eCard.bind(app.root, app);
    }
  }

  /* ========================================================================
     9. TRACKING STATUS, KLARIFIKASI & TINDAK LANJUT (+ SIMULASI PETUGAS DI DEMO)
     ======================================================================== */
  async function renderStatusView(app, assessmentId, isSilentRefresh = false) {
    const cfg = C().loadConfig();
    if (!C().isConfigured(cfg)) { location.hash = '#settings'; return; }

    const esc = U().escapeHtml;
    app.setHeader('Tracking Status & Tindak Lanjut', `Pelacakan peninjauan laporan ${assessmentId}`, '#history');
    if (!isSilentRefresh) app.root.innerHTML = renderSkeleton(3);

    try {
      const [statusRes, detailRes] = await Promise.all([
        API().getAssessmentStatus(assessmentId),
        API().getAssessment(assessmentId).catch(() => ({ data: {} }))
      ]);

      const st = statusRes.data || {};
      const detail = detailRes.data || {};
      const revCode = st.status_peninjauan?.kode || 'menunggu_peninjauan';
      const delivCode = st.status_pengiriman?.kode || 'terkirim';
      const pesan = st.pesan || st.pesan_status || detail.pesan_status || '';
      const pendingClar = Array.isArray(st.klarifikasi_menunggu) ? st.klarifikasi_menunggu : [];
      const allClar = Array.isArray(st.klarifikasi) ? st.klarifikasi : (Array.isArray(detail.klarifikasi) ? detail.klarifikasi : []);
      const answeredClar = allClar.filter((c) => c.status !== 'menunggu_jawaban' && c.jawaban);
      const tindakLanjut = st.tindak_lanjut || detail.tindak_lanjut || null;
      const timeline = Array.isArray(st.timeline) ? st.timeline : (Array.isArray(detail.timeline) ? detail.timeline : []);

      const stepOrder = {
        belum_dikirim: 0, menunggu_peninjauan: 1, sedang_ditinjau: 2,
        perlu_klarifikasi: 3, klarifikasi_dijawab: 3, sudah_ditinjau: 4
      };
      const curIdx = stepOrder[revCode] ?? 1;
      const steps = ['Draf', 'Terkirim', 'Ditinjau', 'Klarifikasi', 'Selesai'];

      const followupTypeMap = {
        jadwalkan_konsultasi: 'badge-primary',
        pemantauan_mandiri: 'badge-info',
        rujuk_faskes: 'badge-warning',
        kunjungan_langsung: 'badge-danger',
        tidak_perlu: 'badge-success'
      };

      const isPolling = Boolean(app.state.statusPollingActive);
      const canSimulateStaff = cfg.mode === 'demo' && delivCode === 'terkirim' && revCode !== 'sudah_ditinjau';

      app.root.innerHTML = `
        <div class="stack-lg" style="max-width:880px;margin:0 auto;">
          <div class="card">
            <div class="card-header">
              <div>
                <h2 class="card-title">Status Laporan <span class="mono">${esc(assessmentId)}</span></h2>
                <p class="card-desc">Status pengiriman dan status peninjauan ditampilkan terpisah.</p>
              </div>
              <div class="btn-row">
                <label class="badge ${isPolling ? 'badge-success' : 'badge-neutral'}" style="cursor:pointer;padding:6px 11px;">
                  <input type="checkbox" id="toggle-live-poll" ${isPolling ? 'checked' : ''} style="accent-color:var(--primary-600);margin:0 4px 0 0;" />
                  <span>Auto-Sync 30 dtk</span>
                </label>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-status">${U().icon('refresh')} Segarkan</button>
              </div>
            </div>

            <div class="status-split-grid">
              <div class="status-box">
                <span class="status-box-label">Status Pengiriman</span>
                <div>${U().getDeliveryBadge(st.status_pengiriman || delivCode)}</div>
              </div>
              <div class="status-box">
                <span class="status-box-label">Status Peninjauan Petugas</span>
                <div>${U().getReviewBadge(st.status_peninjauan || revCode)}</div>
              </div>
            </div>

            ${pesan ? `
              <div class="alert ${revCode === 'perlu_klarifikasi' ? 'alert-warning' : (revCode === 'sudah_ditinjau' ? 'alert-success' : 'alert-info')}" style="margin-bottom:14px;">
                ${U().icon(revCode === 'perlu_klarifikasi' ? 'message' : 'activity')}
                <div class="alert-body">${esc(pesan)}</div>
              </div>
            ` : ''}

            <div class="journey-stepper">
              ${steps.map((lbl, idx) => {
                let cls = '';
                if (revCode === 'sudah_ditinjau') cls = 'done';
                else if (idx < curIdx) cls = 'done';
                else if (idx === curIdx) cls = 'current';
                return `
                  <div class="journey-step ${cls}">
                    <div class="journey-dot">${cls === 'done' ? '✓' : idx + 1}</div>
                    <div class="journey-label">${lbl}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          ${canSimulateStaff ? `
            <div class="card" style="border-color:var(--indigo-border);background:var(--indigo-bg);">
              <div class="card-header" style="margin-bottom:10px;">
                <div>
                  <h3 class="card-title" style="color:var(--indigo-text);">Simulasi Aksi Petugas (Khusus Mode Demo)</h3>
                  <p class="card-desc">Uji bagaimana pasien menerima permintaan klarifikasi dan arahan tindak lanjut secara instan.</p>
                </div>
                <span class="badge badge-indigo">Sandbox Controls</span>
              </div>
              <div class="btn-row">
                <button type="button" class="btn btn-warning btn-sm" id="btn-sim-clarify">Simulasikan Petugas Minta Klarifikasi</button>
                <button type="button" class="btn btn-primary btn-sm" id="btn-sim-followup">Simulasikan Tindak Lanjut &amp; Jadwal Konsultasi</button>
              </div>
            </div>
          ` : ''}

          ${tindakLanjut ? `
            <div class="card followup-card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Arahan Tindak Lanjut Petugas</h3>
                  <p class="card-desc">Laporan Anda telah selesai ditinjau oleh tenaga kesehatan.</p>
                </div>
                <span class="badge ${followupTypeMap[tindakLanjut.jenis?.kode] || 'badge-success'}">
                  ${esc(tindakLanjut.jenis?.label || tindakLanjut.jenis || 'Tindak Lanjut')}
                </span>
              </div>

              <p style="margin:0;font-size:0.96rem;font-weight:600;color:var(--text-primary);">${esc(tindakLanjut.arahan || '')}</p>

              ${tindakLanjut.jadwal_konsultasi ? `
                <div class="schedule-highlight">
                  <div style="display:flex;align-items:center;gap:12px;">
                    <div class="form-icon-box" style="width:42px;height:42px;">${U().icon('calendar')}</div>
                    <div>
                      <div class="text-sm text-muted">Jadwal Konsultasi Disarankan</div>
                      <div class="fw-700" style="font-size:1rem;">${esc(U().formatDateTime(tindakLanjut.jadwal_konsultasi))}</div>
                    </div>
                  </div>
                  <button type="button" class="btn btn-primary btn-sm" id="btn-download-ics">
                    ${U().icon('download')} Simpan ke Kalender (.ics)
                  </button>
                </div>
              ` : ''}

              <div class="text-sm text-muted" style="margin-top:12px;">
                Dicatat oleh <strong>${esc(tindakLanjut.dicatat_oleh?.nama || 'Petugas')}</strong>
                ${tindakLanjut.dicatat_pada ? ` · ${esc(U().formatDateTime(tindakLanjut.dicatat_pada))}` : ''}
              </div>
            </div>
          ` : ''}

          ${pendingClar.length > 0 ? `
            <div class="card" style="border-color:var(--warning-border);">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Permintaan Klarifikasi Petugas</h3>
                  <p class="card-desc">Jawab pertanyaan tambahan di bawah ini agar peninjauan dapat dilanjutkan.</p>
                </div>
                <span class="badge badge-warning">${pendingClar.length} Menunggu Jawaban</span>
              </div>
              <div class="stack-md">
                ${pendingClar.map((kl) => `
                  <form class="clarification-form" data-cid="${esc(kl.id)}" style="padding:16px;border-radius:14px;background:var(--bg-subtle);border:1px solid var(--border-color);">
                    <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px;">
                      <span class="badge badge-warning mono">${esc(kl.id)}</span>
                      ${kl.dibuat_pada ? `<span class="text-sm text-muted">${esc(U().formatDateTime(kl.dibuat_pada))}</span>` : ''}
                    </div>
                    <p style="margin:0 0 12px;font-weight:700;font-size:0.95rem;">Petugas: "${esc(kl.pertanyaan)}"</p>
                    <div class="field-group" style="margin-bottom:10px;">
                      <label class="field-label text-sm" for="clar_${esc(kl.id)}">Jawaban Anda <span class="required-star">*</span></label>
                      <textarea class="textarea-input" id="clar_${esc(kl.id)}" name="jawaban" placeholder="Tuliskan penjelasan tambahan Anda secara jelas..." required></textarea>
                      <div class="field-error hidden" data-clar-err="${esc(kl.id)}"></div>
                    </div>
                    <button type="submit" class="btn btn-primary">${U().icon('send')} Kirim Jawaban Klarifikasi</button>
                  </form>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${answeredClar.length > 0 ? `
            <div class="card">
              <h3 class="card-title" style="margin-bottom:12px;">Riwayat Klarifikasi Terjawab</h3>
              <div class="stack-sm">
                ${answeredClar.map((kl) => `
                  <div style="padding:13px 15px;border-radius:12px;background:var(--bg-subtle);border:1px solid var(--border-color);">
                    <div class="badge-cluster" style="margin-bottom:6px;">
                      <span class="badge badge-success mono">${esc(kl.id)}</span>
                      <span class="badge badge-neutral">Terjawab</span>
                    </div>
                    <div class="text-sm"><strong>Petugas:</strong> ${esc(kl.pertanyaan)}</div>
                    <div class="text-sm" style="margin-top:6px;color:var(--primary-700);"><strong>Jawaban Anda:</strong> ${esc(kl.jawaban)}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="card">
            <h3 class="card-title" style="margin-bottom:16px;">Timeline Aktivitas Laporan</h3>
            ${timeline.length > 0 ? `
              <div class="timeline">
                ${timeline.slice().reverse().map((ev) => {
                  const typeCls = String(ev.event || '').includes('klarifikasi_diminta')
                    ? 'is-warning'
                    : (String(ev.event || '').includes('tindak_lanjut') ? 'is-success' : '');
                  return `
                    <div class="timeline-item ${typeCls}">
                      <span class="timeline-node"></span>
                      <p class="timeline-title">${esc(ev.keterangan || ev.event || 'Perubahan status')}</p>
                      <div class="timeline-meta">
                        ${esc(U().formatDateTime(ev.waktu))}
                        ${ev.oleh ? ` · ${esc(typeof ev.oleh === 'string' ? ev.oleh : ev.oleh.nama || '')}` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : '<div class="empty-mini">Belum ada catatan timeline.</div>'}
          </div>

          <div class="btn-row" style="justify-content:space-between;">
            <a href="#result/${encodeURIComponent(assessmentId)}" class="btn btn-secondary">Lihat Hasil Assessment</a>
            <a href="#history" class="btn btn-ghost">Kembali ke Riwayat</a>
          </div>
        </div>
      `;

      let pollInterval = null;
      function stopPoll() { if (pollInterval) { clearInterval(pollInterval); pollInterval = null; } }
      app.registerCleanup(stopPoll);

      function startPollIfNeeded() {
        stopPoll();
        if (app.state.statusPollingActive) {
          pollInterval = setInterval(() => renderStatusView(app, assessmentId, true), 30000);
        }
      }
      startPollIfNeeded();

      app.root.querySelector('#toggle-live-poll')?.addEventListener('change', (e) => {
        app.state.statusPollingActive = e.target.checked;
        startPollIfNeeded();
        app.toast(`Auto-Sync status 30 detik ${e.target.checked ? 'diaktifkan' : 'dimatikan'}.`, 'info');
      });

      app.root.querySelector('#btn-refresh-status').addEventListener('click', () => {
        app.toast('Memeriksa status terbaru...', 'info');
        renderStatusView(app, assessmentId);
      });

      app.root.querySelector('#btn-sim-clarify')?.addEventListener('click', () => {
        global.TelehealthDemoMock?.simulateStaffAction(assessmentId, 'clarify');
        app.toast('Simulasi: Petugas meminta klarifikasi!', 'warning');
        renderStatusView(app, assessmentId);
      });

      app.root.querySelector('#btn-sim-followup')?.addEventListener('click', () => {
        global.TelehealthDemoMock?.simulateStaffAction(assessmentId, 'followup');
        app.toast('Simulasi: Petugas mencatat tindak lanjut & jadwal konsultasi!', 'success');
        renderStatusView(app, assessmentId);
      });

      app.root.querySelector('#btn-download-ics')?.addEventListener('click', () => {
        U().downloadConsultationIcs({
          assessmentId,
          dateIso: tindakLanjut.jadwal_konsultasi,
          description: tindakLanjut.arahan,
          reviewer: tindakLanjut.dicatat_oleh?.nama
        });
        app.toast('File jadwal kalender (.ics) diunduh!', 'success');
      });

      app.root.querySelectorAll('.clarification-form').forEach((formEl) => {
        formEl.addEventListener('submit', async (e) => {
          e.preventDefault();
          const cid = formEl.dataset.cid;
          const textarea = formEl.querySelector('textarea[name="jawaban"]');
          const errBox = formEl.querySelector(`[data-clar-err="${cid}"]`);
          const submitBtn = formEl.querySelector('button[type="submit"]');
          const jawaban = textarea.value.trim();

          errBox.classList.add('hidden');
          if (!jawaban) {
            errBox.textContent = 'Jawaban klarifikasi tidak boleh kosong.';
            errBox.classList.remove('hidden');
            return;
          }

          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span class="spin">${U().icon('refresh')}</span> Mengirim...`;
          try {
            await API().replyClarification(assessmentId, cid, jawaban);
            app.toast('Jawaban klarifikasi berhasil dikirim!', 'success');
            renderStatusView(app, assessmentId);
          } catch (err) {
            errBox.textContent = err.message || 'Gagal mengirim klarifikasi.';
            errBox.classList.remove('hidden');
            app.toast(err.message, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = `${U().icon('send')} Kirim Jawaban Klarifikasi`;
          }
        });
      });
    } catch (err) {
      const eCard = renderErrorCard(err, () => renderStatusView(app, assessmentId));
      app.root.innerHTML = eCard.html;
      eCard.bind(app.root, app);
    }
  }

  /* ========================================================================
     10. UTS MISSION CONTROL & DIAGNOSTIC TEST BENCH
     ======================================================================== */
  async function renderUtsView(app) {
    const cfg = C().loadConfig();
    if (!C().isConfigured(cfg)) { location.hash = '#settings'; return; }

    const esc = U().escapeHtml;
    app.setHeader('UTS Mission Control', `Bukti fitur otomatis, penilaian dosen & API Test Bench · ${cfg.mahasiswa.nim}`, null);
    app.root.innerHTML = renderSkeleton(3);

    try {
      let uts = null;
      let notStarted = false;
      try {
        const res = await API().getUtsStatus(cfg.mahasiswa.nim);
        uts = res.data;
      } catch (e) {
        if (e.status === 404) notStarted = true;
        else throw e;
      }

      const fallbackMap = {};
      C().UTS_FEATURE_FALLBACK.forEach((f) => { fallbackMap[f.kode] = f; });

      const bf = uts?.bukti_fitur || { tercapai: 0, total: 10, daftar: C().UTS_FEATURE_FALLBACK };
      const achieved = bf.tercapai ?? 0;
      const total = bf.total ?? 10;
      const pct = total > 0 ? Math.round((achieved / total) * 100) : 0;
      app.updateUtsBadge(achieved, total);

      const pen = uts?.penilaian || {};
      const jml = uts?.jumlah || {};
      const daftar = Array.isArray(bf.daftar) ? bf.daftar : C().UTS_FEATURE_FALLBACK;

      app.root.innerHTML = `
        <div class="stack-lg">
          ${notStarted ? `
            <div class="alert alert-info" style="margin-bottom:0;">
              ${U().icon('award')}
              <div class="alert-body">
                <div class="alert-title">NIM ${esc(cfg.mahasiswa.nim)} Belum Tercatat di Server</div>
                <p>Kirim formulir keluhan pertama Anda agar bukti fitur otomatis terekam.</p>
              </div>
              <a href="#guide/FRM-KELUHAN" class="btn btn-primary btn-sm">Mulai Sekarang</a>
            </div>
          ` : ''}

          <div class="grid-2">
            <div class="card">
              <div class="card-header">
                <div>
                  <h2 class="card-title">Identitas Mahasiswa</h2>
                  <p class="card-desc">Endpoint <code class="mono">GET /api/uts/${esc(cfg.mahasiswa.nim)}</code></p>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-uts">${U().icon('refresh')} Segarkan</button>
              </div>
              <div class="stack-sm text-sm">
                <div><strong>NIM:</strong> <span class="mono">${esc(uts?.nim || cfg.mahasiswa.nim)}</span></div>
                <div><strong>Nama:</strong> ${esc(uts?.nama || cfg.mahasiswa.nama)}</div>
                <div><strong>Kelas:</strong> ${esc(uts?.kelas || cfg.mahasiswa.kelas)}</div>
              </div>
              <div class="divider"></div>
              <div class="badge-cluster">
                <span class="badge badge-neutral">Total: ${jml.total ?? 0}</span>
                <span class="badge badge-info">Terkirim: ${jml.terkirim ?? 0}</span>
                <span class="badge badge-warning">Draf: ${jml.draf ?? 0}</span>
                <span class="badge badge-success">Ditinjau: ${jml.sudah_ditinjau ?? 0}</span>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <div>
                  <h2 class="card-title">Status Penilaian Dosen</h2>
                  <p class="card-desc">Hasil pemeriksaan dari dashboard dosen</p>
                </div>
                ${U().getGradingBadge(pen.status)}
              </div>
              <p class="text-sm" style="margin:0 0 10px;">
                <strong>Catatan Dosen:</strong> ${esc(pen.catatan || 'Belum ada catatan dari dosen pengampu.')}
              </p>
              ${pen.diperiksa_pada ? `<div class="text-sm text-muted">Diperiksa pada ${esc(U().formatDateTime(pen.diperiksa_pada))}</div>` : ''}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <h2 class="card-title">Checklist Bukti Fitur (${achieved} / ${total})</h2>
                <p class="card-desc">Gunakan tombol aksi cepat di sebelah fitur yang belum tercentang.</p>
              </div>
              <span class="badge ${achieved === total ? 'badge-success' : 'badge-primary'} mono">${pct}%</span>
            </div>

            <div class="progress-track" style="height:10px;margin-bottom:18px;">
              <div class="progress-fill" style="width:${pct}%;"></div>
            </div>

            <div class="uts-feature-grid">
              ${daftar.map((item) => {
                const meta = fallbackMap[item.kode] || {};
                return `
                  <div class="uts-feature-item ${item.tercapai ? 'done' : ''}">
                    <div style="display:flex;gap:10px;align-items:flex-start;">
                      <div class="uts-check">${item.tercapai ? U().icon('check') : ''}</div>
                      <div>
                        <div class="fw-700 text-sm">${esc(item.label || meta.label || item.kode)}</div>
                        <div class="mono text-muted" style="font-size:0.71rem;margin-top:2px;">kode: ${esc(item.kode)}</div>
                      </div>
                    </div>
                    ${(!item.tercapai && meta.actionHash) ? `
                      <a href="${meta.actionHash}" class="btn btn-secondary btn-sm" style="flex-shrink:0;">${esc(meta.actionText || 'Uji')}</a>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Safe API Diagnostic Test Bench</h3>
                <p class="card-desc">Uji penanganan HTTP 200, 401, 403, dan 404 secara aman tanpa mengubah data laporan.</p>
              </div>
              <span class="badge badge-indigo mono">${U().icon('zap')} Diagnostics</span>
            </div>
            <div class="btn-row">
              <button type="button" class="btn btn-secondary btn-sm" data-diag="200">Uji GET /api (200)</button>
              <button type="button" class="btn btn-secondary btn-sm" data-diag="401">Simulasi Token Salah (401)</button>
              <button type="button" class="btn btn-secondary btn-sm" data-diag="403">Simulasi Akses Petugas (403)</button>
              <button type="button" class="btn btn-secondary btn-sm" data-diag="404">Simulasi Form Tidak Ada (404)</button>
              <button type="button" class="btn btn-primary btn-sm" id="btn-open-log-bench">${U().icon('terminal')} Buka API Inspector</button>
            </div>
            <div id="diag-output" style="margin-top:14px;"></div>
          </div>
        </div>
      `;

      app.root.querySelector('#btn-refresh-uts').addEventListener('click', () => renderUtsView(app));
      app.root.querySelector('#btn-open-log-bench').addEventListener('click', () => app.openInspector());

      const diagOut = app.root.querySelector('#diag-output');
      app.root.querySelectorAll('[data-diag]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const mode = btn.dataset.diag;
          diagOut.innerHTML = `<div class="alert alert-info" style="margin-bottom:0;"><div class="alert-body">Menjalankan uji HTTP ${mode}...</div></div>`;
          try {
            if (mode === '200') {
              const r = await API().health();
              diagOut.innerHTML = `<div class="alert alert-success" style="margin-bottom:0;"><div class="alert-body"><strong>Lulus (HTTP 200):</strong> ${esc(r.message)}</div></div>`;
            } else if (mode === '401') {
              await API().request('/me', { token: 'tlh_pasien_TOKEN_SALAH_UJI' });
            } else if (mode === '403') {
              await API().request('/review/queue');
            } else if (mode === '404') {
              await API().getFormDetail('FRM-XYZ');
            }
          } catch (err) {
            const matched = String(err.status) === mode;
            diagOut.innerHTML = `
              <div class="alert ${matched ? 'alert-success' : 'alert-warning'}" style="margin-bottom:0;">
                <div class="alert-body"><strong>${matched ? `Lulus Penanganan HTTP ${err.status}` : `HTTP ${err.status}`}:</strong> ${esc(err.message)}</div>
              </div>
            `;
          }
        });
      });
    } catch (err) {
      const eCard = renderErrorCard(err, () => renderUtsView(app));
      app.root.innerHTML = eCard.html;
      eCard.bind(app.root, app);
    }
  }

/* ========================================================================
     11. PENGATURAN & OTORISASI LIVE API (PASSWORD GATE)
     ======================================================================== */
  async function renderSettingsView(app) {
    const cfg = C().loadConfig();
    const esc = U().escapeHtml;
    const unlocked = C().isLiveUnlocked();
    const presets = C().getPatientPresets();
    const hasLocalTokens = presets.some((p) => p.token && !p.token.startsWith('ISI_'));

    app.setHeader(
      'Pengaturan & Koneksi API',
      unlocked ? 'Sesi Pemilik Terbuka · Kelola Live API & Identitas' : 'Mode Demo Sandbox Aktif · Akses Live API Terkunci Password',
      null
    );

    const presetsHtml = presets.map((p) => {
      const hasTok = Boolean(p.token && !p.token.startsWith('ISI_'));
      const active = hasTok && cfg.token === p.token ? 'selected' : '';
      return `
        <button type="button" class="preset-card ${active}" data-preset-token="${esc(hasTok ? p.token : '')}" data-preset-id="${esc(p.id)}" ${hasTok ? '' : 'disabled style="opacity:0.55;cursor:not-allowed;"'}>
          <div class="preset-id">${esc(p.id)} ${hasTok ? '' : '· (Lokal)'}</div>
          <div class="preset-name">${esc(p.nama)}</div>
          <div class="preset-desc">${esc(p.keterangan)}</div>
        </button>
      `;
    }).join('');

    app.root.innerHTML = `
      <form id="settings-form" class="stack-lg" style="max-width:860px;margin:0 auto;" novalidate>
        <!-- Mode Operasi -->
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Status Mode Operasi</h2>
              <p class="card-desc">
                ${unlocked
                  ? 'Sesi pemilik terbuka. Anda dapat beralih bebas antara <strong>Live API</strong> dan <strong>Mode Demo Sandbox</strong>.'
                  : 'Saat ini berjalan pada <strong>Mode Demo Pure Sandbox</strong> (100% lokal di browser, tidak menyentuh server API asli).'}
              </p>
            </div>
            <span class="badge ${cfg.mode === 'demo' ? 'badge-indigo' : 'badge-success'}">
              ${cfg.mode === 'demo' ? 'Pure Demo Sandbox' : 'Live API Aktif'}
            </span>
          </div>

          ${unlocked ? `
            <div class="grid-2">
              <label class="choice-option ${cfg.mode === 'live' ? 'selected' : ''}" id="mode-live-opt">
                <input type="radio" name="app_mode" value="live" ${cfg.mode === 'live' ? 'checked' : ''} />
                <div>
                  <div class="choice-text">Live API Server</div>
                  <div class="text-muted" style="font-size:0.76rem;">Terhubung langsung ke API Telehealth v2.0 dengan Token Bearer.</div>
                </div>
              </label>
              <label class="choice-option ${cfg.mode === 'demo' ? 'selected' : ''}" id="mode-demo-opt">
                <input type="radio" name="app_mode" value="demo" ${cfg.mode === 'demo' ? 'checked' : ''} />
                <div>
                  <div class="choice-text">Demo Interaktif (Pure Sandbox)</div>
                  <div class="text-muted" style="font-size:0.76rem;">Simulasi lokal tanpa menyentuh server API asli.</div>
                </div>
              </label>
            </div>
          ` : `
            <div class="alert alert-info" style="margin-bottom:0;">
              ${U().icon('lock')}
              <div class="alert-body">
                <div class="alert-title">Akses Live API Dilindungi Password Pemilik</div>
                <p>Hanya pemilik akun (<strong>Azis Toriq Maulana</strong>) yang dapat membuka koneksi Live API agar pengujian pengunjung tidak mengubah data server.</p>
              </div>
              <button type="button" class="btn btn-primary btn-sm" id="btn-unlock-settings">${U().icon('lock')} Buka Akses Pemilik</button>
            </div>
          `}
        </div>

        <!-- Identitas Aktif -->
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">${cfg.mode === 'live' ? 'Identitas Mahasiswa (Live API)' : 'Identitas Pengunjung (Mode Demo)'}</h2>
              <p class="card-desc">
                ${cfg.mode === 'live'
                  ? 'Ditampilkan di sapaan Beranda dan dikirim di setiap pengisian self-assessment untuk penilaian NIM.'
                  : 'Hanya digunakan secara lokal di Mode Demo untuk personalisasi sapaan Beranda.'}
              </p>
            </div>
            <span class="badge ${cfg.mode === 'live' ? 'badge-primary' : 'badge-indigo'}">${cfg.mode === 'live' ? 'Live NIM' : 'Sandbox'}</span>
          </div>

          <div class="grid-2">
            <div class="field-group" style="margin-bottom:0;">
              <label class="field-label" for="set-nim">NIM / ID <span class="required-star">*</span></label>
              <input type="text" id="set-nim" class="text-input mono" value="${esc(cfg.mahasiswa.nim)}" placeholder="${cfg.mode === 'live' ? 'C2C023180' : 'DEMO2026'}" maxlength="20" required />
            </div>
            <div class="field-group" style="margin-bottom:0;">
              <label class="field-label" for="set-kelas">Kelas / Label <span class="required-star">*</span></label>
              <input type="text" id="set-kelas" class="text-input" value="${esc(cfg.mahasiswa.kelas)}" placeholder="${cfg.mode === 'live' ? 'E REGULER' : 'SANDBOX'}" maxlength="20" required />
            </div>
          </div>

          <div class="field-group" style="margin-top:16px;margin-bottom:0;">
            <label class="field-label" for="set-nama">Nama Lengkap <span class="required-star">*</span></label>
            <input type="text" id="set-nama" class="text-input" value="${esc(cfg.mahasiswa.nama)}" placeholder="Nama lengkap Anda..." maxlength="100" required />
          </div>

          <label style="display:flex;align-items:center;gap:9px;font-size:0.86rem;font-weight:700;cursor:pointer;margin-top:16px;">
            <input type="checkbox" id="set-autosave" ${cfg.autoSave !== false ? 'checked' : ''} style="accent-color:var(--primary-600);width:17px;height:17px;" />
            <span>Aktifkan Auto-Save Draf Otomatis saat mengisi formulir</span>
          </label>
        </div>

        <!-- Koneksi Live API (Hanya Terlihat Setelah Password Pemilik Diverifikasi) -->
        ${unlocked ? `
          <div class="card" id="live-api-section">
            <div class="card-header">
              <div>
                <h2 class="card-title">Koneksi Live API &amp; Token Pasien</h2>
                <p class="card-desc">Token disimpan di <code class="mono">localStorage</code> browser Anda dan tidak pernah diunggah ke repository GitHub publik.</p>
              </div>
              <button type="button" class="btn btn-danger btn-sm" id="btn-lock-owner">${U().icon('lock')} Kunci Sesi Pemilik</button>
            </div>

            ${hasLocalTokens ? `
              <div class="field-label text-sm" style="margin-bottom:8px;">Pilih Cepat Akun Pasien (dari konfigurasi lokal)</div>
              <div class="preset-grid">${presetsHtml}</div>
            ` : `
              <div class="alert alert-info" style="margin-bottom:16px;">
                ${U().icon('shieldAlert')}
                <div class="alert-body text-sm">
                  <strong>Deployment Publik Aman:</strong> Tempel Token Bearer pasien dari dosen di bawah ini untuk menghubungkan browser Anda ke Live API.
                </div>
              </div>
            `}

            <div class="field-group">
              <label class="field-label" for="set-token">Token Bearer Pasien</label>
              <div class="input-with-addon">
                <input type="password" id="set-token" class="text-input mono" value="${esc(cfg.token)}" placeholder="tlh_pasien_..." />
                <button type="button" class="btn btn-secondary" id="btn-toggle-token">Lihat</button>
              </div>
            </div>

            <div class="field-group" style="margin-bottom:0;">
              <label class="field-label" for="set-api-base">Base URL API</label>
              <input type="url" id="set-api-base" class="text-input mono" value="${esc(cfg.apiBase)}" />
            </div>
          </div>
        ` : ''}

        <div id="settings-feedback"></div>

        <div class="btn-row" style="justify-content:space-between;">
          <div class="btn-row">
            <button type="submit" class="btn btn-primary btn-lg" id="btn-save-settings">${U().icon('check')} Simpan &amp; Masuk Beranda</button>
            ${unlocked ? `<button type="button" class="btn btn-secondary" id="btn-ping-api">${U().icon('activity')} Cek Server GET /api</button>` : ''}
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-reset-cfg">Reset Pengaturan</button>
        </div>
      </form>
    `;

    const formEl = app.root.querySelector('#settings-form');
    const feedbackEl = app.root.querySelector('#settings-feedback');
    const tokenInput = app.root.querySelector('#set-token');
    const toggleBtn = app.root.querySelector('#btn-toggle-token');

    app.root.querySelector('#btn-unlock-settings')?.addEventListener('click', () => {
      app.openOwnerPasswordModal(() => renderSettingsView(app));
    });

    app.root.querySelector('#btn-lock-owner')?.addEventListener('click', () => {
      app.lockLivePortal();
    });

    formEl.querySelectorAll('input[name="app_mode"]').forEach((r) => {
      r.addEventListener('change', () => {
        const isDemo = r.value === 'demo';
        app.root.querySelector('#mode-live-opt')?.classList.toggle('selected', !isDemo);
        app.root.querySelector('#mode-demo-opt')?.classList.toggle('selected', isDemo);
      });
    });

    toggleBtn?.addEventListener('click', () => {
      const isPwd = tokenInput.type === 'password';
      tokenInput.type = isPwd ? 'text' : 'password';
      toggleBtn.textContent = isPwd ? 'Sembunyikan' : 'Lihat';
    });

    app.root.querySelectorAll('.preset-card:not([disabled])').forEach((card) => {
      card.addEventListener('click', () => {
        if (tokenInput) tokenInput.value = card.dataset.presetToken;
        app.root.querySelectorAll('.preset-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        app.toast(`Token ${card.dataset.presetId} dipilih.`, 'info');
      });
    });

    app.root.querySelector('#btn-reset-cfg').addEventListener('click', () => {
      C().resetConfig();
      app.syncChromeState();
      app.toast('Pengaturan dikembalikan ke default.', 'info');
      renderSettingsView(app);
    });

    app.root.querySelector('#btn-ping-api')?.addEventListener('click', async () => {
      const baseUrl = app.root.querySelector('#set-api-base')?.value.trim();
      feedbackEl.innerHTML = `<div class="alert alert-info" style="margin-bottom:0;"><div class="alert-body">Menghubungi <code class="mono">${esc(baseUrl)}</code>...</div></div>`;
      try {
        const res = await API().health(baseUrl, true);
        const d = res.data || {};
        feedbackEl.innerHTML = `
          <div class="alert alert-success" style="margin-bottom:0;">
            ${U().icon('check')}
            <div class="alert-body">
              <div class="alert-title">${esc(res.message || 'API Aktif')}</div>
              <p>${esc(d.nama || 'API Self-Assessment Telehealth')} v${esc(d.versi || '2.0.0')} · ${(d.endpoint || []).length} endpoint tersedia.</p>
            </div>
          </div>
        `;
      } catch (err) {
        feedbackEl.innerHTML = `<div class="alert alert-danger" style="margin-bottom:0;">${U().icon('alertTriangle')}<div class="alert-body">${esc(err.message)}</div></div>`;
      }
    });

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const mode = unlocked ? (formEl.querySelector('input[name="app_mode"]:checked')?.value || cfg.mode) : 'demo';
      const nim = app.root.querySelector('#set-nim').value.trim().toUpperCase();
      const nama = app.root.querySelector('#set-nama').value.trim();
      const kelas = app.root.querySelector('#set-kelas').value.trim();
      const autoSave = app.root.querySelector('#set-autosave').checked;

      const errs = C().validateMahasiswaInput({ nim, nama, kelas });

      if (mode === 'demo') {
        if (errs.length > 0) {
          feedbackEl.innerHTML = `<div class="alert alert-danger" style="margin-bottom:0;">${U().icon('alertTriangle')}<div class="alert-body"><ul style="margin:0 0 0 18px;padding:0;">${errs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
          return;
        }
        C().saveConfig({ mode: 'demo', demoMahasiswa: { nim, nama, kelas }, autoSave });
        app.state.patient = null;
        app.syncChromeState();
        app.toast(`Profil Mode Demo disimpan untuk ${nama}!`, 'success');
        location.hash = '#home';
        return;
      }

      const token = tokenInput?.value.trim() || '';
      const apiBase = app.root.querySelector('#set-api-base')?.value.trim().replace(/\/+$/, '') || C().DEFAULT_API_BASE;
      if (!token) errs.push('Token Bearer pasien wajib diisi untuk Mode Live API.');
      if (!apiBase) errs.push('Base URL API wajib diisi.');

      if (errs.length > 0) {
        feedbackEl.innerHTML = `<div class="alert alert-danger" style="margin-bottom:0;">${U().icon('alertTriangle')}<div class="alert-body"><ul style="margin:0 0 0 18px;padding:0;">${errs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
        return;
      }

      const saveBtn = app.root.querySelector('#btn-save-settings');
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span class="spin">${U().icon('refresh')}</span> Memverifikasi Token...`;

      try {
        const meRes = await API().getMe(nim, { token, baseUrl: apiBase, forceLive: true });
        C().saveConfig({ mode: 'live', apiBase, token, liveMahasiswa: { nim, nama, kelas }, autoSave });
        app.state.patient = meRes.data;
        app.syncChromeState();
        app.setConnectionStatus('online', `Live · ${meRes.data?.id || 'API'}`);
        app.toast(`Terhubung ke Live API sebagai ${nama} (Pasien ${meRes.data?.id || ''}).`, 'success');
        location.hash = '#home';
      } catch (err) {
        app.setConnectionStatus('error', `HTTP ${err.status || 'ERR'}`);
        feedbackEl.innerHTML = `<div class="alert alert-danger" style="margin-bottom:0;">${U().icon('alertTriangle')}<div class="alert-body"><strong>Verifikasi Gagal ${err.status ? `(HTTP ${err.status})` : ''}:</strong> ${esc(err.message)}</div></div>`;
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `${U().icon('check')} Simpan &amp; Masuk Beranda`;
      }
    });
  }

  global.TelehealthViews = {
    renderWelcomeView,
    renderHomeView,
    renderAnalyticsView,
    renderGuideView,
    renderFillView,
    renderReviewView,
    renderSubmittedView,
    renderHistoryView,
    renderResultView,
    renderStatusView,
    renderUtsView,
    renderSettingsView
  };
})(window);

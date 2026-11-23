/**
 * js/app.js
 * SPA Router, Welcome Landing Gate, Otorisasi Password Pemilik untuk Live API,
 * Quick Mode/Patient Switcher, Command Palette (Ctrl+K), Theme Switcher,
 * Modal, Toast, & Expandable JSON API Inspector.
 */
(function (global) {
  'use strict';

  const C = () => global.TelehealthConfig;
  const U = () => global.TelehealthUtils;
  const API = () => global.TelehealthAPI;
  const CH = () => global.TelehealthCharts;
  const V = () => global.TelehealthViews;

  const cleanupCallbacks = [];
  const expandedLogIds = new Set();

  const app = {
    root: null,
    backTarget: null,
    isLandingView: true,
    state: {
      patient: null,
      formCache: {},
      lastSubmission: null,
      statusPollingActive: false
    },

    registerCleanup(fn) {
      if (typeof fn === 'function') cleanupCallbacks.push(fn);
    },

    runCleanups() {
      while (cleanupCallbacks.length > 0) {
        const fn = cleanupCallbacks.pop();
        try { fn(); } catch {}
      }
      CH().destroyAll();
    },

    setHeader(title, subtitle, backHash, opts = {}) {
      const isLanding = Boolean(opts.isLanding);
      this.isLandingView = isLanding;

      const shell = document.getElementById('app-shell');
      const landingHeader = document.getElementById('landing-header');
      const appHeader = document.getElementById('app-header');
      const ctxBar = document.getElementById('context-bar');
      const bottomNav = document.getElementById('bottom-nav');
      const demoBanner = document.getElementById('demo-banner-wrap');
      const titleEl = document.getElementById('topbar-title');
      const subEl = document.getElementById('topbar-subtitle');
      const backBtn = document.getElementById('topbar-back');

      if (shell) shell.classList.toggle('in-app', !isLanding);
      if (landingHeader) landingHeader.classList.toggle('hidden', !isLanding);
      if (appHeader) appHeader.classList.toggle('hidden', isLanding);
      if (ctxBar) ctxBar.classList.toggle('hidden', isLanding);
      if (bottomNav) bottomNav.classList.toggle('hidden', isLanding);

      const cfg = C().loadConfig();
      if (demoBanner) demoBanner.classList.toggle('hidden', isLanding || cfg.mode !== 'demo');

      if (titleEl) titleEl.textContent = title || 'PulseCare Telehealth';
      if (subEl) subEl.textContent = subtitle || '';
      this.backTarget = backHash || null;
      if (backBtn) backBtn.classList.toggle('hidden', !backHash);
    },

    setConnectionStatus(state, label) {
      const dot = document.getElementById('topbar-status-dot');
      if (dot) {
        dot.classList.remove('online', 'error', 'demo');
        if (state) dot.classList.add(state);
      }
      const txt = document.getElementById('topbar-mode-text');
      if (txt && label) txt.textContent = label;
    },

    syncChromeState() {
      const cfg = C().loadConfig();
      const pat = this.state.patient;
      const isDemo = cfg.mode === 'demo';

      const demoBanner = document.getElementById('demo-banner-wrap');
      if (demoBanner) demoBanner.classList.toggle('hidden', this.isLandingView || !isDemo);

      const chip = document.getElementById('btn-mode-chip');
      if (chip) chip.classList.toggle('is-demo', isDemo);
      this.setConnectionStatus(
        isDemo ? 'demo' : (cfg.token ? 'online' : 'error'),
        isDemo ? 'Mode Demo' : (pat?.id ? `Live · ${pat.id}` : 'Live API')
      );

      const userName = cfg.mahasiswa.nama || 'Pengguna';
      const patCode = isDemo ? 'SANDBOX' : (pat?.id || 'Pasien');
      const avatar = document.getElementById('header-avatar');
      const nameEl = document.getElementById('header-user-name');
      const subEl = document.getElementById('header-user-sub');
      if (avatar) avatar.textContent = U().getInitials(userName);
      if (nameEl) nameEl.textContent = userName;
      if (subEl) subEl.textContent = `${cfg.mahasiswa.nim || 'NIM'} · ${patCode}`;
    },

    updateClarificationBadges(count) {
      const n = Number(count || 0);
      ['nav-clarification-badge', 'mobile-clarification-badge'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = String(n);
        el.classList.toggle('hidden', n <= 0);
      });
    },

    updateUtsBadge(achieved, total) {
      const el = document.getElementById('nav-uts-score');
      if (!el) return;
      el.textContent = `${achieved}/${total}`;
      el.classList.remove('hidden');
    },

    toast(message, type = 'info') {
      const stack = document.getElementById('toast-container');
      if (!stack) return;
      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.innerHTML = `<span>${U().escapeHtml(message)}</span>`;
      stack.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(6px)';
        el.style.transition = '180ms ease';
        setTimeout(() => el.remove(), 200);
      }, 3600);
    },

    confirmModal({ title, body, confirmText = 'Lanjutkan', confirmClass = 'btn-primary', onConfirm, hideConfirm = false }) {
      const backdrop = document.getElementById('modal-backdrop');
      const titleEl = document.getElementById('modal-title');
      const bodyEl = document.getElementById('modal-body');
      const footerEl = document.getElementById('modal-footer');
      const closeBtn = document.getElementById('modal-close');

      titleEl.textContent = title || 'Konfirmasi';
      bodyEl.innerHTML = body || '';
      footerEl.innerHTML = `
        <button type="button" class="btn btn-secondary" id="modal-cancel">${hideConfirm ? 'Tutup' : 'Batal'}</button>
        ${hideConfirm ? '' : `<button type="button" class="btn ${confirmClass}" id="modal-confirm">${U().escapeHtml(confirmText)}</button>`}
      `;

      const close = () => backdrop.classList.add('hidden');
      backdrop.classList.remove('hidden');

      closeBtn.onclick = close;
      footerEl.querySelector('#modal-cancel').onclick = close;
      backdrop.onclick = (e) => { if (e.target === backdrop) close(); };

      const confirmBtn = footerEl.querySelector('#modal-confirm');
      if (confirmBtn) {
        confirmBtn.onclick = async () => {
          confirmBtn.disabled = true;
          try {
            const result = onConfirm ? await onConfirm() : true;
            if (result !== false) close();
            else confirmBtn.disabled = false;
          } catch {
            confirmBtn.disabled = false;
          }
        };
      }
      return { close, bodyEl };
    },

    /**
     * Gate Password Pemilik sebelum masuk ke Portal Live API (Azis Toriq Maulana).
     */
    openOwnerPasswordModal(onUnlocked) {
      const esc = U().escapeHtml;
      const modal = this.confirmModal({
        title: 'Akses Pemilik — Portal Live API',
        body: `
          <div class="alert alert-info" style="margin-bottom:14px;">
            ${U().icon('lock')}
            <div class="alert-body text-sm">
              Akses ke akun Live API <strong>Azis Toriq Maulana (C2C023180)</strong> dilindungi password agar pengunjung publik hanya menggunakan Mode Demo tanpa mengganggu data server asli.
            </div>
          </div>
          <div class="field-group" style="margin-bottom:6px;">
            <label class="field-label text-sm" for="owner-pw-input">Password Pemilik</label>
            <div class="input-with-addon">
              <input type="password" id="owner-pw-input" class="text-input mono" placeholder="Masukkan password pemilik..." autocomplete="current-password" />
              <button type="button" class="btn btn-secondary btn-sm" id="btn-toggle-owner-pw">Lihat</button>
            </div>
            <div class="field-error hidden" id="owner-pw-error">Password salah. Pengunjung publik dapat menggunakan Mode Demo Interaktif.</div>
          </div>
        `,
        confirmText: 'Verifikasi & Masuk Live API',
        confirmClass: 'btn-primary',
        onConfirm: async () => {
          const pwInput = modal.bodyEl.querySelector('#owner-pw-input');
          const errEl = modal.bodyEl.querySelector('#owner-pw-error');
          const pw = pwInput?.value || '';
          const ok = await C().verifyOwnerPassword(pw);
          if (!ok) {
            errEl?.classList.remove('hidden');
            pwInput?.focus();
            pwInput?.select();
            return false;
          }
          C().unlockLiveSession();
          const cur = C().loadConfig();
          C().saveConfig({ ...cur, mode: 'live' });
          this.state.patient = null;
          this.syncChromeState();
          this.toast('Akses pemilik terverifikasi! Selamat datang, Azis Toriq Maulana.', 'success');
          if (typeof onUnlocked === 'function') {
            onUnlocked();
          } else {
            const refreshed = C().loadConfig();
            location.hash = refreshed.token ? '#home' : '#settings';
            if ((location.hash === '#home' && !this.isLandingView) || location.hash === '#settings') {
              handleRoute();
            }
          }
          return true;
        }
      });

      const pwEl = modal.bodyEl.querySelector('#owner-pw-input');
      const toggleBtn = modal.bodyEl.querySelector('#btn-toggle-owner-pw');
      const errEl = modal.bodyEl.querySelector('#owner-pw-error');

      setTimeout(() => pwEl?.focus(), 40);
      pwEl?.addEventListener('input', () => errEl?.classList.add('hidden'));
      pwEl?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('modal-confirm')?.click();
        }
      });
      toggleBtn?.addEventListener('click', () => {
        const isPwd = pwEl.type === 'password';
        pwEl.type = isPwd ? 'text' : 'password';
        toggleBtn.textContent = isPwd ? 'Sembunyikan' : 'Lihat';
      });
    },

    enterLivePortal() {
      if (C().isLiveUnlocked()) {
        const cur = C().loadConfig();
        C().saveConfig({ ...cur, mode: 'live' });
        this.state.patient = null;
        this.syncChromeState();
        const refreshed = C().loadConfig();
        location.hash = refreshed.token ? '#home' : '#settings';
      } else {
        this.openOwnerPasswordModal(() => {
          const refreshed = C().loadConfig();
          location.hash = refreshed.token ? '#home' : '#settings';
          handleRoute();
        });
      }
    },

    lockLivePortal() {
      C().lockLiveSession();
      this.state.patient = null;
      this.syncChromeState();
      this.toast('Sesi Live API dikunci. Kembali ke Mode Demo yang aman.', 'info');
      location.hash = '#welcome';
    },

    openDemoEntryModal() {
      const c = C().loadConfig();
      const esc = U().escapeHtml;
      const defDemoName = c.demoMahasiswa?.nama || 'Pengunjung Demo';
      const defDemoNim = c.demoMahasiswa?.nim || 'DEMO2026';

      const modal = this.confirmModal({
        title: 'Mulai Mode Demo Interaktif (Pure Sandbox)',
        body: `
          <div class="alert alert-info" style="margin-bottom:14px;">
            ${U().icon('sparkles')}
            <div class="alert-body text-sm">
              Mode Demo berjalan <strong>100% lokal di browser Anda</strong> tanpa menghubungi server API asli. Bebas mencoba formulir bercabang, skor GAD-7, analitik, klarifikasi, dan tindak lanjut.
            </div>
          </div>
          <div class="field-group" style="margin-bottom:12px;">
            <label class="field-label text-sm" for="demo-visitor-name">Nama Anda (untuk sapaan di Beranda)</label>
            <input type="text" id="demo-visitor-name" class="text-input" value="${esc(defDemoName)}" placeholder="Masukkan nama Anda..." />
          </div>
          <div class="field-group" style="margin-bottom:0;">
            <label class="field-label text-sm" for="demo-visitor-nim">ID / NIM Demo</label>
            <input type="text" id="demo-visitor-nim" class="text-input mono" value="${esc(defDemoNim)}" placeholder="DEMO2026" />
          </div>
        `,
        confirmText: 'Masuk Mode Demo',
        confirmClass: 'btn-indigo',
        onConfirm: () => {
          const visitorName = modal.bodyEl.querySelector('#demo-visitor-name')?.value.trim() || 'Pengunjung Demo';
          const visitorNim = (modal.bodyEl.querySelector('#demo-visitor-nim')?.value.trim() || 'DEMO2026').toUpperCase();
          C().saveConfig({
            mode: 'demo',
            demoMahasiswa: { nim: visitorNim, nama: visitorName, kelas: 'SANDBOX' }
          });
          this.state.patient = null;
          this.syncChromeState();
          this.toast(`Selamat datang di Mode Demo, ${visitorName}!`, 'success');
          location.hash = '#home';
          return true;
        }
      });
    },

    openInspector() {
      document.getElementById('inspector-drawer')?.classList.remove('hidden');
      document.getElementById('inspector-backdrop')?.classList.remove('hidden');
      renderInspectorLogs(API().getLogs());
    },

    openQuickModeSwitcher() {
      const cfg = C().loadConfig();
      const esc = U().escapeHtml;
      const unlocked = C().isLiveUnlocked();
      const presets = C().getPatientPresets().filter((p) => p.token && !p.token.startsWith('ISI_'));

      const bodyHtml = `
        <div class="stack-md">
          <div class="stack-sm">
            <div class="fw-700 text-sm">Mode Demo Publik (100% Simulasi Lokal)</div>
            <button type="button" class="preset-card ${cfg.mode === 'demo' ? 'selected' : ''}" id="sw-demo-mode">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span class="preset-id">PURE SANDBOX</span>
                ${cfg.mode === 'demo' ? `<span class="badge badge-indigo">Aktif</span>` : ''}
              </div>
              <div class="preset-name">Mode Demo Interaktif</div>
              <div class="preset-desc">Aman dicoba siapa saja tanpa menyentuh server API asli.</div>
            </button>
          </div>

          <div class="stack-sm">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="fw-700 text-sm">Akses Pemilik — Live API</span>
              <span class="badge ${unlocked ? 'badge-success' : 'badge-warning'}">${unlocked ? 'Terbuka' : 'Terkunci Password'}</span>
            </div>

            ${!unlocked ? `
              <button type="button" class="btn btn-primary btn-block" id="sw-unlock-live">
                ${U().icon('lock')} Masukkan Password Pemilik (Live API)
              </button>
            ` : `
              ${presets.length > 0 ? presets.map((p) => {
                const active = cfg.mode === 'live' && cfg.token === p.token;
                return `
                  <button type="button" class="preset-card ${active ? 'selected' : ''}" data-sw-token="${esc(p.token)}" data-sw-id="${esc(p.id)}" data-sw-name="${esc(p.nama)}">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <span class="preset-id">${esc(p.id)}</span>
                      ${active ? `<span class="badge badge-primary">Aktif</span>` : ''}
                    </div>
                    <div class="preset-name">${esc(p.nama)}</div>
                    <div class="preset-desc">${esc(p.keterangan)}</div>
                  </button>
                `;
              }).join('') : `
                <a href="#settings" class="btn btn-secondary btn-block" id="sw-go-settings">${U().icon('settings')} Kelola Token Live API</a>
              `}
              <button type="button" class="btn btn-danger btn-sm btn-block" id="sw-lock-live" style="margin-top:4px;">
                ${U().icon('lock')} Kunci Kembali Sesi Live API
              </button>
            `}
          </div>
        </div>
      `;

      const modal = this.confirmModal({
        title: 'Mode Aplikasi & Akses Pemilik',
        body: bodyHtml,
        hideConfirm: true
      });

      modal.bodyEl.querySelector('#sw-demo-mode')?.addEventListener('click', () => {
        C().saveConfig({ mode: 'demo' });
        this.state.patient = null;
        this.syncChromeState();
        modal.close();
        this.toast('Beralih ke Mode Demo Interaktif (Pure Sandbox).', 'info');
        if (this.isLandingView) location.hash = '#home';
        else handleRoute();
      });

      modal.bodyEl.querySelector('#sw-unlock-live')?.addEventListener('click', () => {
        modal.close();
        this.enterLivePortal();
      });

      modal.bodyEl.querySelector('#sw-lock-live')?.addEventListener('click', () => {
        modal.close();
        this.lockLivePortal();
      });

      modal.bodyEl.querySelector('#sw-go-settings')?.addEventListener('click', () => modal.close());

      modal.bodyEl.querySelectorAll('[data-sw-token]').forEach((btn) => {
        btn.addEventListener('click', () => {
          C().saveConfig({ mode: 'live', token: btn.dataset.swToken });
          this.state.patient = null;
          this.syncChromeState();
          modal.close();
          this.toast(`Live API aktif · Pasien ${btn.dataset.swId} (${btn.dataset.swName}).`, 'success');
          if (this.isLandingView) location.hash = '#home';
          else handleRoute();
        });
      });
    }
  };

  function parseRoute() {
    const rawHash = (location.hash || '#welcome').replace(/^#/, '');
    const [pathPart, queryPart] = rawHash.split('?');
    const segments = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
    const query = {};
    if (queryPart) new URLSearchParams(queryPart).forEach((v, k) => { query[k] = v; });
    return { route: segments[0] || 'welcome', segments, query };
  }

  function highlightNav(route) {
    let activeKey = route;
    if (route === 'guide') activeKey = 'home';
    else if (['fill', 'review', 'submitted', 'result', 'status'].includes(route)) activeKey = 'history';

    document.querySelectorAll('#app-header .pill-nav-item, .bottom-nav-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.route === activeKey);
    });
  }

  function handleRoute() {
    app.runCleanups();
    const { route, segments, query } = parseRoute();
    const cfg = C().loadConfig();

    highlightNav(route);
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (route === 'welcome') {
      V().renderWelcomeView(app);
      app.syncChromeState();
      return;
    }

    if (!C().isConfigured(cfg) && route !== 'settings') {
      highlightNav('settings');
      V().renderSettingsView(app);
      app.syncChromeState();
      return;
    }

    switch (route) {
      case 'settings': V().renderSettingsView(app); break;
      case 'home': V().renderHomeView(app); break;
      case 'analytics': V().renderAnalyticsView(app); break;
      case 'guide': V().renderGuideView(app, segments[1] || 'FRM-KELUHAN'); break;
      case 'fill': V().renderFillView(app, segments[1] || 'FRM-KELUHAN', segments[2], query); break;
      case 'review': V().renderReviewView(app, segments[1]); break;
      case 'submitted': V().renderSubmittedView(app, segments[1]); break;
      case 'history': V().renderHistoryView(app, query); break;
      case 'result': V().renderResultView(app, segments[1]); break;
      case 'status': V().renderStatusView(app, segments[1]); break;
      case 'uts': V().renderUtsView(app); break;
      default: V().renderWelcomeView(app); break;
    }
    app.syncChromeState();
  }

  function renderInspectorLogs(logs) {
    const countEl = document.getElementById('api-log-count');
    const listEl = document.getElementById('inspector-log-list');
    if (countEl) {
      countEl.textContent = String(logs.length);
      countEl.classList.toggle('hidden', logs.length === 0);
    }
    if (!listEl) return;

    if (logs.length === 0) {
      listEl.innerHTML = `<div class="empty-mini">Belum ada aktivitas API pada sesi ini.</div>`;
      return;
    }

    const esc = U().escapeHtml;
    listEl.innerHTML = logs.map((l) => {
      const stCls = l.ok ? 'badge-success' : (l.status === 422 || l.status === 409 ? 'badge-warning' : 'badge-danger');
      const isOpen = expandedLogIds.has(l.id);
      const reqStr = l.requestBody ? `// REQUEST BODY\n${JSON.stringify(l.requestBody, null, 2)}\n\n` : '';
      const resStr = `// RESPONSE JSON (HTTP ${l.status})\n${JSON.stringify(l.responseBody, null, 2)}`;
      return `
        <div class="log-item">
          <div class="log-summary" data-log-toggle="${esc(l.id)}">
            <div class="log-top">
              <span class="method-tag">${esc(l.method)}</span>
              <span class="log-path">${esc(l.path)}</span>
              <span class="badge ${stCls} mono">${l.status || 'ERR'}</span>
            </div>
            <div style="margin-top:5px;color:var(--text-secondary);">${esc(l.message)}</div>
            <div class="log-meta">
              <span>${esc(l.time)} · ${isOpen ? 'Sembunyikan JSON ▲' : 'Lihat JSON ▼'}</span>
              <span>${l.elapsedMs} ms</span>
            </div>
          </div>
          ${isOpen ? `<pre class="log-json-box">${esc(reqStr + resStr)}</pre>` : ''}
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-log-toggle]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.logToggle;
        if (expandedLogIds.has(id)) expandedLogIds.delete(id);
        else expandedLogIds.add(id);
        renderInspectorLogs(API().getLogs());
      });
    });
  }

  function setupCommandPalette() {
    const backdrop = document.getElementById('cmd-backdrop');
    const input = document.getElementById('cmd-input');
    const list = document.getElementById('cmd-list');

    const commands = [
      { label: 'Halaman Selamat Datang (Welcome)', sub: '#welcome', run: () => { location.hash = '#welcome'; } },
      { label: 'Beranda Pasien', sub: '#home', run: () => { location.hash = '#home'; } },
      { label: 'Mulai Formulir Keluhan Pasien (Wajib)', sub: 'FRM-KELUHAN', run: () => { location.hash = '#guide/FRM-KELUHAN'; } },
      { label: 'Mulai Kuesioner Kecemasan GAD-7 (Bonus)', sub: 'FRM-GAD7', run: () => { location.hash = '#guide/FRM-GAD7'; } },
      { label: 'Riwayat Self-Assessment', sub: '#history', run: () => { location.hash = '#history'; } },
      { label: 'Analitik Klinis & Grafik GAD-7', sub: '#analytics', run: () => { location.hash = '#analytics'; } },
      { label: 'UTS Mission Control & Test Bench', sub: '#uts', run: () => { location.hash = '#uts'; } },
      { label: 'Pengaturan & Akses Live API', sub: '#settings', run: () => { location.hash = '#settings'; } },
      { label: 'Masuk / Ganti Akses Pemilik (Password Live API)', sub: 'Auth', run: () => app.enterLivePortal() },
      { label: 'Ganti Mode (Live API / Pure Demo Sandbox)', sub: 'Switcher', run: () => app.openQuickModeSwitcher() },
      { label: 'Buka Live API Network Inspector', sub: 'JSON Log', run: () => app.openInspector() },
      { label: 'Ganti Mode Gelap / Terang (Dark Mode)', sub: 'Theme', run: () => toggleTheme() }
    ];

    function closeCmd() { backdrop.classList.add('hidden'); }
    function renderItems(q = '') {
      const term = q.trim().toLowerCase();
      const filtered = commands.filter((c) => !term || c.label.toLowerCase().includes(term) || c.sub.toLowerCase().includes(term));
      list.innerHTML = filtered.length > 0 ? filtered.map((c, idx) => `
        <button type="button" class="cmd-item" data-cmd-idx="${idx}">
          <span>${U().escapeHtml(c.label)}</span>
          <span class="cmd-item-sub">${U().escapeHtml(c.sub)}</span>
        </button>
      `).join('') : `<div class="empty-mini">Tidak ditemukan perintah untuk "${U().escapeHtml(q)}".</div>`;

      list.querySelectorAll('[data-cmd-idx]').forEach((btn, idx) => {
        btn.addEventListener('click', () => { closeCmd(); filtered[idx].run(); });
      });
    }

    function openCmd() {
      backdrop.classList.remove('hidden');
      input.value = '';
      renderItems('');
      setTimeout(() => input.focus(), 30);
    }

    input.addEventListener('input', () => renderItems(input.value));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeCmd(); });
    document.getElementById('btn-open-cmd')?.addEventListener('click', openCmd);

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (backdrop.classList.contains('hidden')) openCmd();
        else closeCmd();
      } else if (e.key === 'Escape' && !backdrop.classList.contains('hidden')) {
        closeCmd();
      }
    });
  }

  function applyTheme(theme) {
    C().setTheme(theme);
    const ico = theme === 'dark' ? U().icon('sun') : U().icon('moon');
    const t1 = document.getElementById('theme-icon');
    const t2 = document.getElementById('landing-theme-icon');
    if (t1) t1.innerHTML = ico;
    if (t2) t2.innerHTML = ico;
  }

  function toggleTheme() {
    const next = C().getTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    const { route } = parseRoute();
    if (route === 'home' || route === 'analytics') handleRoute();
  }

  function init() {
    app.root = document.getElementById('view-root');
    U().hydrateStaticIcons();
    applyTheme(C().getTheme());

    // Landing header buttons
    document.getElementById('btn-landing-theme')?.addEventListener('click', toggleTheme);
    document.getElementById('btn-nav-enter')?.addEventListener('click', () => app.enterLivePortal());
    document.getElementById('btn-nav-demo')?.addEventListener('click', () => app.openDemoEntryModal());
    document.querySelectorAll('[data-scroll-to]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.scrollTo);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // App header & banner buttons
    document.getElementById('topbar-back')?.addEventListener('click', () => {
      if (app.backTarget) location.hash = app.backTarget;
      else history.back();
    });
    document.getElementById('btn-toggle-theme')?.addEventListener('click', toggleTheme);
    document.getElementById('btn-mode-chip')?.addEventListener('click', () => app.openQuickModeSwitcher());
    document.getElementById('btn-quick-switch')?.addEventListener('click', () => app.openQuickModeSwitcher());
    document.getElementById('btn-banner-live')?.addEventListener('click', () => app.enterLivePortal());

    document.getElementById('btn-reset-demo-data')?.addEventListener('click', () => {
      global.TelehealthDemoMock?.resetDb();
      app.toast('Data Demo Sandbox direset ke kondisi awal.', 'info');
      handleRoute();
    });

    const drawer = document.getElementById('inspector-drawer');
    const backdrop = document.getElementById('inspector-backdrop');
    const closeInspector = () => {
      drawer.classList.add('hidden');
      backdrop.classList.add('hidden');
    };
    document.getElementById('btn-toggle-inspector')?.addEventListener('click', () => app.openInspector());
    document.getElementById('btn-close-inspector')?.addEventListener('click', closeInspector);
    backdrop?.addEventListener('click', closeInspector);
    document.getElementById('btn-clear-logs')?.addEventListener('click', () => API().clearLogs());

    API().subscribeLogs(renderInspectorLogs);
    setupCommandPalette();

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);

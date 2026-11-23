/**
 * js/api.js
 * HTTP Client untuk API Self-Assessment Telehealth v2.0.
 * JAMINAN ISOLASI DEMO: Selama berada di Mode Demo atau sesi pemilik belum dibuka
 * dengan password, 100% request dialihkan ke simulator lokal (TelehealthDemoMock)
 * dan TIDAK PERNAH memanggil fetch() ke server API asli.
 */
(function (global) {
  'use strict';

  const logs = [];
  const MAX_LOGS = 50;
  const onLogListeners = [];

  function subscribeLogs(fn) { onLogListeners.push(fn); }
  function notifyLogs() { onLogListeners.forEach((fn) => fn(logs)); }
  function clearLogs() { logs.length = 0; notifyLogs(); }
  function getLogs() { return logs; }

  function pushLog(entry) {
    logs.unshift(entry);
    if (logs.length > MAX_LOGS) logs.pop();
    notifyLogs();
  }

  function friendlyHttpMessage(status, fallback) {
    if (fallback) return fallback;
    const map = {
      400: 'Format permintaan tidak valid (400). Pastikan body berupa JSON valid.',
      401: 'Token pasien tidak ditemukan atau tidak valid (401). Periksa Pengaturan.',
      403: 'Akses ditolak (403). Endpoint ini hanya untuk peran petugas/admin.',
      404: 'Data tidak ditemukan (404). Periksa ID laporan atau akun pasien aktif.',
      409: 'Aksi tidak sesuai status (409). Formulir yang sudah dikirim tidak dapat diubah.',
      422: 'Validasi gagal (422). Mohon periksa kembali kolom yang ditandai.'
    };
    return map[status] || `Kesalahan jaringan/server (HTTP ${status || 'ERR'}).`;
  }

  async function request(path, options = {}) {
    const C = global.TelehealthConfig;
    const cfg = C.loadConfig();
    const method = (options.method || 'GET').toUpperCase();
    const unlocked = C.isLiveUnlocked();
    const allowRealNetwork = unlocked && (cfg.mode === 'live' || Boolean(options.forceLive));
    const startedAt = performance.now();

    // PURE DEMO ISOLATION: Tidak pernah menyentuh server API asli!
    if (!allowRealNetwork) {
      if (!global.TelehealthDemoMock) {
        throw { status: 500, success: false, message: 'Simulator Mode Demo belum dimuat.' };
      }
      try {
        const json = await global.TelehealthDemoMock.handle(path, options);
        pushLog({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          method,
          path: `[SANDBOX] ${path || '/'}`,
          status: method === 'POST' && path === '/assessments' ? 201 : 200,
          ok: true,
          message: json.message || 'OK (Simulasi Lokal)',
          elapsedMs: Math.round(performance.now() - startedAt),
          time: new Date().toLocaleTimeString('id-ID'),
          requestBody: options.body !== undefined ? options.body : null,
          responseBody: json
        });
        return json;
      } catch (err) {
        pushLog({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          method,
          path: `[SANDBOX] ${path || '/'}`,
          status: err.status || 400,
          ok: false,
          message: err.message || 'Error (Simulasi Lokal)',
          elapsedMs: Math.round(performance.now() - startedAt),
          time: new Date().toLocaleTimeString('id-ID'),
          requestBody: options.body !== undefined ? options.body : null,
          responseBody: err
        });
        throw err;
      }
    }

    // LIVE API REQUEST (Hanya aktif setelah password pemilik diverifikasi)
    const base = (options.baseUrl || cfg.apiBase || C.DEFAULT_API_BASE).replace(/\/+$/, '');
    const token = options.token !== undefined ? options.token : cfg.token;
    const useAuth = options.auth !== false;
    const url = path ? `${base}${path.startsWith('/') ? path : '/' + path}` : base;

    const headers = {};
    if (useAuth && token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';

    let status = 0;
    let json = null;

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined
      });
      status = res.status;
      const text = await res.text();
      try { json = text ? JSON.parse(text) : {}; }
      catch { json = { success: false, message: 'Respons server bukan JSON valid. Periksa Base URL API.' }; }

      pushLog({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        method,
        path: path || '/',
        status,
        ok: Boolean(res.ok && json.success !== false),
        message: json.message || (res.ok ? 'OK' : `HTTP ${status}`),
        elapsedMs: Math.round(performance.now() - startedAt),
        time: new Date().toLocaleTimeString('id-ID'),
        requestBody: options.body !== undefined ? options.body : null,
        responseBody: json
      });

      if (!res.ok || json.success === false) {
        throw {
          status,
          success: false,
          message: friendlyHttpMessage(status, json.message),
          errors: json.errors || null,
          raw: json
        };
      }
      return json;
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err) throw err;
      pushLog({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        method,
        path: path || '/',
        status: 0,
        ok: false,
        message: 'Gagal terhubung ke server API (CORS / jaringan).',
        elapsedMs: Math.round(performance.now() - startedAt),
        time: new Date().toLocaleTimeString('id-ID'),
        requestBody: options.body !== undefined ? options.body : null,
        responseBody: { error: String(err?.message || err) }
      });
      throw {
        status: 0,
        success: false,
        message: 'Tidak dapat menghubungi server API. Periksa koneksi internet dan alamat Base URL (akhiri dengan /api).',
        errors: null
      };
    }
  }

  global.TelehealthAPI = {
    request, getLogs, clearLogs, subscribeLogs,
    health: (baseUrl, forceLive = false) => request('', { method: 'GET', auth: false, baseUrl, forceLive }),
    getMe: (nim, opts = {}) => request(`/me${nim ? '?nim=' + encodeURIComponent(nim) : ''}`, { method: 'GET', ...opts }),
    getForms: () => request('/forms'),
    getFormDetail: (formId) => request(`/forms/${encodeURIComponent(formId)}`),
    validateForm: (formId, nim, answers) => request(`/forms/${encodeURIComponent(formId)}/validate`, { method: 'POST', body: { nim, answers } }),
    listAssessments: (params = {}) => {
      const sp = new URLSearchParams();
      ['nim', 'status_peninjauan', 'status_pengiriman', 'form_id', 'q'].forEach((k) => { if (params[k]) sp.set(k, params[k]); });
      const qs = sp.toString();
      return request(`/assessments${qs ? '?' + qs : ''}`);
    },
    createAssessment: ({ form_id, persetujuan, mahasiswa, answers = {}, kirim = false }) => {
      const body = { form_id, persetujuan: Boolean(persetujuan), mahasiswa, answers };
      if (kirim) body.kirim = true;
      return request('/assessments', { method: 'POST', body });
    },
    getAssessment: (id) => request(`/assessments/${encodeURIComponent(id)}`),
    patchAssessment: (id, answers) => request(`/assessments/${encodeURIComponent(id)}`, { method: 'PATCH', body: { answers } }),
    putAssessment: (id, answers) => request(`/assessments/${encodeURIComponent(id)}`, { method: 'PUT', body: { answers } }),
    deleteAssessment: (id) => request(`/assessments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    submitAssessment: (id) => request(`/assessments/${encodeURIComponent(id)}/submit`, { method: 'POST' }),
    getAssessmentResult: (id) => request(`/assessments/${encodeURIComponent(id)}/hasil`),
    getAssessmentStatus: (id) => request(`/assessments/${encodeURIComponent(id)}/status`),
    replyClarification: (id, cid, jawaban) => request(`/assessments/${encodeURIComponent(id)}/clarifications/${encodeURIComponent(cid)}/reply`, { method: 'POST', body: { jawaban } }),
    getUtsStatus: (nim) => request(`/uts/${encodeURIComponent(nim)}`)
  };
})(window);

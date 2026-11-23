/**
 * js/form-engine.js
 * Dynamic Form Renderer + Live Clinical Preview Helper untuk PulseCare Pro.
 * Mendukung 7 tipe input API v2.0, percabangan show_if (section & question),
 * opsi exclusive multi_choice, pembeda data_type pengukuran vs subjektif,
 * dan pembeda "Tidak" vs "Belum diisi" (null).
 */
(function (global) {
  'use strict';

  const U = () => global.TelehealthUtils;

  function normalizeOption(opt) {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt), exclusive: false };
    }
    const value = opt.value !== undefined ? opt.value : (opt.nilai !== undefined ? opt.nilai : opt.kode);
    const label = opt.label || opt.teks || opt.text || String(value);
    const exclusive = Boolean(opt.exclusive || opt.eksklusif || value === 'tidak_ada');
    return { value, label, exclusive };
  }

  function normalizeQuestion(q) {
    const rawOpts = q.options || q.opsi || q.pilihan || [];
    return {
      id: q.id,
      type: q.type || q.tipe || 'text',
      text: q.pertanyaan || q.text || q.teks || q.question || q.label || q.id,
      shortLabel: q.label || q.pertanyaan || q.id,
      helper: q.bantuan || q.helper || q.keterangan || q.deskripsi || '',
      placeholder: q.placeholder || q.contoh || '',
      required: Boolean(q.required !== undefined ? q.required : q.wajib),
      dataType: q.data_type || q.dataType || 'subjektif',
      showIf: q.show_if || q.showIf || null,
      options: Array.isArray(rawOpts) ? rawOpts.map(normalizeOption) : [],
      min: q.min !== undefined ? q.min : null,
      max: q.max !== undefined ? q.max : null,
      step: q.step !== undefined ? q.step : (q.id === 'suhu_tubuh' || q.id === 'berat_badan' ? '0.1' : '1'),
      maxLength: q.max_length || q.maxLength || null,
      unit: q.satuan || q.unit || '',
      requiredMsg: q.pesan_wajib || ''
    };
  }

  function normalizeForm(rawForm) {
    const sections = (rawForm.sections || rawForm.bagian || []).map((sec, idx) => ({
      id: sec.id || `sec_${idx}`,
      title: sec.judul || sec.title || `Bagian ${idx + 1}`,
      description: sec.deskripsi || sec.description || '',
      showIf: sec.show_if || sec.showIf || null,
      questions: (sec.questions || sec.pertanyaan || []).map(normalizeQuestion)
    }));

    const petunjukRaw = rawForm.petunjuk;
    const petunjuk = Array.isArray(petunjukRaw)
      ? petunjukRaw
      : (typeof petunjukRaw === 'string' && petunjukRaw ? [petunjukRaw] : []);

    let persetujuanText = 'Saya memahami bahwa data yang saya isi digunakan untuk persiapan konsultasi, hanya dapat diakses oleh petugas yang berwenang, dan hasilnya bukan diagnosis.';
    if (typeof rawForm.persetujuan === 'string' && rawForm.persetujuan.trim()) {
      persetujuanText = rawForm.persetujuan;
    } else if (rawForm.persetujuan && typeof rawForm.persetujuan === 'object') {
      persetujuanText = rawForm.persetujuan.teks || rawForm.persetujuan.label || rawForm.persetujuan.deskripsi || persetujuanText;
    }

    return {
      id: rawForm.id,
      title: rawForm.judul || rawForm.title || rawForm.id,
      version: rawForm.versi || rawForm.version || '1.0',
      description: rawForm.deskripsi || rawForm.description || '',
      estimatedMinutes: rawForm.estimasi_menit || rawForm.estimasi_waktu || 5,
      reportingPeriod: rawForm.periode_pelaporan || rawForm.periode || '',
      resultType: rawForm.jenis_hasil || rawForm.jenis || '',
      petunjuk,
      persetujuanText,
      keterbatasan: rawForm.keterbatasan || 'Hasil self-assessment BUKAN diagnosis. Jawaban akan ditinjau oleh tenaga kesehatan.',
      sections
    };
  }

  function getVisibleSections(form, answers) {
    return form.sections.filter((sec) => U().isVisible(sec.showIf, answers));
  }

  function getVisibleQuestions(section, answers) {
    return section.questions.filter((q) => U().isVisible(q.showIf, answers));
  }

  function getAllVisibleQuestions(form, answers) {
    const list = [];
    getVisibleSections(form, answers).forEach((sec) => {
      getVisibleQuestions(sec, answers).forEach((q) => list.push(q));
    });
    return list;
  }

  function findQuestionSectionIndex(form, answers, questionId) {
    const visSections = getVisibleSections(form, answers);
    for (let i = 0; i < visSections.length; i++) {
      if (visSections[i].questions.some((q) => q.id === questionId)) return i;
    }
    return 0;
  }

  function formatAnswerDisplay(q, val) {
    if (!U().isValueFilled(val)) return null;
    if (q.type === 'single_choice' || q.type === 'scale') {
      const found = q.options.find((o) => String(o.value) === String(val));
      if (found) return q.type === 'scale' ? `${found.label} (${found.value})` : found.label;
      return String(val);
    }
    if (q.type === 'multi_choice' && Array.isArray(val)) {
      return val.map((v) => {
        const found = q.options.find((o) => String(o.value) === String(v));
        return found ? found.label : String(v);
      }).join(', ');
    }
    if (q.type === 'number') {
      return q.unit ? `${val} ${q.unit}` : String(val);
    }
    return String(val);
  }

  function computeLiveStats(form, answers) {
    const visibleQs = getAllVisibleQuestions(form, answers);
    const reqQs = visibleQs.filter((q) => q.required);
    const reqFilled = reqQs.filter((q) => U().isValueFilled(answers[q.id])).length;
    const totalFilled = visibleQs.filter((q) => U().isValueFilled(answers[q.id])).length;
    const pct = reqQs.length > 0 ? Math.round((reqFilled / reqQs.length) * 100) : 100;

    // Live GAD-7 estimator (hanya untuk pratinjau visual saat pengisian FRM-GAD7)
    let gadEstimate = null;
    if (String(form.id || '').toUpperCase().includes('GAD')) {
      const gadIds = ['gad_1', 'gad_2', 'gad_3', 'gad_4', 'gad_5', 'gad_6', 'gad_7'];
      let sum = 0;
      let count = 0;
      gadIds.forEach((id) => {
        if (U().isValueFilled(answers[id])) {
          sum += Number(answers[id]) || 0;
          count += 1;
        }
      });
      const kategori = sum <= 4 ? { kode: 'minimal', label: 'Minimal' }
        : sum <= 9 ? { kode: 'ringan', label: 'Ringan' }
        : sum <= 14 ? { kode: 'sedang', label: 'Sedang' }
        : { kode: 'berat', label: 'Berat' };
      gadEstimate = { total: sum, answered: count, max: 21, kategori };
    }

    return {
      visibleQs,
      reqTotal: reqQs.length,
      reqFilled,
      totalVisible: visibleQs.length,
      totalFilled,
      pct,
      gadEstimate
    };
  }

  function buildPatchAnswers(form, rawAnswers, touchedKeys) {
    const out = {};
    const qMap = {};
    form.sections.forEach((s) => s.questions.forEach((q) => { qMap[q.id] = q; }));

    Object.keys(rawAnswers || {}).forEach((k) => {
      const q = qMap[k];
      const val = rawAnswers[k];
      if (!q || val === undefined) return;

      if (val === null || val === '') {
        if (touchedKeys && touchedKeys.has(k)) out[k] = null;
        return;
      }

      if (q.type === 'scale' || q.type === 'number') {
        const num = Number(val);
        if (!Number.isNaN(num)) out[k] = num;
        else if (touchedKeys && touchedKeys.has(k)) out[k] = null;
      } else if (q.type === 'multi_choice') {
        if (Array.isArray(val) && val.length > 0) out[k] = val;
        else if (touchedKeys && touchedKeys.has(k)) out[k] = null;
      } else {
        out[k] = typeof val === 'string' ? val.trim() : val;
      }
    });

    if (touchedKeys) {
      touchedKeys.forEach((k) => {
        if (!(k in out) && qMap[k]) out[k] = null;
      });
    }
    return out;
  }

  function buildValidateAnswers(form, rawAnswers) {
    const out = {};
    getAllVisibleQuestions(form, rawAnswers).forEach((q) => {
      const val = rawAnswers[q.id];
      if (!U().isValueFilled(val)) return;
      if (q.type === 'scale' || q.type === 'number') {
        const num = Number(val);
        if (!Number.isNaN(num)) out[q.id] = num;
      } else if (q.type === 'multi_choice') {
        if (Array.isArray(val) && val.length > 0) out[q.id] = val;
      } else {
        out[q.id] = typeof val === 'string' ? val.trim() : val;
      }
    });
    return out;
  }

  function renderQuestionHtml(q, currentValue, errorMsg) {
    const esc = U().escapeHtml;
    const isMeas = q.dataType === 'pengukuran';
    const hasVal = U().isValueFilled(currentValue);
    const hasErr = Boolean(errorMsg);

    const dataTypePill = isMeas
      ? `<span class="badge badge-info" title="Data hasil pengukuran klinis">${U().icon('thermometer')} Pengukuran</span>`
      : `<span class="badge badge-neutral" title="Laporan subjektif pasien">Subjektif</span>`;

    const reqTag = q.required
      ? `<span class="required-star" aria-label="Wajib diisi">*</span>`
      : `<span class="optional-tag">(opsional)</span>`;

    const clearBtn = (hasVal && (q.type === 'single_choice' || q.type === 'scale' || !q.required))
      ? `<button type="button" class="clear-answer-btn" data-clear-q="${esc(q.id)}">Kosongkan</button>`
      : '';

    let controlHtml = '';

    if (q.type === 'text') {
      const val = hasVal ? String(currentValue) : '';
      const maxAttr = q.maxLength ? `maxlength="${q.maxLength}"` : '';
      controlHtml = `
        <input type="text" class="text-input" id="q_${esc(q.id)}" data-qid="${esc(q.id)}" data-qtype="text"
          value="${esc(val)}" placeholder="${esc(q.placeholder || 'Ketik jawaban Anda di sini...')}" ${maxAttr} autocomplete="off" />
        ${q.maxLength ? `<div class="char-counter"><span data-counter-for="${esc(q.id)}">${val.length}</span> / ${q.maxLength}</div>` : ''}
      `;
    } else if (q.type === 'textarea') {
      const val = hasVal ? String(currentValue) : '';
      const maxAttr = q.maxLength ? `maxlength="${q.maxLength}"` : '';
      controlHtml = `
        <textarea class="textarea-input" id="q_${esc(q.id)}" data-qid="${esc(q.id)}" data-qtype="textarea"
          placeholder="${esc(q.placeholder || 'Tuliskan keterangan tambahan secara jelas...')}" ${maxAttr}>${esc(val)}</textarea>
        ${q.maxLength ? `<div class="char-counter"><span data-counter-for="${esc(q.id)}">${val.length}</span> / ${q.maxLength}</div>` : ''}
      `;
    } else if (q.type === 'number') {
      const val = hasVal ? String(currentValue) : '';
      const minAttr = q.min !== null ? `min="${q.min}"` : '';
      const maxAttr = q.max !== null ? `max="${q.max}"` : '';
      const rangeHint = (q.min !== null && q.max !== null) ? `${q.min}–${q.max}` : 'Masukkan angka';
      controlHtml = `
        <div class="input-unit-wrap">
          <input type="number" class="text-input" id="q_${esc(q.id)}" data-qid="${esc(q.id)}" data-qtype="number"
            value="${esc(val)}" placeholder="${esc(q.placeholder || rangeHint)}" ${minAttr} ${maxAttr} step="${esc(q.step)}" />
          ${q.unit ? `<span class="unit-badge">${esc(q.unit)}</span>` : ''}
        </div>
        ${(q.min !== null && q.max !== null) ? `<div class="field-helper" style="margin-top:6px;margin-bottom:0;">Rentang diterima: <strong>${q.min} – ${q.max}${q.unit ? ' ' + esc(q.unit) : ''}</strong></div>` : ''}
      `;
    } else if (q.type === 'date') {
      const val = hasVal ? String(currentValue) : '';
      controlHtml = `
        <input type="date" class="text-input" id="q_${esc(q.id)}" data-qid="${esc(q.id)}" data-qtype="date"
          value="${esc(val)}" max="${U().todayIsoDate()}" />
        <div class="field-helper" style="margin-top:6px;margin-bottom:0;">Maksimal tanggal hari ini (${U().todayIsoDate()}).</div>
      `;
    } else if (q.type === 'single_choice') {
      const twoCol = q.options.length === 2 ? 'two-col' : '';
      controlHtml = `
        <div class="choice-list ${twoCol}" role="radiogroup" aria-labelledby="lbl_${esc(q.id)}">
          ${q.options.map((opt) => {
            const isSel = hasVal && String(currentValue) === String(opt.value);
            return `
              <label class="choice-option ${isSel ? 'selected' : ''}">
                <input type="radio" name="q_${esc(q.id)}" data-qid="${esc(q.id)}" data-qtype="single_choice"
                  value="${esc(opt.value)}" ${isSel ? 'checked' : ''} />
                <span class="choice-text">${esc(opt.label)}</span>
              </label>
            `;
          }).join('')}
        </div>
      `;
    } else if (q.type === 'multi_choice') {
      const arr = Array.isArray(currentValue) ? currentValue.map(String) : [];
      controlHtml = `
        <div class="choice-list two-col">
          ${q.options.map((opt) => {
            const isSel = arr.includes(String(opt.value));
            return `
              <label class="choice-option ${isSel ? 'selected' : ''}">
                <input type="checkbox" data-qid="${esc(q.id)}" data-qtype="multi_choice"
                  data-exclusive="${opt.exclusive ? 'true' : 'false'}"
                  value="${esc(opt.value)}" ${isSel ? 'checked' : ''} />
                <span class="choice-text">${esc(opt.label)}</span>
                ${opt.exclusive ? `<span class="choice-exclusive-tag">Eksklusif</span>` : ''}
              </label>
            `;
          }).join('')}
        </div>
      `;
    } else if (q.type === 'scale') {
      controlHtml = `
        <div class="scale-grid" role="radiogroup" aria-labelledby="lbl_${esc(q.id)}">
          ${q.options.map((opt) => {
            const isSel = hasVal && Number(currentValue) === Number(opt.value);
            return `
              <button type="button" class="scale-btn ${isSel ? 'selected' : ''}"
                data-qid="${esc(q.id)}" data-qtype="scale" data-value="${esc(opt.value)}"
                aria-pressed="${isSel ? 'true' : 'false'}">
                <span class="scale-num">${esc(opt.value)}</span>
                <span class="scale-label">${esc(opt.label)}</span>
              </button>
            `;
          }).join('')}
        </div>
      `;
    }

    return `
      <div class="question-card field-group ${isMeas ? 'is-measurement' : ''} ${hasErr ? 'has-error' : ''}"
           id="wrap_${esc(q.id)}" data-question-wrap="${esc(q.id)}">
        <div class="field-label-row">
          <label class="field-label" id="lbl_${esc(q.id)}" for="q_${esc(q.id)}">
            ${esc(q.text)}${reqTag}
          </label>
          <div class="badge-cluster">
            ${clearBtn}
            ${dataTypePill}
          </div>
        </div>
        ${q.helper ? `<div class="field-helper">${esc(q.helper)}</div>` : ''}
        ${controlHtml}
        ${hasErr ? `<div class="field-error">${U().icon('alertTriangle')} <span>${esc(errorMsg)}</span></div>` : ''}
      </div>
    `;
  }

  function bindSectionEvents(container, section, answers, onChange) {
    const qMap = {};
    section.questions.forEach((q) => { qMap[q.id] = q; });

    container.querySelectorAll('input[data-qtype="text"], textarea[data-qtype="textarea"], input[data-qtype="number"], input[data-qtype="date"]').forEach((el) => {
      el.addEventListener('input', () => {
        const qid = el.dataset.qid;
        const qtype = el.dataset.qtype;
        const raw = el.value;
        if (qtype === 'text' || qtype === 'textarea') {
          const counter = container.querySelector(`[data-counter-for="${qid}"]`);
          if (counter) counter.textContent = String(raw.length);
          onChange(qid, raw === '' ? null : raw, false);
        } else if (qtype === 'number') {
          const parsed = raw === '' ? null : Number(raw);
          const prevFilled = U().isValueFilled(answers[qid]);
          const nextFilled = U().isValueFilled(parsed);
          onChange(qid, parsed, prevFilled !== nextFilled);
        } else if (qtype === 'date') {
          onChange(qid, raw === '' ? null : raw, false);
        }
      });
    });

    container.querySelectorAll('input[data-qtype="single_choice"]').forEach((el) => {
      el.addEventListener('change', () => onChange(el.dataset.qid, el.value, true));
    });

    container.querySelectorAll('input[data-qtype="multi_choice"]').forEach((el) => {
      el.addEventListener('change', () => {
        const qid = el.dataset.qid;
        const val = el.value;
        const isExcl = el.dataset.exclusive === 'true';
        const q = qMap[qid];
        const exclVals = new Set((q?.options || []).filter((o) => o.exclusive).map((o) => String(o.value)));
        let next = Array.isArray(answers[qid]) ? [...answers[qid].map(String)] : [];
        if (el.checked) {
          if (isExcl) next = [val];
          else {
            next = next.filter((v) => !exclVals.has(v));
            if (!next.includes(val)) next.push(val);
          }
        } else {
          next = next.filter((v) => v !== val);
        }
        onChange(qid, next.length > 0 ? next : null, true);
      });
    });

    container.querySelectorAll('button[data-qtype="scale"]').forEach((btn) => {
      btn.addEventListener('click', () => onChange(btn.dataset.qid, Number(btn.dataset.value), true));
    });

    container.querySelectorAll('button[data-clear-q]').forEach((btn) => {
      btn.addEventListener('click', () => onChange(btn.dataset.clearQ, null, true));
    });
  }

  global.TelehealthFormEngine = {
    normalizeForm,
    getVisibleSections,
    getVisibleQuestions,
    getAllVisibleQuestions,
    findQuestionSectionIndex,
    formatAnswerDisplay,
    computeLiveStats,
    buildPatchAnswers,
    buildValidateAnswers,
    renderQuestionHtml,
    bindSectionEvents
  };
})(window);

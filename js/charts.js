/**
 * js/charts.js
 * Wrapper Chart.js untuk Dashboard Beranda & halaman Analitik Klinis.
 * Menangani pembersihan instance, tema Light/Dark, dan fallback elegan bila offline.
 */
(function (global) {
  'use strict';

  const registry = new Map();

  function destroyAll() {
    registry.forEach((chart) => {
      try { chart.destroy(); } catch {}
    });
    registry.clear();
  }

  function getPalette() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: dark ? '#cbd5e1' : '#475569',
      grid: dark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.07)',
      teal: '#0d9488',
      tealFill: dark ? 'rgba(20, 184, 166, 0.22)' : 'rgba(13, 148, 136, 0.14)',
      sky: '#0284c7',
      indigo: '#6366f1',
      amber: '#d97706',
      emerald: '#059669',
      slate: dark ? '#64748b' : '#94a3b8'
    };
  }

  function renderStatusDonut(canvasId, stats) {
    const el = document.getElementById(canvasId);
    if (!el || !global.Chart) return null;
    if (registry.has(canvasId)) { registry.get(canvasId).destroy(); }

    const p = getPalette();
    const values = [
      Number(stats.draf ?? 0),
      Number((stats.menunggu ?? 0) + (stats.sedang_ditinjau ?? 0)),
      Number(stats.perlu_klarifikasi ?? 0),
      Number(stats.sudah_ditinjau ?? 0)
    ];
    const total = values.reduce((a, b) => a + b, 0);

    const chart = new global.Chart(el, {
      type: 'doughnut',
      data: {
        labels: ['Draf', 'Menunggu / Ditinjau', 'Perlu Klarifikasi', 'Sudah Ditinjau'],
        datasets: [{
          data: total > 0 ? values : [1],
          backgroundColor: total > 0 ? [p.slate, p.sky, p.amber, p.emerald] : [p.grid],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: p.text, boxWidth: 11, padding: 14, font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 } }
          },
          tooltip: {
            enabled: total > 0
          }
        }
      }
    });
    registry.set(canvasId, chart);
    return chart;
  }

  function renderGadTrend(canvasId, points) {
    const el = document.getElementById(canvasId);
    if (!el || !global.Chart) return null;
    if (registry.has(canvasId)) { registry.get(canvasId).destroy(); }

    const p = getPalette();
    const labels = points.map((pt) => pt.label);
    const scores = points.map((pt) => pt.score);

    const chart = new global.Chart(el, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Skor GAD-7 (0–21)',
          data: scores,
          borderColor: p.teal,
          backgroundColor: p.tealFill,
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: p.teal,
          pointBorderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 21,
            ticks: { stepSize: 5, color: p.text, font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: p.grid }
          },
          x: {
            ticks: { color: p.text, font: { family: 'Plus Jakarta Sans', size: 11 } },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                const s = ctx.parsed.y;
                if (s <= 4) return 'Kategori: Minimal (0–4)';
                if (s <= 9) return 'Kategori: Ringan (5–9)';
                if (s <= 14) return 'Kategori: Sedang (10–14)';
                return 'Kategori: Berat (15–21)';
              }
            }
          }
        }
      }
    });
    registry.set(canvasId, chart);
    return chart;
  }

  function renderFormCompositionBar(canvasId, counts) {
    const el = document.getElementById(canvasId);
    if (!el || !global.Chart) return null;
    if (registry.has(canvasId)) { registry.get(canvasId).destroy(); }

    const p = getPalette();
    const chart = new global.Chart(el, {
      type: 'bar',
      data: {
        labels: ['FRM-KELUHAN (Keluhan)', 'FRM-GAD7 (Kecemasan)'],
        datasets: [
          {
            label: 'Terkirim',
            data: [counts.keluhanTerkirim || 0, counts.gadTerkirim || 0],
            backgroundColor: p.teal,
            borderRadius: 8
          },
          {
            label: 'Draf',
            data: [counts.keluhanDraf || 0, counts.gadDraf || 0],
            backgroundColor: p.slate,
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: p.text, font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: p.grid }
          },
          x: {
            ticks: { color: p.text, font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 } },
            grid: { display: false }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: p.text, boxWidth: 11, font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 } }
          }
        }
      }
    });
    registry.set(canvasId, chart);
    return chart;
  }

  global.TelehealthCharts = {
    destroyAll,
    renderStatusDonut,
    renderGadTrend,
    renderFormCompositionBar
  };
})(window);

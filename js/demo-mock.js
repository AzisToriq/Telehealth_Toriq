/**
 * js/demo-mock.js
 * Simulator API Self-Assessment Telehealth v2.0 (Mode Demo Interaktif / Sandbox).
 * Aktif HANYA ketika pengguna memilih Mode Demo agar pengunjung Vercel dapat
 * menguji seluruh fitur tanpa perlu memiliki token server dosen.
 */
(function (global) {
  'use strict';

  const DEMO_KEY = 'pulsecare_demo_sandbox_db_v1';
  const U = () => global.TelehealthUtils;

  const FORMS = {
    'FRM-KELUHAN': {
      id: 'FRM-KELUHAN',
      judul: 'Formulir Keluhan Pasien Sebelum Konsultasi',
      versi: '1.0',
      deskripsi: 'Ceritakan keluhan Anda sebelum konsultasi. Jawaban akan ditinjau oleh tenaga kesehatan.',
      jenis_hasil: 'Ringkasan jawaban (tanpa skor)',
      estimasi_menit: 5,
      periode_pelaporan: 'Kondisi saat ini dan 7 hari terakhir',
      petunjuk: [
        'Formulir ini membantu Anda menyampaikan keluhan sebelum konsultasi.',
        'Jawab sesuai kondisi yang Anda rasakan. Tidak ada jawaban benar atau salah.',
        'Pertanyaan bertanda wajib (*) harus diisi sebelum formulir dapat dikirim.',
        'Anda dapat menyimpan jawaban sebagai draf dan melanjutkannya nanti.',
        'Hasil self-assessment BUKAN diagnosis. Jawaban akan ditinjau oleh tenaga kesehatan.'
      ],
      persetujuan: 'Saya memahami bahwa data yang saya isi digunakan untuk persiapan konsultasi, hanya dapat diakses oleh petugas yang berwenang, dan hasilnya bukan diagnosis.',
      keterbatasan: 'Hasil self-assessment bukan diagnosis. Hasil akan ditinjau bersama informasi lain oleh tenaga kesehatan.',
      sections: [
        {
          id: 'pengisi',
          judul: 'Identitas Pengisi',
          deskripsi: 'Siapa yang mengisi formulir ini?',
          questions: [
            {
              id: 'sumber_pengisi', label: 'Sumber data', pertanyaan: 'Siapa yang mengisi formulir ini?',
              type: 'single_choice', required: true, data_type: 'subjektif',
              options: [
                { value: 'pasien', label: 'Saya sendiri (pasien)' },
                { value: 'pendamping', label: 'Pendamping / keluarga pasien' }
              ]
            },
            {
              id: 'nama_pendamping', label: 'Nama pendamping', pertanyaan: 'Nama pendamping yang membantu pengisian',
              type: 'text', required: true, max_length: 100, data_type: 'subjektif',
              show_if: { question: 'sumber_pengisi', equals: 'pendamping' }
            },
            {
              id: 'hubungan_pendamping', label: 'Hubungan pendamping', pertanyaan: 'Apa hubungan pendamping dengan pasien?',
              type: 'single_choice', required: true, data_type: 'subjektif',
              show_if: { question: 'sumber_pengisi', equals: 'pendamping' },
              options: [
                { value: 'keluarga', label: 'Keluarga' },
                { value: 'pasangan', label: 'Suami / istri' },
                { value: 'pengasuh', label: 'Pengasuh / perawat rumah' },
                { value: 'lainnya', label: 'Lainnya' }
              ]
            }
          ]
        },
        {
          id: 'keluhan_utama',
          judul: 'Keluhan Utama',
          deskripsi: 'Sampaikan keluhan yang sedang Anda rasakan.',
          questions: [
            {
              id: 'ada_keluhan', label: 'Ada keluhan', pertanyaan: 'Apakah Anda memiliki keluhan saat ini?',
              type: 'single_choice', required: true, data_type: 'subjektif',
              options: [{ value: 'ya', label: 'Ya' }, { value: 'tidak', label: 'Tidak' }]
            },
            {
              id: 'keluhan_utama', label: 'Keluhan utama', pertanyaan: 'Apa keluhan utama Anda?',
              type: 'text', required: true, max_length: 150, data_type: 'subjektif',
              placeholder: 'Contoh: Sulit tidur atau pusing berputar',
              show_if: { question: 'ada_keluhan', equals: 'ya' }
            },
            {
              id: 'waktu_mulai', label: 'Waktu mulai', pertanyaan: 'Sejak kapan keluhan muncul?',
              type: 'single_choice', required: true, data_type: 'subjektif',
              show_if: { question: 'ada_keluhan', equals: 'ya' },
              options: [
                { value: 'hari_ini', label: 'Hari ini' },
                { value: 'kemarin', label: 'Kemarin' },
                { value: '2_7_hari', label: '2–7 hari lalu' },
                { value: 'lebih_7_hari', label: 'Lebih dari 7 hari lalu' },
                { value: 'tidak_ingat', label: 'Tidak ingat' }
              ]
            }
          ]
        },
        {
          id: 'rincian_keluhan',
          judul: 'Rincian Keluhan',
          deskripsi: 'Rincian yang relevan dengan keluhan Anda dalam 7 hari terakhir.',
          show_if: { question: 'ada_keluhan', equals: 'ya' },
          questions: [
            {
              id: 'frekuensi', label: 'Frekuensi', pertanyaan: 'Dalam 7 hari terakhir, seberapa sering keluhan tersebut Anda rasakan?',
              type: 'scale', required: true, data_type: 'subjektif',
              options: [
                { value: 1, label: 'Sangat jarang' }, { value: 2, label: 'Jarang' },
                { value: 3, label: 'Kadang-kadang' }, { value: 4, label: 'Sering' },
                { value: 5, label: 'Sangat sering' }
              ]
            },
            {
              id: 'jumlah_hari', label: 'Jumlah hari muncul', pertanyaan: 'Dalam 7 hari terakhir, berapa hari keluhan tersebut muncul?',
              type: 'number', required: true, min: 0, max: 7, satuan: 'hari', data_type: 'subjektif'
            },
            {
              id: 'tingkat_keparahan', label: 'Tingkat keluhan', pertanyaan: 'Menurut Anda, seberapa berat keluhan tersebut saat ini?',
              helper: 'Persepsi pasien, bukan penilaian klinis.',
              type: 'scale', required: false, data_type: 'subjektif',
              options: [{ value: 1, label: 'Ringan' }, { value: 2, label: 'Sedang' }, { value: 3, label: 'Berat' }]
            },
            {
              id: 'mengganggu_aktivitas', label: 'Aktivitas terganggu', pertanyaan: 'Apakah keluhan mengganggu aktivitas sehari-hari Anda?',
              type: 'single_choice', required: true, data_type: 'subjektif',
              options: [{ value: 'ya', label: 'Ya' }, { value: 'tidak', label: 'Tidak' }]
            },
            {
              id: 'aktivitas_terganggu', label: 'Jenis aktivitas terganggu', pertanyaan: 'Aktivitas apa saja yang terganggu? (boleh pilih lebih dari satu)',
              type: 'multi_choice', required: true, data_type: 'subjektif',
              show_if: { question: 'mengganggu_aktivitas', equals: 'ya' },
              options: [
                { value: 'bekerja_belajar', label: 'Bekerja / belajar' },
                { value: 'tidur', label: 'Tidur / istirahat' },
                { value: 'makan', label: 'Makan / minum' },
                { value: 'pekerjaan_rumah', label: 'Pekerjaan rumah' },
                { value: 'olahraga', label: 'Olahraga / aktivitas fisik' },
                { value: 'sosial', label: 'Berinteraksi dengan orang lain' }
              ]
            },
            {
              id: 'keterangan_tambahan', label: 'Keterangan tambahan', pertanyaan: 'Keterangan tambahan tentang keluhan Anda',
              type: 'textarea', required: false, max_length: 500, data_type: 'subjektif',
              placeholder: 'Contoh: Sulit berkonsentrasi saat kuliah atau bekerja.'
            }
          ]
        },
        {
          id: 'informasi_pendukung',
          judul: 'Informasi Pendukung',
          deskripsi: 'Riwayat kesehatan, alergi, dan data pengukuran bila tersedia.',
          questions: [
            {
              id: 'riwayat_penyakit', label: 'Riwayat penyakit', pertanyaan: 'Apakah Anda memiliki riwayat penyakit berikut?',
              type: 'multi_choice', required: true, data_type: 'subjektif',
              options: [
                { value: 'hipertensi', label: 'Tekanan darah tinggi' },
                { value: 'diabetes', label: 'Kencing manis (diabetes)' },
                { value: 'asma', label: 'Asma' },
                { value: 'jantung', label: 'Penyakit jantung' },
                { value: 'lainnya', label: 'Lainnya' },
                { value: 'tidak_ada', label: 'Tidak ada', exclusive: true }
              ]
            },
            {
              id: 'riwayat_lainnya', label: 'Riwayat penyakit lainnya', pertanyaan: 'Sebutkan riwayat penyakit lainnya',
              type: 'text', required: true, max_length: 150, data_type: 'subjektif',
              show_if: { question: 'riwayat_penyakit', includes: 'lainnya' }
            },
            {
              id: 'obat_dikonsumsi', label: 'Obat dikonsumsi', pertanyaan: 'Obat yang sedang Anda konsumsi (jika ada)',
              type: 'textarea', required: false, max_length: 300, data_type: 'subjektif'
            },
            {
              id: 'alergi', label: 'Alergi', pertanyaan: 'Apakah Anda memiliki alergi obat atau makanan?',
              type: 'single_choice', required: true, data_type: 'subjektif',
              options: [
                { value: 'ya', label: 'Ya' }, { value: 'tidak', label: 'Tidak' }, { value: 'tidak_tahu', label: 'Tidak tahu' }
              ]
            },
            {
              id: 'detail_alergi', label: 'Detail alergi', pertanyaan: 'Sebutkan alergi Anda',
              type: 'text', required: true, max_length: 150, data_type: 'subjektif',
              show_if: { question: 'alergi', equals: 'ya' }
            },
            {
              id: 'suhu_tubuh', label: 'Suhu tubuh', pertanyaan: 'Suhu tubuh terakhir yang diukur (jika ada)',
              type: 'number', required: false, min: 34, max: 43, satuan: '°C', data_type: 'pengukuran'
            },
            {
              id: 'berat_badan', label: 'Berat badan', pertanyaan: 'Berat badan terakhir (jika ada)',
              type: 'number', required: false, min: 2, max: 300, satuan: 'kg', data_type: 'pengukuran'
            },
            {
              id: 'tanggal_pengukuran', label: 'Tanggal pengukuran', pertanyaan: 'Tanggal pengukuran suhu / berat badan',
              type: 'date', required: true, data_type: 'pengukuran',
              show_if: { any: [{ question: 'suhu_tubuh', filled: true }, { question: 'berat_badan', filled: true }] }
            },
            {
              id: 'tujuan_konsultasi', label: 'Tujuan konsultasi', pertanyaan: 'Apa yang ingin Anda bahas atau dibantu dalam konsultasi?',
              type: 'single_choice', required: true, data_type: 'subjektif',
              options: [
                { value: 'keluhan_baru', label: 'Membahas keluhan baru' },
                { value: 'kontrol', label: 'Kontrol / pemantauan kondisi' },
                { value: 'obat', label: 'Konsultasi obat' },
                { value: 'rujukan', label: 'Meminta rujukan' },
                { value: 'lainnya', label: 'Lainnya' }
              ]
            }
          ]
        }
      ]
    },
    'FRM-GAD7': {
      id: 'FRM-GAD7',
      judul: 'Kuesioner Kecemasan (GAD-7)',
      versi: '1.0',
      deskripsi: 'Instrumen tervalidasi Generalized Anxiety Disorder-7 untuk memantau gejala kecemasan dalam 2 minggu terakhir.',
      jenis_hasil: 'Skor 0–21 + kategori',
      estimasi_menit: 3,
      periode_pelaporan: '2 minggu terakhir',
      petunjuk: [
        'Jawab seberapa sering Anda terganggu oleh kondisi berikut selama 2 minggu terakhir.',
        'Skala 0 = Tidak sama sekali, 1 = Beberapa hari, 2 = Lebih dari separuh waktu, 3 = Hampir setiap hari.',
        'Skor GAD-7 dihitung otomatis oleh sistem dan BUKAN diagnosis medis.'
      ],
      persetujuan: 'Saya memahami bahwa hasil kuesioner GAD-7 adalah skrining awal, bukan diagnosis medis, dan akan ditinjau oleh tenaga kesehatan.',
      keterbatasan: 'Kategori skor GAD-7 adalah bahan peninjauan klinis awal, bukan diagnosis.',
      sections: [
        {
          id: 'butir_gad7',
          judul: 'Pertanyaan GAD-7 (2 Minggu Terakhir)',
          deskripsi: 'Pilih skala 0 sampai 3 sesuai frekuensi yang Anda rasakan.',
          questions: [
            ['gad_1', 'Gugup/cemas', 'Merasa gugup, cemas, atau tegang?'],
            ['gad_2', 'Sulit kendalikan khawatir', 'Tidak mampu menghentikan atau mengendalikan rasa khawatir?'],
            ['gad_3', 'Terlalu khawatir', 'Terlalu mengkhawatirkan berbagai hal?'],
            ['gad_4', 'Sulit santai', 'Sulit untuk merasa santai?'],
            ['gad_5', 'Gelisah', 'Sangat gelisah sehingga sulit untuk duduk diam?'],
            ['gad_6', 'Mudah kesal', 'Menjadi mudah kesal atau mudah tersinggung?'],
            ['gad_7', 'Takut hal buruk', 'Merasa takut seolah-olah sesuatu yang buruk akan terjadi?']
          ].map(([id, label, qText]) => ({
            id, label,
            pertanyaan: `Dalam 2 minggu terakhir, seberapa sering Anda terganggu oleh: ${qText}`,
            type: 'scale', required: true, data_type: 'subjektif',
            options: [
              { value: 0, label: 'Tidak sama sekali' },
              { value: 1, label: 'Beberapa hari' },
              { value: 2, label: 'Lebih dari separuh waktu' },
              { value: 3, label: 'Hampir setiap hari' }
            ]
          }))
        },
        {
          id: 'dampak',
          judul: 'Dampak pada Aktivitas',
          deskripsi: 'Seberapa besar dampak kondisi tersebut pada aktivitas harian Anda.',
          questions: [
            {
              id: 'gad_kesulitan', label: 'Kesulitan fungsi',
              pertanyaan: 'Jika Anda mengalami masalah di atas, seberapa sulit masalah tersebut membuat Anda bekerja, mengurus rumah, atau bergaul dengan orang lain?',
              type: 'single_choice', required: false, data_type: 'subjektif',
              options: [
                { value: 'tidak_sulit', label: 'Tidak sulit sama sekali' },
                { value: 'agak_sulit', label: 'Agak sulit' },
                { value: 'sangat_sulit', label: 'Sangat sulit' },
                { value: 'amat_sangat_sulit', label: 'Amat sangat sulit' }
              ]
            }
          ]
        }
      ]
    }
  };

  function statusObj(kode) {
    const labels = {
      draft: 'Draf (belum dikirim)',
      terkirim: 'Terkirim',
      belum_dikirim: 'Belum dikirim',
      menunggu_peninjauan: 'Menunggu peninjauan',
      sedang_ditinjau: 'Sedang ditinjau',
      perlu_klarifikasi: 'Perlu klarifikasi',
      klarifikasi_dijawab: 'Klarifikasi sudah dijawab',
      sudah_ditinjau: 'Sudah ditinjau'
    };
    return { kode, label: labels[kode] || kode };
  }

  function statusMessage(kode) {
    const map = {
      belum_dikirim: 'Formulir masih berupa draf dan belum dikirim ke petugas.',
      menunggu_peninjauan: 'Laporan Anda sudah diterima dan sedang menunggu peninjauan petugas.',
      sedang_ditinjau: 'Petugas kesehatan sedang meninjau laporan Anda.',
      perlu_klarifikasi: 'Petugas meminta informasi tambahan. Silakan jawab pertanyaan klarifikasi di bawah.',
      klarifikasi_dijawab: 'Jawaban klarifikasi Anda telah diterima dan menunggu tindak lanjut petugas.',
      sudah_ditinjau: 'Laporan Anda sudah selesai ditinjau. Silakan lihat arahan tindak lanjut dari petugas.'
    };
    return map[kode] || '';
  }

  function answerLabel(q, val) {
    if (!U().isValueFilled(val)) return 'Belum diisi';
    if (q.type === 'single_choice') {
      const f = (q.options || []).find((o) => String(o.value) === String(val));
      return f ? f.label : String(val);
    }
    if (q.type === 'scale') {
      const f = (q.options || []).find((o) => Number(o.value) === Number(val));
      return f ? `${f.label} (${f.value})` : String(val);
    }
    if (q.type === 'multi_choice' && Array.isArray(val)) {
      return val.map((v) => {
        const f = (q.options || []).find((o) => String(o.value) === String(v));
        return f ? f.label : String(v);
      }).join(', ');
    }
    return q.satuan ? `${val} ${q.satuan}` : String(val);
  }

  function evaluateForm(formId, answers) {
    const form = FORMS[formId];
    const ans = answers || {};
    const errors = {};
    const visibleIds = [];
    const ringkasan = [];
    let wajibTotal = 0;
    let wajibTerisi = 0;

    form.sections.forEach((sec) => {
      if (!U().isVisible(sec.show_if, ans)) return;
      sec.questions.forEach((q) => {
        if (!U().isVisible(q.show_if, ans)) return;
        visibleIds.push(q.id);
        const val = ans[q.id];
        const filled = U().isValueFilled(val);
        if (q.required) {
          wajibTotal += 1;
          if (filled) wajibTerisi += 1;
          else errors[q.id] = `Silakan isi ${q.label.toLowerCase()}.`;
        }
        if (filled && q.type === 'number') {
          const n = Number(val);
          if (q.min !== undefined && n < q.min || q.max !== undefined && n > q.max) {
            errors[q.id] = `Nilai ${q.label} harus di antara ${q.min} dan ${q.max}.`;
          }
        }
        if (filled && q.type === 'multi_choice' && Array.isArray(val) && val.includes('tidak_ada') && val.length > 1) {
          errors[q.id] = 'Pilihan "Tidak ada" tidak boleh digabung dengan pilihan lain.';
        }
        ringkasan.push({
          question_id: q.id,
          label: q.label,
          pertanyaan: q.pertanyaan,
          jawaban: filled ? val : null,
          jawaban_teks: answerLabel(q, val),
          terisi: filled,
          wajib: Boolean(q.required),
          data_type: q.data_type || 'subjektif',
          satuan: q.satuan || null
        });
      });
    });

    const valid = Object.keys(errors).length === 0;
    const persen = wajibTotal > 0 ? Math.round((wajibTerisi / wajibTotal) * 100) : 100;

    let skor = null;
    if (formId === 'FRM-GAD7') {
      const ids = ['gad_1', 'gad_2', 'gad_3', 'gad_4', 'gad_5', 'gad_6', 'gad_7'];
      const total = ids.reduce((acc, k) => acc + (U().isValueFilled(ans[k]) ? Number(ans[k]) : 0), 0);
      const cat = total <= 4 ? { kode: 'minimal', label: 'Minimal', rentang: '0-4' }
        : total <= 9 ? { kode: 'ringan', label: 'Ringan', rentang: '5-9' }
        : total <= 14 ? { kode: 'sedang', label: 'Sedang', rentang: '10-14' }
        : { kode: 'berat', label: 'Berat', rentang: '15-21' };
      skor = {
        total, maks: 21, kategori: cat,
        keterangan: `Skor ${total} dari 21 termasuk kategori gejala ${cat.label} menurut ambang instrumen — bukan diagnosis.`
      };
    }

    const judul = formId === 'FRM-GAD7'
      ? `Kuesioner Kecemasan (GAD-7) — skor ${skor.total} (${skor.kategori.label})`
      : (ans.ada_keluhan === 'tidak' ? 'Tidak ada keluhan' : (ans.keluhan_utama || 'Draf Keluhan Pasien'));

    return {
      valid, errors, visibleIds,
      kelengkapan: {
        status: valid ? 'lengkap' : 'belum_lengkap',
        label: valid ? 'Lengkap' : 'Belum lengkap',
        wajib_terisi: wajibTerisi,
        wajib_total: wajibTotal,
        persen
      },
      hasil: {
        jenis: formId === 'FRM-GAD7' ? 'skor_instrumen' : 'ringkasan',
        judul,
        ringkasan,
        kelengkapan: {
          status: valid ? 'lengkap' : 'belum_lengkap',
          label: valid ? 'Lengkap' : 'Belum lengkap',
          wajib_terisi: wajibTerisi,
          wajib_total: wajibTotal,
          persen
        },
        skor,
        keterbatasan: form.keterbatasan,
        langkah_berikutnya: 'Tunggu hasil peninjauan petugas. Anda dapat memantau status di halaman Tracking Status.'
      }
    };
  }

  function createSeedDb() {
    const now = Date.now();
    const h = (hrs) => new Date(now - hrs * 3600000).toISOString();
    const future = (days) => new Date(now + days * 86400000).toISOString();

    return {
      nextSeq: 106,
      features: {
        buat: true, simpan_draf: true, validasi: true, kirim: true,
        riwayat: true, hasil: true, status: true, klarifikasi: false, tindak_lanjut: false, gad7: true
      },
      items: [
        {
          id: 'DEMO-0101',
          form_id: 'FRM-KELUHAN',
          status_pengiriman: 'terkirim',
          status_peninjauan: 'sudah_ditinjau',
          dibuat_pada: h(72),
          dikirim_pada: h(71),
          answers: {
            sumber_pengisi: 'pasien', ada_keluhan: 'ya', keluhan_utama: 'Sulit tidur & lelah saat pagi',
            waktu_mulai: '2_7_hari', frekuensi: 4, jumlah_hari: 5, tingkat_keparahan: 2,
            mengganggu_aktivitas: 'ya', aktivitas_terganggu: ['tidur', 'bekerja_belajar'],
            keterangan_tambahan: 'Sering terbangun jam 2 pagi dan sulit tidur kembali.',
            riwayat_penyakit: ['tidak_ada'], alergi: 'tidak', suhu_tubuh: 36.7, berat_badan: 64,
            tanggal_pengukuran: U().todayIsoDate(), tujuan_konsultasi: 'keluhan_baru'
          },
          klarifikasi: [
            { id: 'KL-D01', pertanyaan: 'Apakah Anda mengonsumsi kafein pada sore atau malam hari?', status: 'dijawab', jawaban: 'Ya, kadang minum kopi jam 5 sore saat mengerjakan tugas.', dibuat_pada: h(60) }
          ],
          tindak_lanjut: {
            jenis: { kode: 'jadwalkan_konsultasi', label: 'Jadwalkan konsultasi' },
            arahan: 'Petugas menyarankan sesi konsultasi telemedisin singkat untuk evaluasi pola tidur dan edukasi sleep hygiene.',
            jadwal_konsultasi: future(3),
            dicatat_oleh: { nama: 'Ns. Rina Kartika, S.Kep.' },
            dicatat_pada: h(48)
          },
          timeline: [
            { waktu: h(72), event: 'dibuat', keterangan: 'Pasien mulai mengisi formulir.', oleh: 'Pasien' },
            { waktu: h(71), event: 'dikirim', keterangan: 'Formulir dikirim dan diterima sistem.', oleh: 'Pasien' },
            { waktu: h(64), event: 'mulai_ditinjau', keterangan: 'Petugas mulai meninjau laporan.', oleh: 'Ns. Rina Kartika, S.Kep.' },
            { waktu: h(60), event: 'klarifikasi_diminta', keterangan: 'Petugas meminta klarifikasi (KL-D01).', oleh: 'Ns. Rina Kartika, S.Kep.' },
            { waktu: h(54), event: 'klarifikasi_dijawab', keterangan: 'Pasien menjawab klarifikasi KL-D01.', oleh: 'Pasien' },
            { waktu: h(48), event: 'tindak_lanjut', keterangan: 'Petugas mencatat tindak lanjut: Jadwalkan konsultasi.', oleh: 'Ns. Rina Kartika, S.Kep.' }
          ]
        },
        {
          id: 'DEMO-0102',
          form_id: 'FRM-KELUHAN',
          status_pengiriman: 'terkirim',
          status_peninjauan: 'perlu_klarifikasi',
          dibuat_pada: h(26),
          dikirim_pada: h(25),
          answers: {
            sumber_pengisi: 'pasien', ada_keluhan: 'ya', keluhan_utama: 'Pusing ringan dan tenggorokan kering',
            waktu_mulai: 'kemarin', frekuensi: 3, jumlah_hari: 2, tingkat_keparahan: 1,
            mengganggu_aktivitas: 'tidak', riwayat_penyakit: ['tidak_ada'], alergi: 'tidak',
            suhu_tubuh: 37.6, berat_badan: 64, tanggal_pengukuran: U().todayIsoDate(),
            tujuan_konsultasi: 'keluhan_baru'
          },
          klarifikasi: [
            { id: 'KL-D02', pertanyaan: 'Apakah pusing disertai rasa berputar atau hanya nyeri kepala ringan saat berdiri?', status: 'menunggu_jawaban', jawaban: null, dibuat_pada: h(12) }
          ],
          tindak_lanjut: null,
          timeline: [
            { waktu: h(26), event: 'dibuat', keterangan: 'Pasien mulai mengisi formulir.', oleh: 'Pasien' },
            { waktu: h(25), event: 'dikirim', keterangan: 'Formulir dikirim dan diterima sistem.', oleh: 'Pasien' },
            { waktu: h(12), event: 'klarifikasi_diminta', keterangan: 'Petugas meminta klarifikasi (KL-D02).', oleh: 'Ns. Rina Kartika, S.Kep.' }
          ]
        },
        {
          id: 'DEMO-0103',
          form_id: 'FRM-GAD7',
          status_pengiriman: 'terkirim',
          status_peninjauan: 'sudah_ditinjau',
          dibuat_pada: h(120),
          dikirim_pada: h(119),
          answers: { gad_1: 1, gad_2: 1, gad_3: 1, gad_4: 1, gad_5: 0, gad_6: 2, gad_7: 1, gad_kesulitan: 'agak_sulit' },
          klarifikasi: [],
          tindak_lanjut: {
            jenis: { kode: 'pemantauan_mandiri', label: 'Pemantauan mandiri' },
            arahan: 'Lanjutkan latihan relaksasi pernapasan dan isi ulang GAD-7 dalam 1 minggu ke depan.',
            jadwal_konsultasi: null,
            dicatat_oleh: { nama: 'Ns. Rina Kartika, S.Kep.' },
            dicatat_pada: h(100)
          },
          timeline: [
            { waktu: h(120), event: 'dibuat', keterangan: 'Pasien mulai mengisi GAD-7.', oleh: 'Pasien' },
            { waktu: h(119), event: 'dikirim', keterangan: 'Formulir dikirim dan diterima sistem.', oleh: 'Pasien' },
            { waktu: h(100), event: 'tindak_lanjut', keterangan: 'Petugas mencatat tindak lanjut: Pemantauan mandiri.', oleh: 'Ns. Rina Kartika, S.Kep.' }
          ]
        },
        {
          id: 'DEMO-0104',
          form_id: 'FRM-GAD7',
          status_pengiriman: 'terkirim',
          status_peninjauan: 'menunggu_peninjauan',
          dibuat_pada: h(8),
          dikirim_pada: h(7),
          answers: { gad_1: 2, gad_2: 1, gad_3: 2, gad_4: 2, gad_5: 1, gad_6: 1, gad_7: 1, gad_kesulitan: 'agak_sulit' },
          klarifikasi: [],
          tindak_lanjut: null,
          timeline: [
            { waktu: h(8), event: 'dibuat', keterangan: 'Pasien mulai mengisi GAD-7.', oleh: 'Pasien' },
            { waktu: h(7), event: 'dikirim', keterangan: 'Formulir dikirim dan diterima sistem.', oleh: 'Pasien' }
          ]
        },
        {
          id: 'DEMO-0105',
          form_id: 'FRM-KELUHAN',
          status_pengiriman: 'draft',
          status_peninjauan: 'belum_dikirim',
          dibuat_pada: h(2),
          dikirim_pada: null,
          answers: { sumber_pengisi: 'pasien', ada_keluhan: 'ya', keluhan_utama: 'Nyeri punggung setelah duduk lama' },
          klarifikasi: [],
          tindak_lanjut: null,
          timeline: [
            { waktu: h(2), event: 'dibuat', keterangan: 'Draf keluhan dibuat.', oleh: 'Pasien' }
          ]
        }
      ]
    };
  }

  function loadDb() {
    try {
      const raw = sessionStorage.getItem(DEMO_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    const seed = createSeedDb();
    saveDb(seed);
    return seed;
  }

  function saveDb(db) {
    sessionStorage.setItem(DEMO_KEY, JSON.stringify(db));
  }

  function resetDb() {
    const seed = createSeedDb();
    saveDb(seed);
    return seed;
  }

  function buildComparison(db, item) {
    if (item.status_pengiriman !== 'terkirim') return null;
    const prev = db.items
      .filter((x) => x.id !== item.id && x.form_id === item.form_id && x.status_pengiriman === 'terkirim' && new Date(x.dikirim_pada) < new Date(item.dikirim_pada))
      .sort((a, b) => new Date(b.dikirim_pada) - new Date(a.dikirim_pada))[0];
    if (!prev) return null;

    const evCur = evaluateForm(item.form_id, item.answers);
    const evPrev = evaluateForm(prev.form_id, prev.answers);
    const diffs = [];
    const form = FORMS[item.form_id];
    form.sections.forEach((s) => s.questions.forEach((q) => {
      const a = answerLabel(q, prev.answers[q.id]);
      const b = answerLabel(q, item.answers[q.id]);
      if (a !== b) diffs.push({ question_id: q.id, label: q.label, sebelumnya: a, sekarang: b });
    }));

    return {
      pembanding_id: prev.id,
      jumlah_perubahan: diffs.length,
      perubahan: diffs,
      skor: (evCur.hasil.skor && evPrev.hasil.skor) ? {
        sebelumnya: evPrev.hasil.skor.total,
        sekarang: evCur.hasil.skor.total,
        selisih: evCur.hasil.skor.total - evPrev.hasil.skor.total
      } : null
    };
  }

  function formatSummaryItem(item) {
    const ev = evaluateForm(item.form_id, item.answers);
    const form = FORMS[item.form_id];
    return {
      id: item.id,
      judul: ev.hasil.judul,
      form: { id: form.id, judul: form.judul, versi: form.versi },
      status_pengiriman: statusObj(item.status_pengiriman),
      status_peninjauan: statusObj(item.status_peninjauan),
      status_kelengkapan: ev.kelengkapan.status,
      skor: ev.hasil.skor,
      klarifikasi_menunggu: (item.klarifikasi || []).filter((k) => k.status === 'menunggu_jawaban').length,
      ada_tindak_lanjut: Boolean(item.tindak_lanjut),
      dibuat_pada: item.dibuat_pada,
      dikirim_pada: item.dikirim_pada
    };
  }

  async function handle(path, options = {}) {
    await new Promise((r) => setTimeout(r, 110));
    const method = (options.method || 'GET').toUpperCase();
    const cfg = global.TelehealthConfig.loadConfig();
    const db = loadDb();

    // Parse path & query
    const [rawPath, qs] = (path || '/').split('?');
    const cleanPath = rawPath.replace(/\/+$/, '') || '/';
    const params = new URLSearchParams(qs || '');

    // Simulated diagnostic errors (for Test Bench)
    if (options.token === 'tlh_pasien_TOKEN_SALAH_UJI') {
      throw { status: 401, success: false, message: 'Token tidak valid (Simulasi Sandbox 401).', errors: null };
    }
    if (cleanPath === '/review/queue') {
      throw { status: 403, success: false, message: 'Akses ditolak. Endpoint ini hanya untuk peran: petugas, admin.', errors: null };
    }

    // GET /api
    if (cleanPath === '/' && method === 'GET') {
      return {
        success: true,
        message: 'API Self-Assessment Telehealth aktif (Mode Demo Sandbox).',
        data: {
          nama: 'PulseCare Sandbox API Simulator',
          versi: '2.0.0-demo',
          waktu_server: new Date().toISOString(),
          endpoint: Object.keys(FORMS)
        }
      };
    }

    // GET /me
    if (cleanPath === '/me' && method === 'GET') {
      const items = db.items;
      return {
        success: true,
        message: 'OK',
        data: {
          id: 'P-DEMO',
          role: 'pasien',
          nama: cfg.mahasiswa.nama || 'Pengunjung Demo',
          no_rm: 'RM-DEMO-2026',
          statistik: {
            filter_nim: cfg.mahasiswa.nim,
            total: items.length,
            draf: items.filter((i) => i.status_pengiriman === 'draft').length,
            menunggu: items.filter((i) => i.status_peninjauan === 'menunggu_peninjauan').length,
            sedang_ditinjau: items.filter((i) => i.status_peninjauan === 'sedang_ditinjau').length,
            perlu_klarifikasi: items.filter((i) => i.status_peninjauan === 'perlu_klarifikasi').length,
            sudah_ditinjau: items.filter((i) => i.status_peninjauan === 'sudah_ditinjau').length
          }
        }
      };
    }

    // GET /forms
    if (cleanPath === '/forms' && method === 'GET') {
      return {
        success: true,
        message: 'OK',
        data: Object.values(FORMS).map((f) => ({
          id: f.id, judul: f.judul, versi: f.versi, deskripsi: f.deskripsi,
          jenis_hasil: f.jenis_hasil, estimasi_menit: f.estimasi_menit
        }))
      };
    }

    // GET /forms/{id}
    const formMatch = cleanPath.match(/^\/forms\/([^/]+)$/);
    if (formMatch && method === 'GET') {
      const fid = decodeURIComponent(formMatch[1]);
      if (!FORMS[fid]) throw { status: 404, success: false, message: `Formulir '${fid}' tidak ditemukan.`, errors: null };
      return { success: true, message: 'OK', data: FORMS[fid] };
    }

    // POST /forms/{id}/validate
    const valMatch = cleanPath.match(/^\/forms\/([^/]+)\/validate$/);
    if (valMatch && method === 'POST') {
      const fid = decodeURIComponent(valMatch[1]);
      if (!FORMS[fid]) throw { status: 404, success: false, message: `Formulir '${fid}' tidak ditemukan.`, errors: null };
      db.features.validasi = true;
      saveDb(db);
      const ev = evaluateForm(fid, options.body?.answers || {});
      return {
        success: true,
        message: ev.valid ? 'Semua jawaban valid dan siap dikirim.' : 'Masih ada jawaban yang perlu diperbaiki.',
        data: {
          valid: ev.valid,
          errors: ev.errors,
          kelengkapan: ev.kelengkapan,
          pertanyaan_tampil: ev.visibleIds,
          hasil_pratinjau: ev.hasil
        }
      };
    }

    // GET /assessments
    if (cleanPath === '/assessments' && method === 'GET') {
      db.features.riwayat = true;
      saveDb(db);
      let list = db.items.map(formatSummaryItem);
      const sp = params.get('status_pengiriman');
      const sr = params.get('status_peninjauan');
      const fid = params.get('form_id');
      const q = (params.get('q') || '').toLowerCase();
      if (sp) list = list.filter((x) => x.status_pengiriman.kode === sp);
      if (sr) list = list.filter((x) => x.status_peninjauan.kode === sr);
      if (fid) list = list.filter((x) => x.form.id === fid);
      if (q) list = list.filter((x) => x.judul.toLowerCase().includes(q) || x.id.toLowerCase().includes(q));
      list.sort((a, b) => new Date(b.dikirim_pada || b.dibuat_pada) - new Date(a.dikirim_pada || a.dibuat_pada));
      return { success: true, message: 'OK', total: list.length, data: list };
    }

    // POST /assessments
    if (cleanPath === '/assessments' && method === 'POST') {
      const b = options.body || {};
      if (!b.persetujuan) throw { status: 422, success: false, message: 'Persetujuan diperlukan sebelum mengisi formulir.' };
      if (!FORMS[b.form_id]) throw { status: 404, success: false, message: 'Formulir tidak ditemukan.' };
      const id = `DEMO-0${db.nextSeq++}`;
      const nowIso = new Date().toISOString();
      const item = {
        id,
        form_id: b.form_id,
        status_pengiriman: 'draft',
        status_peninjauan: 'belum_dikirim',
        dibuat_pada: nowIso,
        dikirim_pada: null,
        answers: b.answers || {},
        klarifikasi: [],
        tindak_lanjut: null,
        timeline: [{ waktu: nowIso, event: 'dibuat', keterangan: 'Pasien mulai mengisi formulir.', oleh: cfg.mahasiswa.nama || 'Pasien' }]
      };
      db.items.unshift(item);
      db.features.buat = true;
      saveDb(db);
      return {
        success: true,
        message: 'Draf self-assessment dibuat.',
        data: {
          id,
          status_pengiriman: statusObj('draft'),
          status_peninjauan: statusObj('belum_dikirim'),
          hasil: evaluateForm(item.form_id, item.answers).hasil,
          timeline: item.timeline
        }
      };
    }

    // /assessments/{id}
    const idMatch = cleanPath.match(/^\/assessments\/([^/]+)$/);
    if (idMatch) {
      const id = decodeURIComponent(idMatch[1]);
      const idx = db.items.findIndex((x) => x.id === id);
      if (idx < 0) throw { status: 404, success: false, message: `Self-assessment '${id}' tidak ditemukan.` };
      const item = db.items[idx];

      if (method === 'GET') {
        const ev = evaluateForm(item.form_id, item.answers);
        const form = FORMS[item.form_id];
        return {
          success: true, message: 'OK',
          data: {
            id: item.id,
            judul: ev.hasil.judul,
            form: { id: form.id, judul: form.judul, versi: form.versi },
            status_pengiriman: statusObj(item.status_pengiriman),
            status_peninjauan: statusObj(item.status_peninjauan),
            pesan_status: statusMessage(item.status_peninjauan),
            answers: item.answers,
            hasil: ev.hasil,
            perubahan: buildComparison(db, item),
            klarifikasi: item.klarifikasi,
            tindak_lanjut: item.tindak_lanjut,
            timeline: item.timeline,
            dibuat_pada: item.dibuat_pada,
            dikirim_pada: item.dikirim_pada
          }
        };
      }

      if (method === 'PATCH' || method === 'PUT') {
        if (item.status_pengiriman === 'terkirim') {
          throw { status: 409, success: false, message: 'Formulir yang sudah dikirim tidak dapat diubah. Gunakan fitur klarifikasi bila petugas meminta.' };
        }
        const incoming = options.body?.answers || {};
        if (method === 'PUT') {
          item.answers = { ...incoming };
        } else {
          Object.entries(incoming).forEach(([k, v]) => {
            if (v === null) delete item.answers[k];
            else item.answers[k] = v;
          });
        }
        db.features.simpan_draf = true;
        saveDb(db);
        return { success: true, message: 'Draf jawaban disimpan.', data: formatSummaryItem(item) };
      }

      if (method === 'DELETE') {
        if (item.status_pengiriman === 'terkirim') {
          throw { status: 409, success: false, message: 'Hanya draf yang dapat dihapus.' };
        }
        db.items.splice(idx, 1);
        saveDb(db);
        return { success: true, message: `Draf ${id} dihapus.`, data: { id } };
      }
    }

    // POST /assessments/{id}/submit
    const subMatch = cleanPath.match(/^\/assessments\/([^/]+)\/submit$/);
    if (subMatch && method === 'POST') {
      const id = decodeURIComponent(subMatch[1]);
      const item = db.items.find((x) => x.id === id);
      if (!item) throw { status: 404, success: false, message: 'Laporan tidak ditemukan.' };
      if (item.status_pengiriman === 'terkirim') throw { status: 409, success: false, message: 'Formulir ini sudah dikirim sebelumnya.' };
      const ev = evaluateForm(item.form_id, item.answers);
      if (!ev.valid) throw { status: 422, success: false, message: 'Formulir belum dapat dikirim. Masih ada jawaban wajib yang belum diisi.', errors: ev.errors };
      const nowIso = new Date().toISOString();
      item.status_pengiriman = 'terkirim';
      item.status_peninjauan = 'menunggu_peninjauan';
      item.dikirim_pada = nowIso;
      item.timeline.push({ waktu: nowIso, event: 'dikirim', keterangan: 'Formulir dikirim dan diterima sistem.', oleh: cfg.mahasiswa.nama || 'Pasien' });
      if (item.form_id === 'FRM-KELUHAN') db.features.kirim = true;
      if (item.form_id === 'FRM-GAD7') db.features.gad7 = true;
      saveDb(db);
      return {
        success: true,
        message: 'Formulir Anda telah diterima. Status: Menunggu peninjauan.',
        data: {
          id: item.id,
          status_pengiriman: statusObj('terkirim'),
          status_peninjauan: statusObj('menunggu_peninjauan')
        }
      };
    }

    // GET /assessments/{id}/hasil
    const resMatch = cleanPath.match(/^\/assessments\/([^/]+)\/hasil$/);
    if (resMatch && method === 'GET') {
      const id = decodeURIComponent(resMatch[1]);
      const item = db.items.find((x) => x.id === id);
      if (!item) throw { status: 404, success: false, message: 'Laporan tidak ditemukan.' };
      db.features.hasil = true;
      saveDb(db);
      const ev = evaluateForm(item.form_id, item.answers);
      return {
        success: true, message: 'OK',
        data: { ...ev.hasil, perubahan: buildComparison(db, item) }
      };
    }

    // GET /assessments/{id}/status
    const stMatch = cleanPath.match(/^\/assessments\/([^/]+)\/status$/);
    if (stMatch && method === 'GET') {
      const id = decodeURIComponent(stMatch[1]);
      const item = db.items.find((x) => x.id === id);
      if (!item) throw { status: 404, success: false, message: 'Laporan tidak ditemukan.' };
      db.features.status = true;
      if (item.status_peninjauan === 'sudah_ditinjau') db.features.tindak_lanjut = true;
      saveDb(db);
      return {
        success: true, message: 'OK',
        data: {
          status_pengiriman: statusObj(item.status_pengiriman),
          status_peninjauan: statusObj(item.status_peninjauan),
          pesan: statusMessage(item.status_peninjauan),
          dikirim_pada: item.dikirim_pada,
          klarifikasi_menunggu: (item.klarifikasi || []).filter((k) => k.status === 'menunggu_jawaban'),
          klarifikasi: item.klarifikasi || [],
          tindak_lanjut: item.tindak_lanjut,
          timeline: item.timeline || []
        }
      };
    }

    // POST /assessments/{id}/clarifications/{cid}/reply
    const clMatch = cleanPath.match(/^\/assessments\/([^/]+)\/clarifications\/([^/]+)\/reply$/);
    if (clMatch && method === 'POST') {
      const id = decodeURIComponent(clMatch[1]);
      const cid = decodeURIComponent(clMatch[2]);
      const item = db.items.find((x) => x.id === id);
      if (!item) throw { status: 404, success: false, message: 'Laporan tidak ditemukan.' };
      const kl = (item.klarifikasi || []).find((k) => k.id === cid);
      if (!kl) throw { status: 404, success: false, message: 'Klarifikasi tidak ditemukan.' };
      if (kl.status !== 'menunggu_jawaban') throw { status: 409, success: false, message: 'Klarifikasi ini sudah dijawab.' };
      const jwb = (options.body?.jawaban || '').trim();
      if (!jwb) throw { status: 422, success: false, message: 'Jawaban klarifikasi tidak boleh kosong.' };
      kl.jawaban = jwb;
      kl.status = 'dijawab';
      const nowIso = new Date().toISOString();
      const masihAda = item.klarifikasi.some((k) => k.status === 'menunggu_jawaban');
      if (!masihAda) item.status_peninjauan = 'klarifikasi_dijawab';
      item.timeline.push({ waktu: nowIso, event: 'klarifikasi_dijawab', keterangan: `Pasien menjawab klarifikasi ${cid}.`, oleh: cfg.mahasiswa.nama || 'Pasien' });
      db.features.klarifikasi = true;
      saveDb(db);
      return { success: true, message: 'Jawaban klarifikasi terkirim.', data: { status_peninjauan: statusObj(item.status_peninjauan) } };
    }

    // GET /uts/{nim}
    const utsMatch = cleanPath.match(/^\/uts\/([^/]+)$/);
    if (utsMatch && method === 'GET') {
      const daftar = global.TelehealthConfig.UTS_FEATURE_FALLBACK.map((f) => ({
        kode: f.kode, label: f.label, tercapai: Boolean(db.features[f.kode])
      }));
      const tercapai = daftar.filter((d) => d.tercapai).length;
      return {
        success: true, message: 'OK',
        data: {
          nim: cfg.mahasiswa.nim,
          nama: cfg.mahasiswa.nama,
          kelas: cfg.mahasiswa.kelas,
          jumlah: {
            total: db.items.length,
            terkirim: db.items.filter((i) => i.status_pengiriman === 'terkirim').length,
            draf: db.items.filter((i) => i.status_pengiriman === 'draft').length,
            sudah_ditinjau: db.items.filter((i) => i.status_peninjauan === 'sudah_ditinjau').length
          },
          bukti_fitur: { tercapai, total: daftar.length, daftar },
          penilaian: {
            status: { kode: 'disetujui', label: 'Disetujui (Mode Demo)' },
            catatan: 'Simulasi penilaian otomatis aktif di Mode Demo Sandbox.',
            diperiksa_pada: new Date().toISOString()
          }
        }
      };
    }

    throw { status: 404, success: false, message: `Endpoint ${method} ${cleanPath} tidak ditemukan.` };
  }

  // Helper khusus Mode Demo agar pengunjung bisa mensimulasikan aksi petugas (Klarifikasi / Tindak Lanjut)
  function simulateStaffAction(assessmentId, actionType) {
    const db = loadDb();
    const item = db.items.find((x) => x.id === assessmentId);
    if (!item || item.status_pengiriman !== 'terkirim') return false;
    const nowIso = new Date().toISOString();

    if (actionType === 'clarify') {
      const cid = `KL-D${Math.floor(10 + Math.random() * 89)}`;
      item.status_peninjauan = 'perlu_klarifikasi';
      item.klarifikasi.push({
        id: cid,
        pertanyaan: 'Apakah keluhan membaik setelah istirahat atau masih terasa berat hingga hari ini?',
        status: 'menunggu_jawaban',
        jawaban: null,
        dibuat_pada: nowIso
      });
      item.timeline.push({ waktu: nowIso, event: 'klarifikasi_diminta', keterangan: `Petugas meminta klarifikasi (${cid}).`, oleh: 'Ns. Rina Kartika, S.Kep.' });
    } else if (actionType === 'followup') {
      item.status_peninjauan = 'sudah_ditinjau';
      item.tindak_lanjut = {
        jenis: { kode: 'jadwalkan_konsultasi', label: 'Jadwalkan konsultasi' },
        arahan: 'Berdasarkan hasil peninjauan, silakan mengikuti sesi konsultasi lanjutan dengan tenaga kesehatan sesuai jadwal berikut.',
        jadwal_konsultasi: new Date(Date.now() + 2 * 86400000).toISOString(),
        dicatat_oleh: { nama: 'Ns. Rina Kartika, S.Kep.' },
        dicatat_pada: nowIso
      };
      item.timeline.push({ waktu: nowIso, event: 'tindak_lanjut', keterangan: 'Petugas mencatat tindak lanjut: Jadwalkan konsultasi.', oleh: 'Ns. Rina Kartika, S.Kep.' });
    }
    saveDb(db);
    return true;
  }

  global.TelehealthDemoMock = { handle, resetDb, simulateStaffAction };
})(window);

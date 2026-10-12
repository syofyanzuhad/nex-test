# AGENTS.md — instruksi untuk AI coding agent (taruh di root repo; salin sebagai CLAUDE.md bila perlu)

## Konteks
Technical test Nex Entertainment (fullstack). Baca PROJECT.md, REQUIREMENTS.md, DECISIONS.md, ARCHITECTURE.md, ROADMAP.md, TEST-PLAN.md sebelum menulis kode. Kerjakan SATU fase pada satu waktu sesuai ROADMAP.md.

## Aturan keras
1. Hanya Firebase emulators. Jangan buat/hubungkan project Firebase asli. Jangan commit secret, `.env` berisi kredensial, atau service account.
2. Keputusan di DECISIONS.md terkunci. Bila menurutmu ada yang salah, berhenti dan jelaskan alasannya; jangan diam-diam mengubahnya.
3. Otorisasi hanya dari custom claim token (`ops`), tidak dari field `role` di data.
4. Semua perubahan status submission lewat callable + `runTransaction`. Tidak ada write status dari klien.
5. Jangan menambah fitur di luar REQUIREMENTS.md. Tidak ada abstraksi "untuk nanti".
6. Jangan klaim selesai tanpa bukti: jalankan test/perintah dan tempel output ringkas ke TEST-PLAN.md.
7. Bila ragu pada perilaku Firebase/emulator, verifikasi dengan dokumentasi resmi atau eksperimen; jangan menebak.

## Protokol pemahaman (karena saya harus menjelaskan tiap baris & mengubahnya live)
- Sebelum commit, ringkas per file: apa tujuannya dan mengapa pendekatan itu dipilih, dalam bahasa sederhana.
- Tandai bagian yang rumit (rules `get()`, transaksi, regex, parsing CSV, timezone) dengan komentar singkat "mengapa".
- Setelah tiap fase, ajukan 3 pertanyaan "bagaimana jika ini diubah?" yang mungkin ditanyakan reviewer, dan jawab. Saya akan menjawab dulu sebelum melihat jawabanmu.
- Commit kecil dengan pesan jelas (conventional commits). Riwayat dibaca reviewer.

## Gaya kode
TypeScript strict. Tanpa `any` kecuali dijustifikasi. Fungsi murni dipisah dari I/O agar mudah diuji. Pesan error ke pengguna melewati i18n.

## Perintah yang diharapkan ada
`npm run emulators`, `npm run seed`, `npm run dev`, `npm run test:rules`, `npm run test:functions`, `npm run check:i18n`, `npm test` (semua).

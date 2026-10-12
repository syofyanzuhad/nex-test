# Nex Submission Review Slice (Technical Test)

A fullstack application implementing a submission review slice: Creators submit TikTok video URLs, Ops review and transition states idempotently via transactional Cloud Functions, export monthly Excel-safe payout CSVs in Asia/Bangkok timezone, import messy creator CSVs with RFC4180 parsing, and switch language between English and Thai (EN/TH).

---

## Prasyarat Lingkungan
- **Node.js**: v22.x (diuji pada v22.23.0)
- **Java Runtime**: OpenJDK 17+ (wajib untuk Firestore Emulator)
- **Firebase CLI**: Terpasang lokal di project (`npx firebase`)

---

## 1. Setup & Instalasi Dependensi
Jalankan instalasi dependensi pada root, Cloud Functions, dan frontend web:
```bash
npm install
npm --prefix functions install
npm --prefix web install
```

---

## 2. Menjalankan Firebase Emulators (Terminal 1)
Jalankan emulator Auth (port 9099), Firestore (port 8080), Functions (port 5001), dan UI (port 4000):
```bash
npm run emulators
```
*Emulator UI dapat diakses di http://localhost:4000.*

---

## 3. Seeding Data Emulator (Terminal 2)
Isi emulator dengan data awal (`data/seed.json`):
```bash
npm run seed
```
- Membuat akun Auth:
  - `ops@example.com` (Ops, membawa custom claim `{ ops: true }`)
  - `a@example.com` (Creator A, `{ ops: false }`)
  - `b@example.com` (Creator B, `{ ops: false }`)
- Password default semua user seed: `password123`
- Mengonversi string tanggal ISO ke Firestore `Timestamp`
- Menyiapkan 2 campaign (`camp-bkk`, `camp-pkt`) dan 6 submission awal (`s1`..`s6`)

---

## 4. Menjalankan Aplikasi Web (Terminal 2)
Jalankan frontend Vite + React 19:
```bash
npm run dev
```
Buka browser di **http://localhost:5173**.
- Gunakan tombol quick login untuk masuk sebagai **Ops** atau **Creator**.
- Tombol toggle bahasa **EN / TH** tersedia di pojok kanan atas header.

---

## 5. Menjalankan Seluruh Pengujian Terotomatisasi
Jalankan seluruh suite pengujian (Rules, Callables, Concurrency, Web Library, CSV/Scripts, dan Integritas i18n):
```bash
npm test
```

Atau jalankan pengujian secara terpisah:
- **Firestore Security Rules (A1–A14):**
  ```bash
  npm run test:rules
  ```
- **Cloud Functions Callables & Concurrency (B1–B12):**
  ```bash
  npm run test:functions
  ```
- **Pengujian Pustaka Frontend & Ekspor Payout:**
  ```bash
  npm run test:web
  ```
- **Pengujian Parser CSV & Validasi Creators:**
  ```bash
  npm run test:scripts
  ```
- **Pengecekan Integritas Kamus Dua Arah (i18n):**
  ```bash
  npm run check:i18n
  ```

---

## 6. Import Data Creators Kotor (CLI)
Jalankan script parser dan validasi terhadap `data/creators-messy.csv`:
```bash
npm run import:creators
```
- Menolak baris berbahaya (formula injection, format email salah, handle tanpa `@`, duplikat email).
- Menyimpan baris valid ke koleksi `creators/{emailLower}` di Firestore emulator.

---

## Dokumentasi Pendukung
- **[NOTES.md](file:///Users/macbookpro/nex-test/NOTES.md)**: Jawaban pertanyaan teknis interview, detail konkurensi Firestore, dan catatan stubs.
- **[TEST-PLAN.md](file:///Users/macbookpro/nex-test/TEST-PLAN.md)**: Matriks lengkap hasil verifikasi pengujian A–F.

# NOTES.md — Nex Submission Review Slice

Dokumentasi keputusan arsitektur, jawaban pertanyaan teknis interview, stubs, dan asumsi proyek.

---

## (a) Deploy hanya satu function baru tanpa menyentuh yang lain

Perintah spesifik:
```bash
firebase deploy --only functions:reviewSubmission
```
Atau jika men-deploy beberapa fungsi secara eksplisit:
```bash
firebase deploy --only functions:reviewSubmission,functions:markPaid
```

**Alasan dan Bahaya:**
- Jangan pernah menjalankan `firebase deploy --only functions` tanpa menentukan nama target function.
- Jika kode lokal belum selesai atau ada file function yang sedang diubah/dihapus, perintah umum tersebut dapat memicu Firebase CLI menghapus (*delete*) Cloud Functions di environment production yang tidak terdaftar di kode saat itu.
- **Best Practice Tambahan:**
  1. Selalu lakukan deploy ke target project staging/preview terlebih dahulu (`firebase use staging`).
  2. Gunakan flag `--dry-run` jika tersedia atau gunakan `firebase functions:list` untuk memverifikasi daftar fungsi aktif sebelum dan sesudah deployment.

---

## (b) Di mana TikTok Client Secret disimpan dan dikelola

**Penyimpanan Production:**
- Disimpan di **Google Cloud Secret Manager** melalui fitur bawaan Firebase Functions v2 Secrets:
  ```bash
  firebase functions:secrets:set TIKTOK_CLIENT_SECRET
  ```
- Di dalam kode Cloud Functions, rahasia ini dideklarasikan menggunakan `defineSecret`:
  ```typescript
  import { defineSecret } from "firebase-functions/params";
  const tiktokClientSecret = defineSecret("TIKTOK_CLIENT_SECRET");

  export const oauthCallback = onCall({ secrets: [tiktokClientSecret] }, async (req) => {
    const secretValue = tiktokClientSecret.value();
    // Proses exchange token TikTok di server...
  });
  ```

**Penyimpanan Lokal & Emulator:**
- Dikelola melalui file lokal `.secret.local` di folder `functions/`:
  ```text
  TIKTOK_CLIENT_SECRET=mock_secret_for_local_emulator
  ```
- File `.secret.local` secara ketat dimasukkan ke dalam `.gitignore`.

**Anti-Pattern yang Dihindari:**
- ❌ **Tidak pernah di sisi klien / Frontend**: Semua environment variable `VITE_*` di-bundle dan terekspos ke publik di browser pengguna.
- ❌ **Tidak pernah di dokumen Firestore**: Client secret bukan data aplikasi publik dan tidak boleh dibaca oleh client SDK.
- ❌ **Tidak pernah di-commit ke Git repo**: Menjaga integritas secret management.

---

## (c) Analisis Konkurensi: Dua Ops me-review submission yang sama secara bersamaan

Skenario: Admin Ops A dan Admin Ops B membuka antrean review pada saat yang sama untuk submission berstatus `pending`. Keduanya menekan tombol approve/reject pada waktu yang hampir bersamaan.

**Mekanisme Transaksi & OCC (Optimistic Concurrency Control):**
1. Kedua pemanggil mengeksekusi `reviewSubmission` di Cloud Functions yang menjalankan blok `db.runTransaction(async (transaction) => { ... })`.
2. **Read Phase:** Kedua transaksi membaca snapshot dokumen submission yang sama (`status: 'pending'`).
3. **Commit Phase Pertama:** Transaksi pertama (misal Ops A) tiba di server Firestore lebih dulu. Firestore memverifikasi bahwa versi dokumen belum berubah sejak dibaca, lalu menulis:
   - `status: 'approved'`
   - Menambahkan 1 entri baru di koleksi `auditLogs`.
   - Transaksi Ops A sukses (`{ ok: true, changed: true, status: 'approved' }`).
4. **Retry Phase Kedua:** Ketika transaksi Ops B mencoba commit, Firestore mendeteksi bahwa dokumen submission telah dimodifikasi oleh transaksi Ops A (terjadi konflik versi dokumen).
5. Firestore secara otomatis mengulang (*retry*) seluruh callback transaksi Ops B dari awal.
6. **Evaluasi Ulang State Machine:** Pada eksekusi kedua, Ops B membaca dokumen yang kini telah berstatus `approved`.
   - **Kasus Ops B juga memilih Approve:**
     - State machine mengevaluasi transisi `approved -> approved`.
     - Fungsi mendeteksi kondisi **no-op** (`kind: 'noop'`).
     - Fungsi mengembalikan `{ ok: true, changed: false, status: 'approved' }` tanpa menulis log audit ganda (Idempoten, R2.5).
   - **Kasus Ops B memilih Reject:**
     - State machine mengevaluasi transisi `approved -> rejected`.
     - Fungsi mendeteksi transisi ilegal (`kind: 'illegal'`) dan melempar `HttpsError("failed-precondition")`.
     - Antarmuka Ops B menerima pesan ramah pengguna: *"Cannot reject: this submission is not in pending status."*
7. **Bukti Pengujian Nyata:**
   - Skenario ini dibuktikan secara otomatis dan deterministik dalam test suite `test/functions.test.ts` (test `B10` untuk 10 approve paralel dan `B11` untuk race condition approve vs reject).

---

## (d) Dua hal yang akan diperbaiki jika memiliki waktu ekstra

1. **Snapshot Rate & Timestamp `approvedAt` pada Dokumen Submission:**
   - *Kondisi saat ini:* Status `approved` dicatat, namun rate THB dibaca secara langsung dari koleksi `campaigns` saat ekspor CSV dijalankan (D6), dan bulan payout dihitung dari `createdAt` (D5).
   - *Perbaikan:* Menyimpan field `approvedAt` (Firestore Timestamp) dan melakukan *rate snapshotting* (`rateSnapshotTHB: campaign.ratePerVideoTHB`) saat transaksi approval dilakukan di Cloud Functions. Hal ini menjamin bahwa jika rate campaign diubah di masa depan, laporan audit dan export payout masa lampau tidak akan berubah secara retroaktif.
2. **Server-Side Streaming Export & Paginasi dengan Cloud Tasks/Storage:**
   - *Kondisi saat ini:* Filter ekspor payout bulanan dilakukan di memori browser Ops (`web/src/lib/payoutCsv.ts`).
   - *Perbaikan:* Untuk skala produksi dengan puluhan ribu submission, operasi ini sebaiknya dipindahkan ke backend callable atau background worker yang melakukan *chunked stream reading*, menulis file CSV langsung ke Cloud Storage bucket (dengan signed URL unduhan sementara), serta menerapkan paginasi kursor (*startAfter*) pada antrean Ops untuk mengurangi beban konsumsi memori browser.

---

## Stubs dan Trade-offs (Sengaja Dipotong Sesuai Batasan Waktu)

1. **UI Upload CSV Creators:**
   - Brief teknis tidak merinci tampilan UI untuk import creator. Sesuai keputusan D8, proses impor diimplementasikan sebagai parser murni berstandar RFC4180 yang dijalankan via CLI Admin SDK (`npm run import:creators`). UI upload creator sengaja tidak dibuat (stubbed).
2. **Manajemen Campaign (CRUD):**
   - Tidak ada antarmuka untuk menambah atau menutup campaign. Dokumen campaign diatur melalui skrip seeding.
3. **Penyimpanan Dokumen Creator:**
   - Hasil import creators disimpan ke koleksi Firestore `creators/{emailLower}` dengan aturan hak akses `read: if isOps()`, `write: if false` (hanya ditulis via Admin SDK).
4. **Pilihan Status Literal Saat Creation (D3-A):**
   - Security rules mewajibkan `status == 'pending'` secara konstan saat creator membuat submission, menghindari kebutuhan trigger latar belakang `onDocumentCreated` yang berlebihan untuk irisan tipis ini.

---

## Asumsi Utama yang Diambil

- **D5 (Bulan Payout Asia/Bangkok):** Bulan pembayaran dihitung dalam zona waktu `Asia/Bangkok`. Dokumen `s4` (`2026-09-30T18:30:00Z` UTC) berada pada tanggal 1 Oktober pukul 01:30 di Bangkok, sehingga dikelompokkan ke bulan Oktober.
- **D7 (Anti-Formula Injection CSV):** Semua sel teks yang diawali dengan `= + - @ \t \r` diberi prefiks `'` saat diekspor untuk mencegah eksploitasi eksekusi macro pada Microsoft Excel / LibreOffice.

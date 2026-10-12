# GLOSSARY.md — Glosarium Istilah & Konvensi Domain Project

Dokumen ini mendokumentasikan istilah finansial, domain bisnis kreator, teknis Firebase, serta keamanan yang digunakan di seluruh aplikasi Nex Entertainment Technical Test.

---

## 1. Domain Finansial & Bisnis

| Istilah | Kepanjangan / Arti | Deskripsi & Konteks di Proyek |
| :--- | :--- | :--- |
| **THB** | **Thai Baht (฿)** | Mata uang resmi Kerajaan Thailand (kode ISO 4217). Seluruh tarif kampanye kreator (`ratePerVideoTHB`) dan perhitungan pembayaran bulanan dihitung dalam mata uang ini. |
| **Creator** | Content Creator / Influencer | Pengguna yang membuat konten video di platform pihak ketiga (TikTok) dan mengirimkan tautan video ke sistem untuk diverifikasi. |
| **Ops / Operations** | Internal Operations Team | Tim internal yang bertugas meninjau (*review*), menyetujui (*approve*), atau menolak (*reject*) video kreator, serta mengunduh rekap pembayaran (*payout*). |
| **Submission** | Kiriman Konten Video | Entri yang diajukan oleh kreator berisi URL video TikTok, referensi ID kampanye, dan status persetujuan. |
| **Payout** | Pembayaran / Pencairan Dana | Rekap kompensasi finansial dalam THB yang wajib dibayarkan kepada kreator atas video yang telah berstatus `approved` dalam satu periode bulan tertentu. |
| **Campaign** | Program / Proyek Promosi | Kampanye pemasaran yang memiliki tarif tetap per video (`ratePerVideoTHB`) dan status (`open` / `closed`). |

---

## 2. Siklus Hidup Status Submission (State Machine)

```
[ pending ] ──(Ops Approve)──> [ approved ] ──(Ops Mark Paid)──> [ paid ]
     │
     └──(Ops Reject)─────────> [ rejected ]
```

* **`pending`**: Status bawaan saat video baru pertama kali dikirim oleh kreator.
* **`approved`**: Video telah diperiksa ops dan dinyatakan memenuhi kriteria kampanye; video ini masuk ke dalam kalkulasi *payout*.
* **`rejected`**: Video ditolak oleh ops (wajib menyertakan alasan penolakan `reason`). Status ini bersifat terminal/final.
* **`paid`**: Kompensasi THB telah ditransfer/diselesaikan ke kreator. Transisi ini bersifat idempoten.

---

## 3. Konsep Teknis & Arsitektur

| Istilah | Definisi & Relevansi Proyek |
| :--- | :--- |
| **Custom Claims** | Atribut otorisasi khusus yang disematkan langsung di dalam Firebase Auth ID Token (misal: `{ ops: true }`). Proyek ini **tidak** mengecek role dari dokumen database, melainkan murni dari custom claims token demi keamanan anti-tamper. |
| **OCC (Optimistic Concurrency Control)** | Mekanisme kontrol konkurensi pada transaksi database (`runTransaction`). Jika dua request me-review submission yang sama secara bersamaan, Firestore mendeteksi konflik versi data dan melakukan *automatic retry*, memastikan hanya 1 operasi yang berhasil mengubah status dan menulis audit log. |
| **Idempotency** | Sifat operasi yang memberikan hasil akhir yang sama meskipun dipanggil berulang kali. Contoh: Menyetujui submission yang sudah `approved` akan menghasilkan respons aman `{ ok: true, changed: false }` tanpa menduplikasi data audit log. |
| **Audit Log** | Rekaman riwayat aktivitas yang tidak dapat diubah (*append-only*), mencatat siapa (`actorId`), kapan (`timestamp`), dan tindakan apa (`action`, `reason`) yang dilakukan pada setiap submission. |
| **Timezone Boundary (`Asia/Bangkok`)** | Thailand berada di zona waktu UTC+7. Penentuan bulan payout (misal: `2026-09`) wajib dikonversi ke waktu lokal Bangkok. Video yang dibuat pada `2026-09-30T18:30:00Z` secara teknis adalah `2026-10-01 01:30:00` di Bangkok, sehingga masuk ke payout Oktober, bukan September. |
| **CSV Formula Injection (CSV Injection / DDE)** | Celah keamanan spreadsheet di mana sel yang diawali karakter formula (`=`, `+`, `-`, `@`) dieksekusi otomatis oleh Excel/Google Sheets. Dimutasi pada proyek ini dengan menambahkan prefix karakter tab (`\t`) pada field teks bebas seperti nama kreator atau URL. |
| **RFC 4180** | Standar format file CSV (Comma-Separated Values). Parser custom di proyek ini mematuhi standar ini termasuk penanganan tanda kutip ganda (`""`), karakter koma di dalam string, dan pembersihan UTF-8 BOM (`\ufeff`). |
| **i18n (Internationalization)** | Sistem lokalisasi multi-bahasa. Proyek ini mendukung Bahasa Inggris (`EN`) dan Bahasa Thai (`TH`) dengan verifikasi integritas kamus dua arah otomatis (`npm run check:i18n`). |

---

## 4. Akun & Kredensial Emulator Bawaan

| Akun | Password | Peran (*Role*) | Custom Claim Token |
| :--- | :--- | :--- | :--- |
| `ops@example.com` | `password123` | Operations Staff | `{ ops: true }` |
| `a@example.com` | `password123` | Content Creator A | `{ ops: false }` |
| `b@example.com` | `password123` | Content Creator B | `{ ops: false }` |

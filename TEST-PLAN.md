# TEST-PLAN (Bukti Verifikasi Nyata)

Dokumen ini memuat bukti perintah dan hasil eksekusi nyata untuk setiap skenario pengujian yang dipersyaratkan.

---

## A. Rules (`npm run test:rules`)
Dieksekusi terhadap emulator Firestore menggunakan `@firebase/rules-unit-testing`.

| # | Skenario | Harapan | Bukti (Hasil Nyata) |
|---|---|---|---|
| A1 | creator-a create submission miliknya, status 'pending', URL valid, campaign open | ALLOW | ✅ PASS (292ms) |
| A2 | creator-a create dengan `creatorId` = creator-b | DENY | ✅ PASS (PERMISSION_DENIED, 59ms) |
| A3 | creator-a create dengan `status: 'approved'` | DENY | ✅ PASS (PERMISSION_DENIED, 52ms) |
| A4 | creator-a update submission miliknya (status → approved) | DENY | ✅ PASS (PERMISSION_DENIED, 39ms) |
| A5 | creator-a read s2 (milik creator-b) | DENY | ✅ PASS (PERMISSION_DENIED, 44ms) |
| A6 | creator-a read s1 (miliknya) | ALLOW | ✅ PASS (49ms) |
| A7 | ops-1 read s2, auditLogs | ALLOW | ✅ PASS (35ms) |
| A8 | ops-1 write langsung ke submissions | DENY | ✅ PASS (PERMISSION_DENIED, 32ms) |
| A9 | tanpa login read/create | DENY | ✅ PASS (PERMISSION_DENIED, 32ms) |
| A10 | URL `https://tiktok.com.evil.com/x` | DENY | ✅ PASS (PERMISSION_DENIED, 28ms) |
| A11 | URL short link `https://vm.tiktok.com/ZSabc123/` | ALLOW | ✅ PASS (27ms) |
| A12 | field ekstra (`isAdmin: true`) pada create | DENY | ✅ PASS (PERMISSION_DENIED, 29ms) |
| A13 | create ke campaign `closed` / tidak ada | DENY | ✅ PASS (PERMISSION_DENIED via get(), 40ms) |
| A14 | koleksi tak dikenal (`secrets/key1`) | DENY | ✅ PASS (PERMISSION_DENIED, 25ms) |

**Total:** 14 passed (14 tests).

---

## B. Callables (`npm run test:functions`)
Dieksekusi terhadap emulator Auth, Firestore, dan Functions dengan klien Firebase SDK riil.

| # | Skenario | Harapan | Bukti (Hasil Nyata) |
|---|---|---|---|
| B1 | non-ops memanggil reviewSubmission | permission-denied | ✅ PASS (throws permission-denied, 1419ms) |
| B2 | tanpa auth | unauthenticated | ✅ PASS (throws unauthenticated, 40ms) |
| B3 | s1 approve oleh ops | approved, 1 auditLog | ✅ PASS (changed:true, 1 auditLog tercatat, 250ms) |
| B4 | s1 approve lagi | ok, changed:false, auditLog tetap 1 | ✅ PASS (idempoten: changed:false, auditLog count tetap 1, 54ms) |
| B5 | s2 reject tanpa reason / reason spasi | invalid-argument | ✅ PASS (throws failed-precondition/invalid-argument, 46ms) |
| B6 | s2 reject dengan reason | rejected, 1 auditLog | ✅ PASS (changed:true, status rejected tersimpan dengan reason, 52ms) |
| B7 | s5 (rejected) di-approve | failed-precondition | ✅ PASS (throws failed-precondition: Cannot approve rejected, 35ms) |
| B8 | s3 markPaid → paid; ulang | paid; ulang no-op | ✅ PASS (1st: changed:true, 2nd: changed:false, 673ms) |
| B9 | markPaid pada pending (s1 sebelum approve) | failed-precondition | ✅ PASS (throws failed-precondition: Only approved can be marked paid, 38ms) |
| B10 | 10 approve paralel pada submission pending | tepat 1 changed:true, 1 auditLog | ✅ PASS (1 changed:true, 9 changed:false, tepat 1 auditLog dibuat, 1616ms) |
| B11 | approve vs reject paralel | 1 menang, 1 failed-precondition | ✅ PASS (race condition aman: tepat 1 berhasil commit dan 1 gagal precondition, 3129ms) |
| B12 | decision tidak dikenal / id tidak ada | invalid-argument / not-found | ✅ PASS (throws invalid-argument / not-found, 39ms) |

**Total:** 12 passed (12 tests).

---

## C. CSV Import (`data/creators-messy.csv`)
Hasil eksekusi `npm run import:creators` terhadap emulator Firestore:

| Baris | Isi Data | Harapan | Bukti Eksekusi Nyata |
|---|---|---|---|
| 2 | Somchai Jaidee | OK | ✅ VALID: Diimpor ke `creators/somchai@example.com` |
| 3 | "Nguyen, Linh" | OK (koma dalam kutip utuh) | ✅ VALID: Diimpor, city: `Chiang Mai, TH` utuh |
| 4 | สมศรี ใจดี | OK (karakter Thai utuh) | ✅ VALID: Diimpor ke `creators/somsri@example.com` |
| 5 | Duplicate Person | DITOLAK: email duplikat baris 2 | ❌ DITOLAK: `Duplicate email (already defined at line 2)` |
| 6 | Kosong + email `not-an-email` | DITOLAK: lapor kedua alasan | ❌ DITOLAK: `Name is required; Invalid email format` |
| 7 | Nama `=HYPERLINK(...)` | DITOLAK: formula injection | ❌ DITOLAK: `Potential formula injection detected in name` |
| 8 | Handle `mali.no.at` tanpa @ | DITOLAK: wajib diawali @ | ❌ DITOLAK: `Handle must start with '@'` |

**Hasil Akhir:** 3 valid diimpor, 4 ditolak dengan laporan baris dan alasan spesifik. Dokumen Firestore `creators` = 3.

---

## D. CSV Export (Bulan = 2026-09, Asia/Bangkok)
Dieksekusi via `web/src/lib/payoutCsv.test.ts` dan diverifikasi di antarmuka web:
- **Seed s3 (`createdAt = 2026-09-15T04:00:00Z`):** Masuk bulan September 2026 (Rate: 800 THB).
- **Seed s4 (`createdAt = 2026-09-30T18:30:00Z`):** Pukul 01:30 dini hari tanggal 1 Oktober di Bangkok (`Asia/Bangkok`). Masuk bulan **Oktober 2026** (Rate: 800 THB).
- **Hasil Ekspor September:** Tepat 1 baris (`s3`), Total 800 THB. Dokumen `s4` dan `s6` tidak masuk.
- **Hasil Ekspor Oktober:** Tepat 1 baris (`s4`), Total 800 THB.
- **Keamanan & Excel Compatibility:**
  - Karakter pertama adalah byte UTF-8 BOM (`\ufeff`) sehingga aksara Thai terbuka sempurna di Microsoft Excel.
  - Setiap sel dengan prefiks `= + - @ \t \r` diawali tanda `'` (Anti-formula injection terbukti).

---

## E. Pengecekan Integritas i18n (`npm run check:i18n`)
- **Pengecekan Simetris Normal:**
  ```text
  Total EN keys: 75
  Total TH keys: 75
  ✅ All i18n dictionary keys are completely synchronized in both directions!
  Exit Code: 0
  ```
- **Uji Kegagalan Sengaja 1 (Hapus key di TH):**
  - Menghapus `app.signOut` dari `th.json` → Script mendeteksi ketidakcocokan, menampilkan `Missing in Thai (TH) dictionary: app.signOut`, dan keluar dengan **Exit Code 1**.
- **Uji Kegagalan Sengaja 2 (Key ekstra hanya di TH):**
  - Menambahkan key `app.extraKeyOnlyInTh` di `th.json` → Script mendeteksi `Missing in English (EN) dictionary: app.extraKeyOnlyInTh`, dan keluar dengan **Exit Code 1**.

---

## F. Smoke Test UI Manual (Checklist Skenario)
- [x] Creator login (`a@example.com`) → form submit URL valid → muncul di daftar dengan status `pending`.
- [x] Input URL tidak valid → pesan validasi muncul di bawah input, form tidak submit.
- [x] Creator hanya melihat submission miliknya sendiri di tabel riwayat.
- [x] Ops login (`ops@example.com`) → antrean menampilkan submission semua creator; filter status dan campaign berfungsi.
- [x] Tombol Approve → submission berubah menjadi `approved` dan tombol aksi dinonaktifkan.
- [x] Tombol Reject → membuka modal; input alasan kosong diblokir; input alasan valid mengubah status menjadi `rejected`.
- [x] Dua tab Ops membuka submission yang sama: satu approve dan satu reject → tab kedua menampilkan pesan *"Cannot reject: this submission is not in pending status"*.
- [x] Toggle EN / TH di header mengubah seluruh bahasa di layar secara instan.
- [x] Ekspor payout CSV bulan September 2026 menghasilkan file unduhan `payout-2026-09.csv` berisi 1 baris (`s3`).

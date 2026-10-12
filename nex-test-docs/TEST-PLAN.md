# TEST-PLAN (bukti verifikasi)

Isi kolom "Bukti" dengan perintah + ringkasan output nyata saat dikerjakan. Kosong = belum selesai.

## A. Rules (`npm run test:rules`)
| # | Skenario | Harapan | Bukti |
|---|---|---|---|
| A1 | creator-a create submission miliknya, status 'pending', URL valid, campaign open | ALLOW | |
| A2 | creator-a create dengan `creatorId` = creator-b | DENY | |
| A3 | creator-a create dengan `status: 'approved'` | DENY | |
| A4 | creator-a update submission miliknya (status → approved) | DENY | |
| A5 | creator-a read s2 (milik creator-b) | DENY | |
| A6 | creator-a read s1 (miliknya) | ALLOW | |
| A7 | ops-1 read s2, auditLogs | ALLOW | |
| A8 | ops-1 write langsung ke submissions | DENY | |
| A9 | tanpa login read/create | DENY | |
| A10 | URL `https://tiktok.com.evil.com/x` | DENY | |
| A11 | URL short link `https://vm.tiktok.com/ZSabc123/` | ALLOW | |
| A12 | field ekstra (`isAdmin: true`) pada create | DENY | |
| A13 | create ke campaign `closed` / tidak ada | DENY | |
| A14 | koleksi tak dikenal | DENY | |

## B. Callables (`npm run test:functions`)
| # | Skenario | Harapan | Bukti |
|---|---|---|---|
| B1 | non-ops memanggil reviewSubmission | permission-denied | |
| B2 | tanpa auth | unauthenticated | |
| B3 | s1 approve oleh ops | approved, 1 auditLog | |
| B4 | s1 approve lagi | ok, changed:false, auditLog tetap 1 | |
| B5 | s2 reject tanpa reason / reason spasi | invalid-argument | |
| B6 | s2 reject dengan reason | rejected, 1 auditLog | |
| B7 | s5 (rejected) di-approve | failed-precondition | |
| B8 | s3 markPaid → paid; ulang | paid; ulang no-op | |
| B9 | markPaid pada pending (s1 sebelum approve) | failed-precondition | |
| B10 | 10 approve paralel pada submission pending | tepat 1 changed:true, 1 auditLog | |
| B11 | approve vs reject paralel | 1 menang, 1 failed-precondition (atau no-op bila sama) | |
| B12 | decision tidak dikenal / id tidak ada | invalid-argument / not-found | |

## C. CSV import (creators-messy.csv)
Header = baris 1. Perhatikan: file diawali BOM (kolom pertama terbaca `\ufeffname`); parser WAJIB menghapus BOM.
Harapan (berdasarkan isi file; verifikasi dengan menjalankan):
| Baris | Isi | Harapan |
|---|---|---|
| 2 | Somchai Jaidee | OK |
| 3 | "Nguyen, Linh" (koma dalam kutip) | OK, nama utuh `Nguyen, Linh`; city `Chiang Mai, TH` |
| 4 | สมศรีใจดี (Thai) | OK, karakter Thai utuh |
| 5 | Duplicate Person, email sama dg baris 2 | DITOLAK: email duplikat (baris 2) |
| 6 | nama kosong + email `not-an-email` | DITOLAK: nama kosong, email tidak valid (laporkan kedua alasan) |
| 7 | nama `=HYPERLINK(...)` | DITOLAK: berpotensi formula injection |
| 8 | handle `mali.no.at` tanpa @ | DITOLAK: handle harus diawali @ |
Hasil akhir: 3 diimpor (baris 2, 3, 4), 4 ditolak (baris 5, 6, 7, 8). Total 7 baris data.
Uji tambahan: nomor baris tetap benar bila ada field multi-baris; re-import idempoten.

## D. CSV export (bulan = 2026-09, zona Asia/Bangkok)
Dari seed (status approved): s3 (Phuket, 800, createdAt 15 Sep) dan s4 (Phuket, 800, createdAt 30 Sep 18:30Z = 1 Okt 01:30 Bangkok).
- Menurut D5: September → hanya s3 (800). Oktober → hanya s4.
- Jika pakai UTC: September → s3 + s4 (1600). Perbedaan ini adalah jebakan; jelaskan di video.
- s6 (paid, Aug) dan s1/s2/s5 tidak boleh muncul.
- Cek: file diawali BOM (EF BB BF), terbuka di Excel dengan Thai benar, sel `=...` tidak dieksekusi, URL berisi koma/kutip ter-escape.

## E. i18n
- `npm run check:i18n` hijau pada kondisi normal.
- Hapus satu key dari th.json → exit code ≠ 0 dan pesan menyebut key. Kembalikan.
- Cek dua arah (key hanya di th, tidak di en).

## F. Smoke UI manual
- [ ] Creator-a login → form submit URL valid → muncul di daftar (status pending)
- [ ] URL tidak valid → pesan validasi, tidak ada request
- [ ] URL lolos klien tapi ditolak rules (mis. campaign closed) → pesan error terbaca
- [ ] Ops login → antrean menampilkan pending; filter status + campaign bekerja
- [ ] Approve; reject tanpa reason diblokir; reject dengan reason
- [ ] Dua tab ops approve item yang sama → tab kedua tidak error mengerikan
- [ ] Empty state (filter tanpa hasil), loading state, error state (matikan emulator)
- [ ] Toggle EN/TH mengganti semua teks
- [ ] Export CSV bulan 2026-09 sesuai D

## G. Dari clone bersih
- [ ] Ikuti README apa adanya: emulator → seed → app → semua test hijau

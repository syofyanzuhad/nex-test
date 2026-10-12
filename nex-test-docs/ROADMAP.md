# ROADMAP (3–4 jam, vertikal, commit per fase)

Prinsip GSD: tiap fase selesai hanya jika bukti verifikasinya ada. Urutan dipilih agar bagian yang paling dinilai (rules, callable) dikerjakan saat energi masih penuh.

## Fase 0 — Walking skeleton (≈20 mnt)
- Init repo, `firebase.json` (emulator auth/firestore/functions), seed script (konversi ISO → Timestamp, set claim `ops`), `npm run emulators`, `npm run seed`.
- Bukti: emulator jalan, data seed terlihat di Emulator UI (2 campaign, 6 submission), user ops punya claim.
- Commit: `chore: skeleton + seed`
- Prasyarat lingkungan yang perlu dicek dulu: Java (untuk Firestore emulator), `firebase-tools`, versi Node.

## Fase 1 — Rules + tes (≈45 mnt) [T1]
- Tulis rules sendiri berdasarkan ARCHITECTURE.md, lalu rules test.
- Bukti: `npm run test:rules` hijau, termasuk kasus tolak (lihat TEST-PLAN).
- Commit: `feat(rules): ...`, `test(rules): ...`

## Fase 2 — Callables + tes (≈60 mnt) [T2]
- `stateMachine.ts` murni dulu (mudah diuji), lalu callable + transaksi + auditLog.
- Bukti: unit test hijau; integration test konkurensi (mis. 10 pemanggilan paralel approve → tepat 1 auditLog).
- Commit per callable.

## Fase 3 — React (≈60 mnt) [T3]
- Login seed (pilih user), Ops queue + filter, Creator form + list. Semua state loading/empty/error.
- Bukti: checklist smoke manual di TEST-PLAN, termasuk satu kegagalan sengaja (mis. submit URL salah, dan request ditolak rules).
- Commit per layar.

## Fase 4 — CSV (≈30 mnt) [T4]
- Parser import + laporan baris; export payout + BOM + anti-injection.
- Bukti: unit test dengan creators-messy.csv (hasil per baris sesuai TEST-PLAN); buka export di Excel/LibreOffice dan cek karakter Thai.

## Fase 5 — i18n (≈15 mnt) [T5]
- en/th + toggle + `npm run check:i18n` (uji dengan sengaja menghapus satu key → exit 1).

## Fase 6 — NOTES, README, video (≈30 mnt)
- NOTES.md (T6), README perintah persis (jalankan dari clone bersih), rekam video.
- Bukti: clone bersih → ikuti README → semua jalan.

## Aturan pemotongan
Bila waktu habis: stub-kan, tulis di NOTES.md "STUBBED: ...". Urutan yang boleh dipotong lebih dulu: styling, i18n penuh, test komponen UI. TIDAK boleh dipotong: rules test, test callable, penjelasan konkurensi.

## Risiko utama
1. Kode AI yang tidak saya pahami → follow-up call gagal. Mitigasi: protokol di AGENTS.md (jelaskan tiap file sebelum commit).
2. Over-engineering dokumen/abstraksi memakan jam. Mitigasi: dokumen ini sudah cukup; jangan menambah.
3. Setup emulator (Java/port) memakan waktu. Mitigasi: Fase 0 dikerjakan dulu.

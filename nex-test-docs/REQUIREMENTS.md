# REQUIREMENTS

Format: ID — kebutuhan — acceptance (harus bisa dibuktikan).

## Task 1 — Data model & rules
- R1.1 Koleksi `campaigns`, `submissions`, `auditLogs` terdefinisi (lihat ARCHITECTURE.md).
- R1.2 Creator hanya bisa READ submission miliknya (`creatorId == auth.uid`).
- R1.3 Creator hanya bisa CREATE submission dengan `creatorId == auth.uid`, dan tidak bisa mengatur status selain nilai awal yang dikunci rules (lihat D3).
- R1.4 Creator tidak bisa update/delete submission apa pun.
- R1.5 Ops (custom claim) bisa read semua koleksi.
- R1.6 Semua write lain = deny (hanya lewat Functions/Admin SDK). Default deny.
- R1.7 Rules test (`@firebase/rules-unit-testing`): minimal 1 request diizinkan dan 2 ditolak. Target saya: lebih banyak (lihat TEST-PLAN).

## Task 2 — Callables
- R2.1 `reviewSubmission({id, decision, reason})`: hanya ops claim.
- R2.2 Transisi sah: pending→approved, pending→rejected. Selain itu ditolak.
- R2.3 Reject wajib `reason` (trim, tidak kosong).
- R2.4 `markPaid({id})`: approved→paid, hanya ops.
- R2.5 Idempoten: panggilan ulang dengan hasil akhir yang sama tidak error dan tidak membuat auditLog ganda.
- R2.6 Aman konkuren: transaksi Firestore; dua pemanggil bersamaan tidak bisa menghasilkan dua transisi.
- R2.7 Setiap perubahan state menulis `auditLogs` di transaksi yang sama.
- R2.8 Unit test untuk: non-ops ditolak, transisi ilegal, reject tanpa reason, idempoten, konkuren.

## Task 3 — React
- R3.1 Ops: antrean review, filter status + campaign, aksi approve/reject (reject minta reason), state loading/empty/error.
- R3.2 Creator: form submit URL TikTok dengan validasi, daftar submission sendiri (loading/empty/error).
- R3.3 Error dari callable/rules ditampilkan sebagai pesan yang dapat dibaca (bukan stack trace / "internal").

## Task 4 — CSV
- R4.1 Import creators-messy.csv: laporan per baris bermasalah (nomor baris + alasan), baris bagus tetap diimpor.
- R4.2 Export payout untuk bulan terpilih: hanya status `approved`, terbuka benar di Excel (UTF-8 BOM, escaping), amount dari rate campaign.
- R4.3 Sel yang diawali `= + - @` di-neutralisasi pada export (anti formula injection).

## Task 5 — i18n
- R5.1 Toggle EN/TH di UI.
- R5.2 Script/test gagal (exit code ≠ 0) bila ada key di satu bahasa tapi tidak di bahasa lain.

## Task 6 — NOTES.md
- R6.1 Jawab (a) deploy satu function, (b) lokasi client secret TikTok, (c) dua ops approve bersamaan, (d) dua hal yang diperbaiki jika ada waktu.
- R6.2 Cantumkan semua yang di-stub/dipotong.

## Deliverable
- R7.1 Repo git dengan README berisi perintah persis: start emulator, run app, run tests.
- R7.2 Video 5–8 menit, 4 bagian berurutan (lihat VIDEO-OUTLINE.md).
- R7.3 NOTES.md.

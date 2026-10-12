# DECISIONS (locked)

Aturan GSD: keputusan di sini TERKUNCI. Jangan dibuka ulang di tengah build kecuali ada bukti bahwa keputusan itu salah. Setiap keputusan mencatat apa yang dikorbankan, karena bagian video #3 meminta itu.

Status: ✅ = saya sudah putuskan, ❓ = ambigu di brief, perlu dikonfirmasi/diputuskan sadar.

## D1 ✅ Stack
Vite + React 19 + TS, Firebase Functions v2 (TS), Vitest, `@firebase/rules-unit-testing`.
Dikorbankan: tidak pakai state library/router berat. Cukup hooks.
Catatan: "Latest Node" di brief vs runtime Functions yang didukung perlu diverifikasi (emulator memakai Node lokal). Cek `engines` di `functions/package.json`.

## D2 ✅ Penanda ops
Custom claim boolean `ops: true` (di-set oleh seed script via Admin SDK ke Auth emulator). Seed.json punya field `role`; itu hanya input seed, BUKAN dasar otorisasi. Otorisasi selalu dari token claim.
Dikorbankan: klaim berubah butuh refresh token; di UI pakai `getIdToken(true)` setelah login seed.

## D3 ❓ Status saat create
Brief: creator "can never set status". Dua tafsir:
- (A) Rules mewajibkan `status == 'pending'` (konstanta, bukan pilihan) — sederhana, query ops by status langsung bekerja.
- (B) Rules melarang field `status` sama sekali; trigger `onDocumentCreated` mengisi `pending`.
Pilihan saya: **A**. Alasan: tidak ada jendela dokumen tanpa status, tanpa trigger tambahan. Risiko: reviewer yang membaca "never set" secara harfiah bisa menganggap A kurang ketat. Saya akan sebut ini eksplisit di video dan NOTES.
Dikorbankan: kepatuhan literal.

## D4 ✅ Semantik idempoten
- Panggilan yang hasil akhirnya sudah tercapai (mis. approve pada submission yang sudah approved) → sukses, `changed:false`, tanpa auditLog baru.
- Transisi bertentangan (approve pada rejected, dll.) → `failed-precondition`.
- Semua baca-lalu-tulis di dalam `runTransaction`; auditLog ditulis di transaksi yang sama hanya jika ada perubahan.
Dikorbankan: tidak ada idempotency key dari klien. Tidak diperlukan karena state machine sendiri sudah idempoten.

## D5 ❓ Bulan payout & zona waktu
Seed s4: `createdAt = 2026-09-30T18:30:00Z` = **1 Oktober 01:30 di Asia/Bangkok**. Maka bulan "September" berbeda tergantung UTC vs Bangkok.
Pilihan saya: bulan dihitung di **Asia/Bangkok** (bisnis Thailand, rate THB). Konsekuensi: s3 masuk September; s4 masuk Oktober.
Seed tidak punya `approvedAt`, jadi bulan memakai `createdAt`. Idealnya payout memakai tanggal approve; saya tulis ini di NOTES sebagai perbaikan. Perlu diverifikasi/ditanyakan ke Nex bila memungkinkan.
Dikorbankan: bisa berbeda dari ekspektasi reviewer; maka dijelaskan di video.

## D6 ✅ Uang
Integer THB (tanpa float). `amountTHB = campaign.ratePerVideoTHB` dibaca saat export.
Dikorbankan: bila rate campaign berubah, export lama bisa berubah. Memperbaiki: snapshot rate saat approve (masuk daftar "fix with more time").

## D7 ✅ CSV export
UTF-8 dengan BOM, pemisah koma, CRLF, kutip ganda untuk field berisi `,` `"` newline; sel diawali `= + - @ \t \r` diberi prefiks `'`. Kolom: submissionId, creatorId, creatorEmail?, campaignId, campaignTitle, tiktokUrl, createdAt (ISO, UTC), amountTHB.
Dikorbankan: prefiks `'` mengubah nilai teks; dapat diterima untuk payout.

## D8 ❓ Tujuan import creators
Brief tidak menyebut di mana hasil impor disimpan.
Pilihan saya: modul parser murni (diuji unit) + skrip CLI yang menulis baris valid ke koleksi `creators` (kunci = email lowercase, sehingga re-import idempoten) dan mencetak laporan. Rules: `creators` read ops-only, write deny.
Aturan validasi: nama wajib; email format valid; email duplikat di file → tolak baris kedua dst.; handle wajib diawali `@`; nilai diawali `= + - @` pada nama/kota dianggap berbahaya → ditolak dengan alasan (bukan diam-diam dibersihkan).
Dikorbankan: tidak ada UI upload (stub, dicatat).

## D9 ✅ i18n
Kamus JSON `en.json` / `th.json` + hook sederhana (atau react-i18next bila lebih cepat). Script `check-i18n` membandingkan set key (flatten) dua arah, exit 1 bila beda.
Dikorbankan: tidak ada pluralisasi/ICU.

## D10 ✅ Strategi test
- Rules: emulator Firestore + rules-unit-testing.
- Functions: unit test logika state machine murni + integration test ke emulator untuk konkurensi.
- UI: smoke manual terdokumentasi; test komponen hanya untuk validasi URL.

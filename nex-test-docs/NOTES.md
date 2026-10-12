# NOTES.md (DRAFT — revisi setelah implementasi nyata; jangan kirim draf ini apa adanya)

## (a) Deploy hanya function baru tanpa menyentuh yang lain
`firebase deploy --only functions:reviewSubmission` (atau `functions:reviewSubmission,functions:markPaid`). Jangan `firebase deploy --only functions` tanpa nama: itu men-deploy semua dan, dengan source yang tidak lengkap, dapat memicu penghapusan function yang tidak ada di kode. Tambahan: `--dry-run`/cek `firebase functions:list` dulu, deploy ke project staging dulu. Bila function dikelompokkan, `functions:grup` juga bisa. [Perlu diverifikasi di dokumentasi Firebase CLI saat final.]

## (b) Di mana TikTok client secret disimpan
Di Secret Manager lewat mekanisme secrets Firebase Functions (`defineSecret('TIKTOK_CLIENT_SECRET')`, di-set dengan `firebase functions:secrets:set`), dibaca hanya di sisi server pada function yang mendeklarasikannya. Tidak pernah di klien (variabel `VITE_*` terekspos ke browser), tidak di git, tidak di Firestore. Lokal/emulator: file `.secret.local` yang di-gitignore. [Verifikasi nama perintah/berkas di dokumentasi saat final.]

## (c) Dua ops approve submission yang sama bersamaan
Keduanya menjalankan transaksi yang membaca dokumen. Firestore menjamin hanya satu commit yang berhasil pada versi dokumen yang dibaca; transaksi lain dicoba ulang, kini membaca `approved`, lalu mengembalikan `changed:false` tanpa menulis auditLog kedua. Hasil: satu transisi, satu auditLog, kedua pemanggil mendapat sukses. Bila satu approve dan satu reject: yang kalah mendapat `failed-precondition`. Dibuktikan oleh test B10/B11.

## (d) Dua hal yang diperbaiki bila ada waktu (kandidat; pilih yang benar-benar terjadi)
1. Simpan `approvedAt` dan snapshot `ratePerVideoTHB` saat approve, agar payout bulanan dan jumlah tidak berubah retroaktif.
2. Export payout sisi server (callable ops) + pagination, agar tidak bergantung pada data muat di klien; plus UI upload untuk import creators.

## Di-stub / dipotong
(isi dari STATE.md)

## Asumsi yang saya ambil (jelaskan di video)
- D3, D5, D8 (lihat DECISIONS.md).

# VIDEO OUTLINE (5–8 menit, JANGAN dibaca dari skrip — ini hanya poin)

Rekam setelah semua test hijau dan clone bersih berhasil. Latihan sekali, rekam satu take.

## 1. Demo (~2 mnt)
- Creator-a submit link valid → muncul pending
- Submit URL salah → pesan validasi (kegagalan sengaja #1)
- Ops: approve satu, reject satu dengan reason
- Tunjukkan satu penolakan nyata: mis. creator mencoba set status via console/test → DENY, atau baris CSV buruk dengan nomor baris + alasan
- Export CSV September, buka di Excel/LibreOffice (Thai tampil benar)

## 2. Rules & callable (~2 mnt)
- Buka rule `create`: jelaskan tiap kondisi (creatorId, status konstanta, hasOnly, createdAt == request.time, regex URL, campaign open)
- Pertanyaan wajib: "Apa yang mencegah creator meng-approve submission sendiri?" → rules `update: false` + callable cek claim `ops` di server + transisi di transaksi
- Buka `reviewSubmission`: urutan cek, transaksi, idempoten, auditLog

## 3. Satu keputusan (~2 mnt)
Pilih satu dan jelaskan opsi, pilihan, yang dikorbankan. Kandidat terkuat: D5 (zona waktu Bangkok vs UTC, s4 jatuh di 1 Okt) atau D3 (status literal 'pending' vs dilarang total).

## 4. Yang kurang (~1 mnt)
- Apa yang di-stub
- Apa yang diperbaiki pertama
- Apa yang paling mengkhawatirkan (jujur; mis. rules `get()` per create, export di klien, tidak ada approvedAt)

## Checklist sebelum rekam
- [ ] Saya bisa menjelaskan setiap baris rules dan callable tanpa melihat catatan
- [ ] Saya bisa mengubah satu aturan live (mis. batas panjang reason) dan menjalankan test
- [ ] Layar bersih, tanpa secret terlihat

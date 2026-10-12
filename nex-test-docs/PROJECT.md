# PROJECT — Nex Submission Review Slice

## Tujuan
Membangun irisan tipis alur: creator submit link TikTok → ops review (approve/reject) → ops tandai paid → export CSV payout bulanan. Plus import CSV creator yang kotor dan toggle bahasa EN/TH.

## Sumber kebenaran
PDF "Nex Entertainment — Fullstack technical test", seed.json, creators-messy.csv. Jika dokumen ini bertentangan dengan PDF, PDF menang.

## Batasan keras (dari brief)
- Hanya Firebase emulators (Auth, Firestore, Functions). Tidak ada project Firebase asli. Tidak ada secret di repo.
- Node terbaru, React 19 + TypeScript + Vite. Styling bebas.
- Time-box 3–4 jam. Yang tidak sempat: di-stub dan dicatat di NOTES.md.
- AI boleh, tapi saya harus bisa menjelaskan SETIAP baris dan mengubahnya live saat follow-up call.
- Commit sering; riwayat git ikut dinilai.

## Yang dinilai (urutan prioritas)
1. Keamanan rules + callable
2. Kebenaran saat dipanggil berulang / bersamaan
3. Perilaku UI saat error
4. Penanganan data kotor
5. Kejelasan penjelasan di video

## Non-goals (sengaja TIDAK dikerjakan)
- Deploy ke Firebase asli, integrasi TikTok API sungguhan, verifikasi video, pembayaran sungguhan.
- Manajemen campaign (CRUD), UI untuk assign creator ke campaign.
- Pagination canggih, realtime presence, notifikasi.
- Abstraksi umum "untuk nanti". Tunda sampai ada kebutuhan nyata.

## Definisi selesai
Setiap REQ di REQUIREMENTS.md punya bukti verifikasi (perintah + output) di TEST-PLAN.md. Tidak ada "kayaknya sudah beres".

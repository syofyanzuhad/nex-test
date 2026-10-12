# Roadmap

Source: nex-test-docs/ROADMAP.md (7 phases, 3–4h, vertical, commit per phase). A phase is done only with verification evidence.

## Phases
- [x] **Phase 0: Walking skeleton** — repo, firebase.json, seed (ISO→Timestamp, ops claim), `npm run emulators/seed`
- [ ] **Phase 1: Rules + tests** — R1.1–R1.7
- [ ] **Phase 2: Callables + tests** — R2.1–R2.8 (state machine, transaction, auditLog, concurrency)
- [ ] **Phase 3: React** — R3.1–R3.3
- [ ] **Phase 4: CSV** — R4.1–R4.3
- [ ] **Phase 5: i18n** — R5.1–R5.2
- [ ] **Phase 6: NOTES, README, video** — R6.x, R7.x

## Phase Details
### Phase 0 — Walking skeleton (≈20 mnt)
- Init repo, `firebase.json` (emulator auth/firestore/functions), seed script (konversi ISO → Timestamp, set claim `ops`), `npm run emulators`, `npm run seed`.
- Bukti: emulator jalan, data seed terlihat di Emulator UI (2 campaign, 6 submission), user ops punya claim.
- Commit: `chore: skeleton + seed`
- Prasyarat lingkungan yang perlu dicek dulu: Java (untuk Firestore emulator), `firebase-tools`, versi Node.

### Phase 1 — Rules + tes (≈45 mnt) [T1]
- Tulis rules sendiri berdasarkan ARCHITECTURE.md, lalu rules test.
- Bukti: `npm run test:rules` hijau, termasuk kasus tolak (lihat TEST-PLAN).
- Commit: `feat(rules): ...`, `test(rules): ...`

### Phase 2 — Callables + tes (≈60 mnt) [T2]
- `stateMachine.ts` murni dulu (mudah diuji), lalu callable + transaksi + auditLog.
- Bukti: unit test hijau; integration test konkurensi (mis. 10 pemanggilan paralel approve → tepat 1 auditLog).
- Commit per callable.

### Phase 3 — React (≈60 mnt) [T3]
- Login seed (pilih user), Ops queue + filter, Creator form + list. Semua state loading/empty/error.
- Bukti: checklist smoke manual di TEST-PLAN, termasuk satu kegagalan sengaja (mis. submit URL salah, dan request ditolak rules).
- Commit per layar.

### Phase 4 — CSV (≈30 mnt) [T4]
- Parser import + laporan baris; export payout + BOM + anti-injection.
- Bukti: unit test dengan creators-messy.csv (hasil per baris sesuai TEST-PLAN); buka export di Excel/LibreOffice dan cek karakter Thai.

### Phase 5 — i18n (≈15 mnt) [T5]
- en/th + toggle + `npm run check:i18n` (uji dengan sengaja menghapus satu key → exit 1).

### Phase 6 — NOTES, README, video (≈30 mnt)
- NOTES.md (T6), README perintah persis (jalankan dari clone bersih), rekam video.
- Bukti: clone bersih → ikuti README → semua jalan.


## Aturan pemotongan
Bila waktu habis: stub-kan, tulis di NOTES.md "STUBBED: ...". Urutan yang boleh dipotong lebih dulu: styling, i18n penuh, test komponen UI. TIDAK boleh dipotong: rules test, test callable, penjelasan konkurensi.

## Risiko utama
1. Kode AI yang tidak saya pahami → follow-up call gagal. Mitigasi: protokol di AGENTS.md (jelaskan tiap file sebelum commit).
2. Over-engineering dokumen/abstraksi memakan jam. Mitigasi: dokumen ini sudah cukup; jangan menambah.
3. Setup emulator (Java/port) memakan waktu. Mitigasi: Fase 0 dikerjakan dulu.

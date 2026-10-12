# Nex Submission Review Slice

## What This Is
Irisan tipis alur: creator submit link TikTok → ops review (approve/reject) → ops tandai paid → export CSV payout bulanan. Plus import CSV creator kotor dan toggle EN/TH. Technical test Nex Entertainment (fullstack), Firebase emulators only.

## Core Value
Keamanan rules + callable yang benar saat dipanggil berulang/bersamaan — dan saya bisa menjelaskan setiap baris.

## Requirements

### Validated
(None yet — ship to validate)

### Active
- [ ] Rules + tes (R1.x), Callables transaksional idempoten (R2.x), React UI (R3.x), CSV import/export (R4.x), i18n EN/TH (R5.x), NOTES/README/video (R6–R7)
Detail: see REQUIREMENTS.md.

### Out of Scope
- Deploy Firebase asli, TikTok API, verifikasi video, pembayaran nyata — di luar brief
- CRUD campaign / assign creator UI — non-goal
- Pagination canggih, realtime presence, notifikasi — non-goal
- Abstraksi "untuk nanti" — tunda sampai perlu

## Context
- Sumber kebenaran: PDF brief, seed.json, creators-messy.csv (PDF menang bila konflik).
- Time-box 3–4 jam; yang tak sempat di-stub dan dicatat di NOTES.md.
- Prioritas penilaian: 1 keamanan rules+callable, 2 kebenaran idempoten/konkuren, 3 UI saat error, 4 data kotor, 5 penjelasan video.
- Docs lengkap di nex-test-docs/ (ARCHITECTURE, DECISIONS, TEST-PLAN, AGENTS, VIDEO-OUTLINE, NOTES).

## Constraints
- **Infra**: Hanya Firebase emulators (Auth, Firestore, Functions); tanpa secret di repo
- **Stack**: Vite + React 19 + TS, Functions v2 TS, Vitest, @firebase/rules-unit-testing
- **Authz**: custom claim `ops` saja, bukan field `role`
- **Process**: satu fase per waktu, commit kecil conventional, bukti verifikasi per REQ

## Key Decisions
| Decision | Rationale | Outcome |
|----------|-----------|---------|
| D1 Stack Vite/React19/Functions v2 | Cepat, hooks cukup | — Pending |
| D2 Ops = custom claim `ops:true` | Authz dari token | — Pending |
| D3 Create status literal 'pending' (A) | Tanpa jendela tanpa status | — Pending |
| D4 Idempoten via state machine, changed:false | Tanpa idempotency key | — Pending |
| D5 Bulan payout Asia/Bangkok, createdAt | Bisnis Thailand | — Pending |
| D6 Uang integer THB dari rate campaign | Tanpa float | — Pending |
| D7 CSV UTF-8 BOM, CRLF, anti-formula prefix `'` | Excel-safe | — Pending |
| D8 Import creators: parser murni + CLI ke `creators` | Brief diam | — Pending |
| D9 i18n JSON + check-i18n exit 1 | Sederhana | — Pending |
| D10 Strategi test rules/functions/UI | Fokus nilai | — Pending |
Full rationale: nex-test-docs/DECISIONS.md.

## Evolution
This document evolves at phase transitions and milestone boundaries (see /gsd-transition, /gsd-complete-milestone).

---
*Last updated: 2026-10-12 after initialization*

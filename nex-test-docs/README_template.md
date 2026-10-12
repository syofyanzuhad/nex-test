# Nex Submission Review (technical test)

## Prasyarat
- Node (versi terbaru; lihat `.nvmrc`/`engines`)
- Java (dibutuhkan Firestore emulator)
- `npm i -g firebase-tools` (atau gunakan `npx firebase`)

## Setup
```bash
npm install            # root
npm --prefix functions install
npm --prefix web install
```

## Jalankan emulator (terminal 1)
```bash
npm run emulators      # Auth :9099, Firestore :8080, Functions :5001, UI :4000 (sesuaikan firebase.json)
```

## Seed data (terminal 2)
```bash
npm run seed           # 2 campaign, 3 user (claim ops untuk ops-1), 6 submission
```

## Jalankan app (terminal 2)
```bash
npm run dev            # http://localhost:5173
```
Login seed: a@example.com / b@example.com (creator), ops@example.com (ops).

## Test
```bash
npm run test:rules       # butuh emulator Firestore (memakai emulators:exec)
npm run test:functions
npm run check:i18n
npm test                 # semua
```

## Import creators
```bash
npm run import:creators -- data/creators-messy.csv
```

## Catatan
Lihat NOTES.md untuk keputusan, asumsi, dan yang di-stub.

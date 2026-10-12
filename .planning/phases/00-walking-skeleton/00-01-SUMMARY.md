# Phase 0 Plan 1 Summary: Walking skeleton + seed

## What was built
- Initialized repo structure (`package.json`, `firebase.json`, `.firebaserc`, `.gitignore`, `firestore.rules`).
- Created Cloud Functions package skeleton in `functions/` (Node 22 target, TypeScript).
- Created `data/seed.json` and `data/creators-messy.csv`.
- Created `scripts/seed.ts` providing idempotent seed execution:
  - Auth users created (`ops-1`, `ops-2`, `creator-a`, `creator-b`).
  - Custom user claim `{ ops: true }` assigned to ops users (per D2).
  - 2 campaigns loaded (`c1`, `c2`).
  - 6 submissions loaded (`s1`..`s6`) with `createdAt` converted from ISO string to Firestore `Timestamp`.

## Verification evidence
- Firebase emulators started cleanly with demo project `demo-nex`.
- `npm run seed` executed and tested for idempotency.
- Verification script confirmed:
  - `ops-1` claim: `{ ops: true }`
  - `creator-a` claim: `{ ops: false }`
  - Campaigns count: 2
  - Submissions count: 6
  - `createdAt` type: `Timestamp`

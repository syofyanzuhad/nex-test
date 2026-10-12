# ARCHITECTURE

## Struktur repo (usulan)
```
/
├─ firebase.json  firestore.rules  firestore.indexes.json
├─ functions/        # reviewSubmission, markPaid, (opsional) importCreators
│  └─ src/  index.ts  stateMachine.ts  *.test.ts
├─ web/              # Vite + React 19 + TS
│  └─ src/  i18n/en.json th.json  pages/  lib/
├─ scripts/          # seed.ts, check-i18n.ts, import-creators.ts
├─ test/rules/       # firestore.rules.test.ts
├─ data/             # seed.json, creators-messy.csv
├─ README.md  NOTES.md  AGENTS.md
```

## Model data
**campaigns/{id}**: `title`, `status` ('open'|'closed'), `ratePerVideoTHB` (int)
**submissions/{id}**: `campaignId`, `creatorId`, `tiktokUrl`, `status` ('pending'|'approved'|'rejected'|'paid'), `reason?` (wajib saat rejected), `createdAt` (timestamp), `reviewedBy?`, `reviewedAt?`, `paidAt?`
**auditLogs/{autoId}**: `submissionId`, `actorUid`, `action` ('approve'|'reject'|'markPaid'), `from`, `to`, `reason?`, `at` (serverTimestamp)
**creators/{emailLower}** (D8): `name`, `email`, `tiktokHandle`, `city`, `importedAt`

Catatan seed: seed.json menyimpan `createdAt` sebagai string ISO. Seed script HARUS mengonversi ke Firestore Timestamp, bila tidak, rules `createdAt == request.time` dan query bulan akan tidak konsisten. Seed juga punya `reason` hanya di s5.

## State machine submission
| dari \ ke | approved | rejected | paid |
|---|---|---|---|
| pending | ✅ (ops) | ✅ (ops, reason wajib) | ❌ |
| approved | no-op bila sama | ❌ | ✅ (markPaid) |
| rejected | ❌ | no-op bila sama | ❌ |
| paid | ❌ | ❌ | no-op bila sama |

## Sketsa rules (HARUS ditulis ulang & dipahami baris per baris, bukan disalin)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function signedIn() { return request.auth != null; }
    function isOps()    { return signedIn() && request.auth.token.ops == true; }

    match /campaigns/{id} {
      allow read: if signedIn();
      allow write: if false;
    }
    match /submissions/{id} {
      allow read: if isOps() || (signedIn() && resource.data.creatorId == request.auth.uid);
      allow create: if signedIn()
        && request.resource.data.keys().hasOnly(['campaignId','creatorId','tiktokUrl','status','createdAt'])
        && request.resource.data.keys().hasAll(['campaignId','creatorId','tiktokUrl','status','createdAt'])
        && request.resource.data.creatorId == request.auth.uid
        && request.resource.data.status == 'pending'
        && request.resource.data.createdAt == request.time
        && request.resource.data.tiktokUrl is string
        && request.resource.data.tiktokUrl.matches('^https://(www\\.|vm\\.|vt\\.)?tiktok\\.com/.+')
        && get(/databases/$(db)/documents/campaigns/$(request.resource.data.campaignId)).data.status == 'open';
      allow update, delete: if false;
    }
    match /auditLogs/{id}  { allow read: if isOps(); allow write: if false; }
    match /creators/{id}   { allow read: if isOps(); allow write: if false; }
    match /{document=**}   { allow read, write: if false; }
  }
}
```
Poin yang perlu saya uji, bukan asumsikan:
- Query list creator wajib `where('creatorId','==',uid)`; query tanpa filter akan ditolak rules (itu perilaku yang benar, UI harus selalu menyertakan filter).
- Regex URL: seed s3 memakai `vm.tiktok.com/ZSabc123/`, jadi short link harus lolos. Pastikan `https://tiktok.com.evil.com/x` dan `https://evil.com/tiktok.com/` ditolak.
- Validasi di rules adalah otoritas; validasi di klien hanya UX.
- Rules `get()` dihitung sebagai baca dokumen (biaya) — dapat diterima di skala ini.

## Kontrak callable
`reviewSubmission({ id: string, decision: 'approved'|'rejected', reason?: string })` → `{ ok: true, changed: boolean, status }`
`markPaid({ id: string })` → `{ ok: true, changed: boolean, status }`
Error (HttpsError): `unauthenticated`, `permission-denied` (bukan ops), `invalid-argument` (decision salah / reject tanpa reason / reason > 500 char), `not-found`, `failed-precondition` (transisi ilegal).
Urutan cek: auth → claim ops → validasi input → transaksi (get → cek state → update + tulis auditLog).

## Konkurensi
Dua ops approve bersamaan: transaksi pertama commit; transaksi kedua dicoba ulang oleh Firestore, melihat `approved`, mengembalikan no-op (`changed:false`), tanpa auditLog ganda. Approve vs reject bersamaan: yang kalah mendapat `failed-precondition`.

## Export payout
Dilakukan di klien ops atau callable? Pilihan: **klien** (query `status == 'approved'`, filter bulan di Asia/Bangkok, join campaign di memori, bangun CSV). Alasan: tidak butuh function baru. Dikorbankan: data besar tidak skalabel; dicatat.
Gunakan indeks komposit bila query menggabungkan `status` + range `createdAt`; emulator akan memberi tahu bila indeks kurang.

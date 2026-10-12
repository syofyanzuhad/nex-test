# Phase 1 Plan 1 Summary: Firestore Security Rules + Tests

## What was built
- Configured rules unit testing tooling with `@firebase/rules-unit-testing`, `vitest`, and peer `firebase` 10.x.
- Implemented `firestore.rules`:
  - `signedIn()` and `isOps()` helpers checking `request.auth.token.ops == true` (R1.5, D2).
  - `campaigns`: read allowed for authenticated users, write blocked (R1.1, R1.6).
  - `submissions`:
    - read restricted to submission owner or ops (R1.2, R1.5).
    - create restricted to owner (`creatorId == auth.uid`), exact schema whitelist (`hasOnly` & `hasAll`), literal `status == 'pending'` (D3-A), server timestamp enforcement (`createdAt == request.time`), regex validating TikTok domains including short links (`vm.tiktok.com`, `vt.tiktok.com`), and `get()` checking target campaign status is `open` (R1.3).
    - update & delete disallowed completely (R1.4, R1.6).
  - `auditLogs` & `creators`: read ops only, write disallowed (R1.1, R1.5, R1.6).
  - catch-all default deny for all other paths (R1.6).
- Comprehensive unit test suite in `test/rules/firestore.rules.test.ts` covering test plan scenarios A1 through A14.

## Verification evidence
- Executed `npm run test:rules` through Firestore emulator.
- All 14 test scenarios passed:
  - A1: creator-a can create valid submission for own creatorId on open campaign (PASS)
  - A2: creator-a cannot create submission with another creatorId (PASS)
  - A3: creator-a cannot create submission with status 'approved' (PASS)
  - A4: creator-a cannot update submission (PASS)
  - A5: creator-a cannot read submission belonging to creator-b (PASS)
  - A6: creator-a can read own submission (PASS)
  - A7: ops-1 (with ops claim) can read any submission and auditLogs (PASS)
  - A8: ops-1 cannot write directly to submissions (PASS)
  - A9: unauthenticated client cannot read or create submissions (PASS)
  - A10: invalid tiktok domain (tiktok.com.evil.com) is denied (PASS)
  - A11: short link vm.tiktok.com is allowed (PASS)
  - A12: extra fields in submission create are denied (PASS)
  - A13: creating submission to closed or non-existent campaign is denied (PASS)
  - A14: access to unknown collection is denied (PASS)

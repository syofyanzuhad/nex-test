# Phase 2 Plan 1 Summary: Cloud Functions Callables + Tests

## What was built
- **Pure State Machine (`functions/src/stateMachine.ts` & `stateMachine.test.ts`)**:
  - Implemented immutable transitions matching table:
    - `pending` -> `approved` (approve) or `rejected` (reject with mandatory non-empty trimmed reason <= 500 chars).
    - `approved` -> `paid` (markPaid) or no-op on re-approve.
    - `rejected` -> no-op on re-reject, illegal on approve/markPaid.
    - `paid` -> no-op on re-markPaid, illegal on approve/reject.
  - 13 unit tests verifying all cell transitions and edge cases.
- **Transactional Callables (`functions/src/index.ts`)**:
  - `reviewSubmission`: enforces authentication, ops token claim (`request.auth.token.ops == true`), validates inputs, executes Firestore `runTransaction`:
    - Checks document existence (throws `not-found`).
    - Evaluates transition using pure state machine (throws `failed-precondition` on illegal).
    - If no-op: returns `{ ok: true, changed: false, status }` without writing new audit logs (idempotency, D4, R2.5).
    - If state changed: atomically updates submission status + metadata and appends `auditLogs` entry in the same transaction (R2.6, R2.7).
  - `markPaid`: transitions `approved` -> `paid` within an atomic Firestore transaction.
- **Integration Test Suite (`test/functions.test.ts`)**:
  - Full automated tests B1 through B12 running against emulated Auth, Firestore, and Functions.
  - Concurrency tests:
    - B10: 10 parallel approve calls resulted in exactly 1 `changed: true` and 1 auditLog.
    - B11: Concurrent approve vs reject race condition resulted in exactly 1 success and 1 `failed-precondition`.

## Verification evidence
- `npm run test:functions` passed (12/12 integration tests).
- `npm test` ran both rules and functions suites cleanly.

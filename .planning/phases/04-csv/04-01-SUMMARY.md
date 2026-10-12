# Phase 4 Plan 1 Summary: CSV Import & Export

## What was built
- **RFC4180 CSV Parser (`scripts/lib/csv.ts` & `csv.test.ts`)**:
  - Pure zero-dependency parser removing UTF-8 BOM, supporting escaped double quotes (`""`), CRLF/LF line endings, and multiline fields while tracking the 1-indexed original physical start line.
- **Creator Validation & Import CLI (`scripts/lib/creators.ts`, `creators.test.ts`, `scripts/import-creators.ts`)**:
  - Evaluated against `data/creators-messy.csv`:
    - Rows 2, 3, 4 parsed cleanly (handles quotes, commas, and Thai Unicode intact).
    - Row 5 rejected: Duplicate email with citation to line 2.
    - Row 6 rejected: Reports multiple distinct errors (empty name AND invalid email format).
    - Row 7 rejected: Formula injection detected (`=HYPERLINK(...)`).
    - Row 8 rejected: TikTok handle missing leading `@`.
  - CLI upserts valid records to `creators/{emailLower}` on Firestore emulator (3 documents written idempotently).
- **Payout CSV Export (`web/src/lib/payoutCsv.ts`, `payoutCsv.test.ts`)**:
  - Uses `Intl.DateTimeFormat` configured with timezone `Asia/Bangkok` to group submissions strictly by Bangkok month (D5).
  - Correctly categorizes boundary item `s4` (2026-09-30T18:30:00Z -> October 1st 01:30 Bangkok -> October). September payout produces strictly `s3` (800 THB).
  - Prepend single quote (`'`) to neutralize formula injection prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`) per R4.3 / D7.
  - Adds UTF-8 BOM (`\ufeff`) so exported CSV opens seamlessly with correct Thai typography in Microsoft Excel.
- **Ops Frontend Integration (`web/src/App.tsx`)**:
  - Added month picker and "Export Payout CSV" action triggering direct browser download.

## Verification evidence
- `scripts/lib/creators.test.ts` & `scripts/lib/csv.test.ts` passed (4/4 tests).
- `web/src/lib/payoutCsv.test.ts` passed (3/3 tests).
- `npm run import:creators` executed against Firestore emulator: verified 3 valid creators written to `creators` collection and 4 invalid rows reported.
- `npm test` ran all 36 tests across all test suites cleanly.

# Phase 5 Plan 1 Summary: Internationalization (EN / TH) & Integrity Check

## What was built
- **i18n Dictionaries (`web/src/i18n/en.json`, `web/src/i18n/th.json`)**:
  - Full translations for all user-facing strings across Authentication, Creator Portal, Ops Review Queue, Payout Export, Status badges, and Error messages (75 keys each).
- **i18n React Context & Hook (`web/src/i18n/I18nContext.tsx`)**:
  - `I18nProvider` with `useI18n()` hook.
  - State persisted in `localStorage` (`app_lang`).
  - Parameterized interpolation (`t("ops.exportSuccess", { count: 1, month: "2026-09", total: 800 })`).
  - Fallback mechanism gracefully rendering keys if missing in active dictionary.
- **Header Language Toggle Switcher (R5.1)**:
  - Added EN / TH toggle switch in the application header affecting all rendered screens, status badges, and dynamic error messages in real time.
- **Strict Two-Way Dictionary Integrity Checker (`scripts/lib/i18n.ts`, `scripts/check-i18n.ts`, R5.2)**:
  - Flattening and diffing pure functions (`scripts/lib/i18n.ts` & `i18n.test.ts`).
  - `npm run check:i18n` command:
    - Exits `0` when dictionaries are 100% synchronized in both directions (75 keys).
    - Exits `1` and lists missing keys when a key is absent in either English or Thai.
  - Integrated into root `npm test` pipeline.

## Verification evidence
- Executed `npm run check:i18n`: passed with 75 keys matched in both directions.
- Tested failure modes:
  - Deleted key `app.signOut` from `th.json`: `check:i18n` failed with exit code 1 naming `app.signOut`.
  - Added `app.extraKeyOnlyInTh` to `th.json`: `check:i18n` failed with exit code 1 naming the key.
- Executed full `npm test`: all test suites (Rules: 14, Functions: 12, Web Lib: 6, Scripts: 6, i18n Check: 1) passed.

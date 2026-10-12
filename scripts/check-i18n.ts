import * as fs from "fs";
import * as path from "path";
import { diffI18nDictionaries } from "./lib/i18n";

const enPath = path.resolve(__dirname, "../web/src/i18n/en.json");
const thPath = path.resolve(__dirname, "../web/src/i18n/th.json");

console.log("🔍 Checking i18n dictionaries integrity (EN <-> TH)...");
const enRaw = JSON.parse(fs.readFileSync(enPath, "utf8"));
const thRaw = JSON.parse(fs.readFileSync(thPath, "utf8"));

const result = diffI18nDictionaries(enRaw, thRaw);

console.log(`Total EN keys: ${result.totalEnKeys}`);
console.log(`Total TH keys: ${result.totalThKeys}`);

if (result.synchronized) {
  console.log("✅ All i18n dictionary keys are completely synchronized in both directions!\n");
  process.exit(0);
} else {
  console.error("❌ i18n DICTIONARY MISMATCH DETECTED!");
  if (result.missingInTh.length > 0) {
    console.error(`Missing in Thai (TH) dictionary (${result.missingInTh.length} keys):`);
    result.missingInTh.forEach((k) => console.error(`  - ${k}`));
  }
  if (result.missingInEn.length > 0) {
    console.error(`Missing in English (EN) dictionary (${result.missingInEn.length} keys):`);
    result.missingInEn.forEach((k) => console.error(`  - ${k}`));
  }
  console.error("");
  process.exit(1);
}

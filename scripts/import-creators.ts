import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { validateCreatorsCsv } from "./lib/creators";

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
const PROJECT_ID = "demo-nex";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}
const db = admin.firestore();

async function runImport() {
  const filePath = path.resolve(__dirname, "../data/creators-messy.csv");
  console.log(`📂 Reading creators CSV from: ${filePath}`);

  const rawCsv = fs.readFileSync(filePath, "utf8");
  const { valid, errors } = validateCreatorsCsv(rawCsv);

  console.log("\n================ IMPORT REPORT ================");
  console.log(`Total rows processed: ${valid.length + errors.length}`);
  console.log(`Valid rows: ${valid.length}`);
  console.log(`Rejected rows: ${errors.length}\n`);

  if (errors.length > 0) {
    console.log("❌ REJECTED ROWS:");
    for (const err of errors) {
      console.log(`  Line ${err.lineNumber}:`);
      console.log(`    Reasons: ${err.reasons.join("; ")}`);
      console.log(`    Raw Data: [${err.rawRow.join(" | ")}]`);
    }
  }

  console.log("\n💾 WRITING VALID CREATORS TO FIRESTORE (creators/{emailLower})...");
  const batch = db.batch();
  for (const c of valid) {
    const docRef = db.collection("creators").doc(c.emailLower);
    batch.set(
      docRef,
      {
        name: c.name,
        email: c.email,
        tiktokHandle: c.tiktokHandle,
        city: c.city,
        importedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`  ✓ Line ${c.lineNumber}: ${c.name} (${c.emailLower})`);
  }

  await batch.commit();
  console.log("\n✅ Import process completed successfully!");
}

runImport().catch((err) => {
  console.error("Fatal error during import:", err);
  process.exit(1);
});

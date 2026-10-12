import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// Connect explicitly to emulators
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";

const PROJECT_ID = "demo-nex";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: PROJECT_ID,
  });
}

const auth = admin.auth();
const db = admin.firestore();

interface SeedData {
  users: Array<{ uid: string; email: string; role: string }>;
  campaigns: Array<{ id: string; title: string; status: string; ratePerVideoTHB: number }>;
  submissions: Array<{
    id: string;
    campaignId: string;
    creatorId: string;
    tiktokUrl: string;
    status: string;
    createdAt: string;
    reason?: string;
  }>;
}

async function runSeed() {
  console.log("🌱 Starting seed on emulators (projectId:", PROJECT_ID, ")...");

  const seedPath = path.resolve(__dirname, "../data/seed.json");
  const rawData = fs.readFileSync(seedPath, "utf-8");
  const seed: SeedData = JSON.parse(rawData);

  // 1. Seed Users in Auth with custom claims
  console.log("Creating/updating auth users...");
  for (const u of seed.users) {
    try {
      await auth.getUser(u.uid);
      await auth.updateUser(u.uid, {
        email: u.email,
        emailVerified: true,
      });
    } catch {
      await auth.createUser({
        uid: u.uid,
        email: u.email,
        password: "password123",
        emailVerified: true,
      });
    }

    // Set custom claims: D2 specifies ops: true based on role == 'ops'
    const isOps = u.role === "ops";
    await auth.setCustomUserClaims(u.uid, { ops: isOps });
    console.log(`  User ${u.uid} (${u.email}) => ops: ${isOps}`);
  }

  // 2. Seed Campaigns
  console.log("Seeding campaigns...");
  for (const c of seed.campaigns) {
    const { id, ...data } = c;
    await db.collection("campaigns").doc(id).set(data);
    console.log(`  Campaign ${id}: "${c.title}"`);
  }

  // 3. Seed Submissions (convert ISO string to Firestore Timestamp)
  console.log("Seeding submissions (converting ISO string to Timestamp)...");
  for (const s of seed.submissions) {
    const { id, createdAt, ...data } = s;
    const timestamp = admin.firestore.Timestamp.fromDate(new Date(createdAt));
    
    await db.collection("submissions").doc(id).set({
      ...data,
      createdAt: timestamp,
    });
    console.log(`  Submission ${id}: status=${s.status}, createdAt=${createdAt}`);
  }

  console.log("✅ Seed completed successfully!");
}

runSeed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

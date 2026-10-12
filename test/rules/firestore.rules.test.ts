import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";
import * as path from "path";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const PROJECT_ID = "demo-nex";

describe("Firestore Security Rules", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const rules = fs.readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8");
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: "127.0.0.1",
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();

    // Setup base seed data directly bypassing rules
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      // Seed campaigns
      await setDoc(doc(db, "campaigns/camp-bkk"), {
        title: "Bangkok Riverside Hotel",
        status: "open",
        ratePerVideoTHB: 500,
      });
      await setDoc(doc(db, "campaigns/camp-closed"), {
        title: "Closed Campaign",
        status: "closed",
        ratePerVideoTHB: 500,
      });

      // Seed submissions
      await setDoc(doc(db, "submissions/s1"), {
        campaignId: "camp-bkk",
        creatorId: "creator-a",
        tiktokUrl: "https://www.tiktok.com/@a/video/7300000000000000001",
        status: "pending",
        createdAt: new Date(),
      });
      await setDoc(doc(db, "submissions/s2"), {
        campaignId: "camp-bkk",
        creatorId: "creator-b",
        tiktokUrl: "https://www.tiktok.com/@b/video/7300000000000000002",
        status: "pending",
        createdAt: new Date(),
      });

      // Seed auditLogs
      await setDoc(doc(db, "auditLogs/log1"), {
        submissionId: "s1",
        actorUid: "ops-1",
        action: "approve",
        from: "pending",
        to: "approved",
      });
    });
  });

  // A1: creator-a create submission miliknya, status 'pending', URL valid, campaign open -> ALLOW
  it("A1: creator-a can create valid submission for own creatorId on open campaign", async () => {
    const creatorDb = testEnv.authenticatedContext("creator-a").firestore();
    const subRef = doc(creatorDb, "submissions/new-sub");
    await assertSucceeds(
      setDoc(subRef, {
        campaignId: "camp-bkk",
        creatorId: "creator-a",
        tiktokUrl: "https://www.tiktok.com/@a/video/7300000000000000099",
        status: "pending",
        createdAt: serverTimestamp(),
      })
    );
  });

  // A2: creator-a create dengan creatorId = creator-b -> DENY
  it("A2: creator-a cannot create submission with another creatorId", async () => {
    const creatorDb = testEnv.authenticatedContext("creator-a").firestore();
    const subRef = doc(creatorDb, "submissions/new-sub-b");
    await assertFails(
      setDoc(subRef, {
        campaignId: "camp-bkk",
        creatorId: "creator-b",
        tiktokUrl: "https://www.tiktok.com/@b/video/7300000000000000099",
        status: "pending",
        createdAt: serverTimestamp(),
      })
    );
  });

  // A3: creator-a create dengan status: 'approved' -> DENY
  it("A3: creator-a cannot create submission with status 'approved'", async () => {
    const creatorDb = testEnv.authenticatedContext("creator-a").firestore();
    const subRef = doc(creatorDb, "submissions/new-sub");
    await assertFails(
      setDoc(subRef, {
        campaignId: "camp-bkk",
        creatorId: "creator-a",
        tiktokUrl: "https://www.tiktok.com/@a/video/7300000000000000099",
        status: "approved",
        createdAt: serverTimestamp(),
      })
    );
  });

  // A4: creator-a update submission miliknya (status -> approved) -> DENY
  it("A4: creator-a cannot update submission", async () => {
    const creatorDb = testEnv.authenticatedContext("creator-a").firestore();
    const subRef = doc(creatorDb, "submissions/s1");
    await assertFails(
      updateDoc(subRef, {
        status: "approved",
      })
    );
  });

  // A5: creator-a read s2 (milik creator-b) -> DENY
  it("A5: creator-a cannot read submission belonging to creator-b", async () => {
    const creatorDb = testEnv.authenticatedContext("creator-a").firestore();
    const subRef = doc(creatorDb, "submissions/s2");
    await assertFails(getDoc(subRef));
  });

  // A6: creator-a read s1 (miliknya) -> ALLOW
  it("A6: creator-a can read own submission", async () => {
    const creatorDb = testEnv.authenticatedContext("creator-a").firestore();
    const subRef = doc(creatorDb, "submissions/s1");
    await assertSucceeds(getDoc(subRef));
  });

  // A7: ops-1 read s2, auditLogs -> ALLOW
  it("A7: ops-1 (with ops claim) can read any submission and auditLogs", async () => {
    const opsDb = testEnv.authenticatedContext("ops-1", { ops: true }).firestore();
    await assertSucceeds(getDoc(doc(opsDb, "submissions/s2")));
    await assertSucceeds(getDoc(doc(opsDb, "auditLogs/log1")));
  });

  // A8: ops-1 write langsung ke submissions -> DENY
  it("A8: ops-1 cannot write directly to submissions", async () => {
    const opsDb = testEnv.authenticatedContext("ops-1", { ops: true }).firestore();
    await assertFails(
      updateDoc(doc(opsDb, "submissions/s1"), {
        status: "approved",
      })
    );
  });

  // A9: tanpa login read/create -> DENY
  it("A9: unauthenticated client cannot read or create submissions", async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthDb, "submissions/s1")));
    await assertFails(
      setDoc(doc(unauthDb, "submissions/anon"), {
        campaignId: "camp-bkk",
        creatorId: "creator-a",
        tiktokUrl: "https://www.tiktok.com/@a/video/7300000000000000001",
        status: "pending",
        createdAt: serverTimestamp(),
      })
    );
  });

  // A10: URL https://tiktok.com.evil.com/x -> DENY
  it("A10: invalid tiktok domain (tiktok.com.evil.com) is denied", async () => {
    const creatorDb = testEnv.authenticatedContext("creator-a").firestore();
    const subRef = doc(creatorDb, "submissions/fake-url");
    await assertFails(
      setDoc(subRef, {
        campaignId: "camp-bkk",
        creatorId: "creator-a",
        tiktokUrl: "https://tiktok.com.evil.com/x",
        status: "pending",
        createdAt: serverTimestamp(),
      })
    );
  });

  // A11: URL short link https://vm.tiktok.com/ZSabc123/ -> ALLOW
  it("A11: short link vm.tiktok.com is allowed", async () => {
    const creatorDb = testEnv.authenticatedContext("creator-a").firestore();
    const subRef = doc(creatorDb, "submissions/short-link");
    await assertSucceeds(
      setDoc(subRef, {
        campaignId: "camp-bkk",
        creatorId: "creator-a",
        tiktokUrl: "https://vm.tiktok.com/ZSabc123/",
        status: "pending",
        createdAt: serverTimestamp(),
      })
    );
  });

  // A12: field ekstra (isAdmin: true) pada create -> DENY
  it("A12: extra fields in submission create are denied", async () => {
    const creatorDb = testEnv.authenticatedContext("creator-a").firestore();
    const subRef = doc(creatorDb, "submissions/extra-field");
    await assertFails(
      setDoc(subRef, {
        campaignId: "camp-bkk",
        creatorId: "creator-a",
        tiktokUrl: "https://www.tiktok.com/@a/video/7300000000000000099",
        status: "pending",
        createdAt: serverTimestamp(),
        isAdmin: true,
      })
    );
  });

  // A13: create ke campaign closed / tidak ada -> DENY
  it("A13: creating submission to closed or non-existent campaign is denied", async () => {
    const creatorDb = testEnv.authenticatedContext("creator-a").firestore();
    
    // Closed campaign
    await assertFails(
      setDoc(doc(creatorDb, "submissions/sub-closed"), {
        campaignId: "camp-closed",
        creatorId: "creator-a",
        tiktokUrl: "https://www.tiktok.com/@a/video/7300000000000000099",
        status: "pending",
        createdAt: serverTimestamp(),
      })
    );

    // Non-existent campaign
    await assertFails(
      setDoc(doc(creatorDb, "submissions/sub-nonexistent"), {
        campaignId: "camp-does-not-exist",
        creatorId: "creator-a",
        tiktokUrl: "https://www.tiktok.com/@a/video/7300000000000000099",
        status: "pending",
        createdAt: serverTimestamp(),
      })
    );
  });

  // A14: koleksi tak dikenal -> DENY
  it("A14: access to unknown collection is denied", async () => {
    const opsDb = testEnv.authenticatedContext("ops-1", { ops: true }).firestore();
    await assertFails(getDoc(doc(opsDb, "secrets/key1")));
  });
});

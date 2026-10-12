import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
import * as admin from "firebase-admin";

const PROJECT_ID = "demo-nex";

if (!admin.apps.length) {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  admin.initializeApp({ projectId: PROJECT_ID });
}
const adminDb = admin.firestore();
const adminAuth = admin.auth();

const clientApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      projectId: PROJECT_ID,
      apiKey: "fake-api-key",
      authDomain: `${PROJECT_ID}.firebaseapp.com`,
    });

const auth = getAuth(clientApp);
const functions = getFunctions(clientApp);

try {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
} catch {}
try {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
} catch {}

function getErrorCode(err: any): string {
  return (err && (err.code || err.message)) || "";
}

describe("Callables Integration Tests (B1 - B12)", () => {
  beforeAll(async () => {
    // Ensure test users exist in auth emulator
    for (const u of [
      { uid: "ops-1", email: "ops1@nex.test", role: "ops" },
      { uid: "creator-a", email: "creator.a@nex.test", role: "creator" },
    ]) {
      try {
        await adminAuth.getUser(u.uid);
      } catch {
        await adminAuth.createUser({
          uid: u.uid,
          email: u.email,
          password: "password123",
        });
      }
      await adminAuth.setCustomUserClaims(u.uid, { ops: u.role === "ops" });
    }
  });

  beforeEach(async () => {
    await signOut(auth);

    // Reset submissions and auditLogs in firestore
    const subSnap = await adminDb.collection("submissions").get();
    for (const doc of subSnap.docs) {
      await doc.ref.delete();
    }
    const auditSnap = await adminDb.collection("auditLogs").get();
    for (const doc of auditSnap.docs) {
      await doc.ref.delete();
    }

    // Seed baseline submissions
    await adminDb.collection("submissions").doc("s1").set({
      campaignId: "camp-bkk",
      creatorId: "creator-a",
      tiktokUrl: "https://www.tiktok.com/@a/video/7300000000000000001",
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await adminDb.collection("submissions").doc("s2").set({
      campaignId: "camp-bkk",
      creatorId: "creator-b",
      tiktokUrl: "https://www.tiktok.com/@b/video/7300000000000000002",
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await adminDb.collection("submissions").doc("s3").set({
      campaignId: "camp-pkt",
      creatorId: "creator-a",
      tiktokUrl: "https://vm.tiktok.com/ZSabc123/",
      status: "approved",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await adminDb.collection("submissions").doc("s5").set({
      campaignId: "camp-bkk",
      creatorId: "creator-a",
      tiktokUrl: "https://www.tiktok.com/@a/video/7300000000000000005",
      status: "rejected",
      reason: "Hotel not visible",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  // B1: non-ops memanggil reviewSubmission -> permission-denied
  it("B1: non-ops caller gets permission-denied", async () => {
    await signInWithEmailAndPassword(auth, "creator.a@nex.test", "password123");
    const reviewFn = httpsCallable(functions, "reviewSubmission");

    try {
      await reviewFn({ id: "s1", decision: "approved" });
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(getErrorCode(err)).toMatch(/permission-denied/);
    }
  });

  // B2: tanpa auth -> unauthenticated
  it("B2: unauthenticated caller gets unauthenticated", async () => {
    const reviewFn = httpsCallable(functions, "reviewSubmission");
    try {
      await reviewFn({ id: "s1", decision: "approved" });
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(getErrorCode(err)).toMatch(/unauthenticated/);
    }
  });

  // B3: s1 approve oleh ops -> approved, 1 auditLog
  it("B3: ops approves s1 -> approved status, 1 auditLog", async () => {
    await signInWithEmailAndPassword(auth, "ops1@nex.test", "password123");
    const reviewFn = httpsCallable<any, any>(functions, "reviewSubmission");

    const res = await reviewFn({ id: "s1", decision: "approved" });
    expect(res.data).toEqual({ ok: true, changed: true, status: "approved" });

    const docSnap = await adminDb.collection("submissions").doc("s1").get();
    expect(docSnap.data()?.status).toBe("approved");
    expect(docSnap.data()?.reviewedBy).toBe("ops-1");

    const audits = await adminDb
      .collection("auditLogs")
      .where("submissionId", "==", "s1")
      .get();
    expect(audits.size).toBe(1);
    expect(audits.docs[0].data()).toMatchObject({
      submissionId: "s1",
      actorUid: "ops-1",
      action: "approve",
      from: "pending",
      to: "approved",
    });
  });

  // B4: s1 approve lagi -> ok, changed:false, auditLog tetap 1 (idempoten)
  it("B4: duplicate approve is idempotent (changed:false, auditLog count unchanged)", async () => {
    await signInWithEmailAndPassword(auth, "ops1@nex.test", "password123");
    const reviewFn = httpsCallable<any, any>(functions, "reviewSubmission");

    await reviewFn({ id: "s1", decision: "approved" });
    const res2 = await reviewFn({ id: "s1", decision: "approved" });
    expect(res2.data).toEqual({ ok: true, changed: false, status: "approved" });

    const audits = await adminDb
      .collection("auditLogs")
      .where("submissionId", "==", "s1")
      .get();
    expect(audits.size).toBe(1);
  });

  // B5: s2 reject tanpa reason / reason spasi -> invalid-argument
  it("B5: reject without reason or whitespace reason returns invalid-argument or failed-precondition", async () => {
    await signInWithEmailAndPassword(auth, "ops1@nex.test", "password123");
    const reviewFn = httpsCallable(functions, "reviewSubmission");

    try {
      await reviewFn({ id: "s2", decision: "rejected" });
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(getErrorCode(err)).toMatch(/failed-precondition|invalid-argument/);
    }

    try {
      await reviewFn({ id: "s2", decision: "rejected", reason: "   " });
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(getErrorCode(err)).toMatch(/failed-precondition|invalid-argument/);
    }
  });

  // B6: s2 reject dengan reason -> rejected, 1 auditLog
  it("B6: reject with valid reason transitions to rejected and writes auditLog", async () => {
    await signInWithEmailAndPassword(auth, "ops1@nex.test", "password123");
    const reviewFn = httpsCallable<any, any>(functions, "reviewSubmission");

    const res = await reviewFn({
      id: "s2",
      decision: "rejected",
      reason: "Bad video quality",
    });
    expect(res.data).toEqual({ ok: true, changed: true, status: "rejected" });

    const docSnap = await adminDb.collection("submissions").doc("s2").get();
    expect(docSnap.data()?.status).toBe("rejected");
    expect(docSnap.data()?.reason).toBe("Bad video quality");

    const audits = await adminDb
      .collection("auditLogs")
      .where("submissionId", "==", "s2")
      .get();
    expect(audits.size).toBe(1);
    expect(audits.docs[0].data()).toMatchObject({
      submissionId: "s2",
      action: "reject",
      reason: "Bad video quality",
    });
  });

  // B7: s5 (rejected) di-approve -> failed-precondition
  it("B7: approving already rejected submission throws failed-precondition", async () => {
    await signInWithEmailAndPassword(auth, "ops1@nex.test", "password123");
    const reviewFn = httpsCallable(functions, "reviewSubmission");

    try {
      await reviewFn({ id: "s5", decision: "approved" });
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(getErrorCode(err)).toMatch(/failed-precondition/);
    }
  });

  // B8: s3 markPaid -> paid; ulang -> paid, changed: false
  it("B8: markPaid transitions approved -> paid; repeat is idempotent", async () => {
    await signInWithEmailAndPassword(auth, "ops1@nex.test", "password123");
    const markPaidFn = httpsCallable<any, any>(functions, "markPaid");

    const res1 = await markPaidFn({ id: "s3" });
    expect(res1.data).toEqual({ ok: true, changed: true, status: "paid" });

    const res2 = await markPaidFn({ id: "s3" });
    expect(res2.data).toEqual({ ok: true, changed: false, status: "paid" });

    const audits = await adminDb
      .collection("auditLogs")
      .where("submissionId", "==", "s3")
      .get();
    expect(audits.size).toBe(1);
  });

  // B9: markPaid pada pending (s1 sebelum approve) -> failed-precondition
  it("B9: markPaid on pending submission throws failed-precondition", async () => {
    await signInWithEmailAndPassword(auth, "ops1@nex.test", "password123");
    const markPaidFn = httpsCallable(functions, "markPaid");

    try {
      await markPaidFn({ id: "s1" });
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(getErrorCode(err)).toMatch(/failed-precondition/);
    }
  });

  // B10: 10 approve paralel pada submission pending -> tepat 1 changed:true, 1 auditLog
  it("B10: 10 concurrent approve calls produce exactly 1 changed:true and 1 auditLog", async () => {
    await signInWithEmailAndPassword(auth, "ops1@nex.test", "password123");
    const reviewFn = httpsCallable<any, any>(functions, "reviewSubmission");

    const promises = Array.from({ length: 10 }, () =>
      reviewFn({ id: "s1", decision: "approved" })
    );

    const results = await Promise.all(promises);
    const changedCount = results.filter((r) => r.data.changed === true).length;
    const noopCount = results.filter((r) => r.data.changed === false).length;

    expect(changedCount).toBe(1);
    expect(noopCount).toBe(9);

    const audits = await adminDb
      .collection("auditLogs")
      .where("submissionId", "==", "s1")
      .get();
    expect(audits.size).toBe(1);
  }, 15000);

  // B11: approve vs reject paralel -> 1 menang, 1 failed-precondition
  it("B11: concurrent approve vs reject -> exactly 1 succeeds, 1 fails with precondition", async () => {
    await signInWithEmailAndPassword(auth, "ops1@nex.test", "password123");
    const reviewFn = httpsCallable<any, any>(functions, "reviewSubmission");

    const pApprove = reviewFn({ id: "s1", decision: "approved" })
      .then((r) => ({ type: "approve", data: r.data }))
      .catch((err) => ({ type: "approve", error: err }));

    const pReject = reviewFn({
      id: "s1",
      decision: "rejected",
      reason: "Concurrent reject",
    })
      .then((r) => ({ type: "reject", data: r.data }))
      .catch((err) => ({ type: "reject", error: err }));

    const [resApprove, resReject] = await Promise.all([pApprove, pReject]);

    const successCount =
      Number("data" in resApprove) + Number("data" in resReject);
    const errorCount =
      Number("error" in resApprove) + Number("error" in resReject);

    expect(successCount).toBe(1);
    expect(errorCount).toBe(1);

    const audits = await adminDb
      .collection("auditLogs")
      .where("submissionId", "==", "s1")
      .get();
    expect(audits.size).toBe(1);
  }, 15000);

  // B12: decision tidak dikenal / id tidak ada -> invalid-argument / not-found
  it("B12: unknown decision or non-existent id produces appropriate error", async () => {
    await signInWithEmailAndPassword(auth, "ops1@nex.test", "password123");
    const reviewFn = httpsCallable(functions, "reviewSubmission");

    try {
      await reviewFn({ id: "s1", decision: "invalid-status" as any });
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(getErrorCode(err)).toMatch(/invalid-argument/);
    }

    try {
      await reviewFn({ id: "non-existent-sub", decision: "approved" });
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(getErrorCode(err)).toMatch(/not-found/);
    }
  });
});

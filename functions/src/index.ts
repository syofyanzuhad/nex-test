import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { transitionSubmission, ActionType } from "./stateMachine";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface ReviewSubmissionData {
  id?: string;
  decision?: "approved" | "rejected";
  reason?: string;
}

interface MarkPaidData {
  id?: string;
}

/**
 * Callable: reviewSubmission
 * Mengapa callable + transaction:
 * - Otorisasi ketat token claim (ops == true) (R2.1)
 * - runTransaction atomik untuk read-then-write (R2.6, R2.7)
 * - Mencegah race condition ketika 2 ops mereview submission secara bersamaan
 */
export const reviewSubmission = onCall<ReviewSubmissionData>(async (request) => {
  // 1. Cek autentikasi
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // 2. Cek otorisasi ops claim (D2)
  if (request.auth.token.ops !== true) {
    throw new HttpsError("permission-denied", "User does not have ops privileges");
  }

  const { id, decision, reason } = request.data || {};

  // 3. Validasi argumen
  if (!id || typeof id !== "string") {
    throw new HttpsError("invalid-argument", "Valid submission 'id' is required");
  }

  if (decision !== "approved" && decision !== "rejected") {
    throw new HttpsError(
      "invalid-argument",
      "Decision must be either 'approved' or 'rejected'"
    );
  }

  const action: ActionType = decision === "approved" ? "approve" : "reject";

  // 4. Firestore Transaction
  const submissionRef = db.collection("submissions").doc(id);

  return await db.runTransaction(async (transaction) => {
    const docSnap = await transaction.get(submissionRef);
    if (!docSnap.exists) {
      throw new HttpsError("not-found", `Submission '${id}' not found`);
    }

    const currentData = docSnap.data()!;
    const currentStatus = currentData.status;

    // Evaluasi transisi lewat pure state machine
    const transitionResult = transitionSubmission(currentStatus, {
      action,
      reason,
    });

    if (transitionResult.kind === "illegal") {
      throw new HttpsError("failed-precondition", transitionResult.message);
    }

    // Jika no-op (hasil akhir sudah tercapai): return changed: false tanpa auditLog baru (D4, R2.5)
    if (transitionResult.kind === "noop") {
      return {
        ok: true,
        changed: false,
        status: currentStatus,
      };
    }

    // Ada perubahan state (change):
    const updateData: Record<string, any> = {
      status: transitionResult.to,
      reviewedBy: request.auth?.uid,
      reviewedAt: FieldValue.serverTimestamp(),
    };

    if (transitionResult.to === "rejected" && transitionResult.reason) {
      updateData.reason = transitionResult.reason;
    }

    transaction.update(submissionRef, updateData);

    // Tulis auditLog di dalam transaksi yang sama (R2.7)
    const auditLogRef = db.collection("auditLogs").doc();
    transaction.set(auditLogRef, {
      submissionId: id,
      actorUid: request.auth?.uid,
      action,
      from: currentStatus,
      to: transitionResult.to,
      ...(transitionResult.reason ? { reason: transitionResult.reason } : {}),
      at: FieldValue.serverTimestamp(),
    });

    return {
      ok: true,
      changed: true,
      status: transitionResult.to,
    };
  });
});

/**
 * Callable: markPaid
 * Transisi status dari 'approved' -> 'paid'
 */
export const markPaid = onCall<MarkPaidData>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (request.auth.token.ops !== true) {
    throw new HttpsError("permission-denied", "User does not have ops privileges");
  }

  const { id } = request.data || {};

  if (!id || typeof id !== "string") {
    throw new HttpsError("invalid-argument", "Valid submission 'id' is required");
  }

  const submissionRef = db.collection("submissions").doc(id);

  return await db.runTransaction(async (transaction) => {
    const docSnap = await transaction.get(submissionRef);
    if (!docSnap.exists) {
      throw new HttpsError("not-found", `Submission '${id}' not found`);
    }

    const currentData = docSnap.data()!;
    const currentStatus = currentData.status;

    const transitionResult = transitionSubmission(currentStatus, {
      action: "markPaid",
    });

    if (transitionResult.kind === "illegal") {
      throw new HttpsError("failed-precondition", transitionResult.message);
    }

    if (transitionResult.kind === "noop") {
      return {
        ok: true,
        changed: false,
        status: currentStatus,
      };
    }

    transaction.update(submissionRef, {
      status: "paid",
      paidAt: FieldValue.serverTimestamp(),
    });

    const auditLogRef = db.collection("auditLogs").doc();
    transaction.set(auditLogRef, {
      submissionId: id,
      actorUid: request.auth?.uid,
      action: "markPaid",
      from: currentStatus,
      to: "paid",
      at: FieldValue.serverTimestamp(),
    });

    return {
      ok: true,
      changed: true,
      status: "paid",
    };
  });
});

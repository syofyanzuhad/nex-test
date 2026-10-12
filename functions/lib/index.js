"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markPaid = exports.reviewSubmission = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const stateMachine_1 = require("./stateMachine");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Callable: reviewSubmission
 * Mengapa callable + transaction:
 * - Otorisasi ketat token claim (ops == true) (R2.1)
 * - runTransaction atomik untuk read-then-write (R2.6, R2.7)
 * - Mencegah race condition ketika 2 ops mereview submission secara bersamaan
 */
exports.reviewSubmission = (0, https_1.onCall)(async (request) => {
    // 1. Cek autentikasi
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    // 2. Cek otorisasi ops claim (D2)
    if (request.auth.token.ops !== true) {
        throw new https_1.HttpsError("permission-denied", "User does not have ops privileges");
    }
    const { id, decision, reason } = request.data || {};
    // 3. Validasi argumen
    if (!id || typeof id !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Valid submission 'id' is required");
    }
    if (decision !== "approved" && decision !== "rejected") {
        throw new https_1.HttpsError("invalid-argument", "Decision must be either 'approved' or 'rejected'");
    }
    const action = decision === "approved" ? "approve" : "reject";
    // 4. Firestore Transaction
    const submissionRef = db.collection("submissions").doc(id);
    return await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(submissionRef);
        if (!docSnap.exists) {
            throw new https_1.HttpsError("not-found", `Submission '${id}' not found`);
        }
        const currentData = docSnap.data();
        const currentStatus = currentData.status;
        // Evaluasi transisi lewat pure state machine
        const transitionResult = (0, stateMachine_1.transitionSubmission)(currentStatus, {
            action,
            reason,
        });
        if (transitionResult.kind === "illegal") {
            throw new https_1.HttpsError("failed-precondition", transitionResult.message);
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
        const updateData = {
            status: transitionResult.to,
            reviewedBy: request.auth?.uid,
            reviewedAt: firestore_1.FieldValue.serverTimestamp(),
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
            at: firestore_1.FieldValue.serverTimestamp(),
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
exports.markPaid = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    if (request.auth.token.ops !== true) {
        throw new https_1.HttpsError("permission-denied", "User does not have ops privileges");
    }
    const { id } = request.data || {};
    if (!id || typeof id !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Valid submission 'id' is required");
    }
    const submissionRef = db.collection("submissions").doc(id);
    return await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(submissionRef);
        if (!docSnap.exists) {
            throw new https_1.HttpsError("not-found", `Submission '${id}' not found`);
        }
        const currentData = docSnap.data();
        const currentStatus = currentData.status;
        const transitionResult = (0, stateMachine_1.transitionSubmission)(currentStatus, {
            action: "markPaid",
        });
        if (transitionResult.kind === "illegal") {
            throw new https_1.HttpsError("failed-precondition", transitionResult.message);
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
            paidAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const auditLogRef = db.collection("auditLogs").doc();
        transaction.set(auditLogRef, {
            submissionId: id,
            actorUid: request.auth?.uid,
            action: "markPaid",
            from: currentStatus,
            to: "paid",
            at: firestore_1.FieldValue.serverTimestamp(),
        });
        return {
            ok: true,
            changed: true,
            status: "paid",
        };
    });
});
//# sourceMappingURL=index.js.map
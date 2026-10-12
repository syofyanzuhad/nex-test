"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const stateMachine_1 = require("./stateMachine");
(0, vitest_1.describe)("State Machine - pure transitionSubmission logic", () => {
    (0, vitest_1.it)("pending -> approve transitions to approved", () => {
        const res = (0, stateMachine_1.transitionSubmission)("pending", { action: "approve" });
        (0, vitest_1.expect)(res).toEqual({ kind: "change", to: "approved" });
    });
    (0, vitest_1.it)("approved -> approve is noop", () => {
        const res = (0, stateMachine_1.transitionSubmission)("approved", { action: "approve" });
        (0, vitest_1.expect)(res).toEqual({ kind: "noop", current: "approved" });
    });
    (0, vitest_1.it)("rejected -> approve is illegal", () => {
        const res = (0, stateMachine_1.transitionSubmission)("rejected", { action: "approve" });
        (0, vitest_1.expect)(res.kind).toBe("illegal");
    });
    (0, vitest_1.it)("paid -> approve is illegal", () => {
        const res = (0, stateMachine_1.transitionSubmission)("paid", { action: "approve" });
        (0, vitest_1.expect)(res.kind).toBe("illegal");
    });
    (0, vitest_1.it)("pending -> reject with valid reason transitions to rejected", () => {
        const res = (0, stateMachine_1.transitionSubmission)("pending", {
            action: "reject",
            reason: " Video quality low ",
        });
        (0, vitest_1.expect)(res).toEqual({
            kind: "change",
            to: "rejected",
            reason: "Video quality low",
        });
    });
    (0, vitest_1.it)("pending -> reject without reason or empty reason is illegal", () => {
        const res1 = (0, stateMachine_1.transitionSubmission)("pending", { action: "reject" });
        (0, vitest_1.expect)(res1.kind).toBe("illegal");
        const res2 = (0, stateMachine_1.transitionSubmission)("pending", {
            action: "reject",
            reason: "   ",
        });
        (0, vitest_1.expect)(res2.kind).toBe("illegal");
    });
    (0, vitest_1.it)("pending -> reject with reason > 500 chars is illegal", () => {
        const res = (0, stateMachine_1.transitionSubmission)("pending", {
            action: "reject",
            reason: "a".repeat(501),
        });
        (0, vitest_1.expect)(res.kind).toBe("illegal");
    });
    (0, vitest_1.it)("rejected -> reject is noop", () => {
        const res = (0, stateMachine_1.transitionSubmission)("rejected", {
            action: "reject",
            reason: "any",
        });
        (0, vitest_1.expect)(res).toEqual({ kind: "noop", current: "rejected" });
    });
    (0, vitest_1.it)("approved -> reject is illegal", () => {
        const res = (0, stateMachine_1.transitionSubmission)("approved", {
            action: "reject",
            reason: "reason",
        });
        (0, vitest_1.expect)(res.kind).toBe("illegal");
    });
    (0, vitest_1.it)("approved -> markPaid transitions to paid", () => {
        const res = (0, stateMachine_1.transitionSubmission)("approved", { action: "markPaid" });
        (0, vitest_1.expect)(res).toEqual({ kind: "change", to: "paid" });
    });
    (0, vitest_1.it)("paid -> markPaid is noop", () => {
        const res = (0, stateMachine_1.transitionSubmission)("paid", { action: "markPaid" });
        (0, vitest_1.expect)(res).toEqual({ kind: "noop", current: "paid" });
    });
    (0, vitest_1.it)("pending -> markPaid is illegal", () => {
        const res = (0, stateMachine_1.transitionSubmission)("pending", { action: "markPaid" });
        (0, vitest_1.expect)(res.kind).toBe("illegal");
    });
    (0, vitest_1.it)("rejected -> markPaid is illegal", () => {
        const res = (0, stateMachine_1.transitionSubmission)("rejected", { action: "markPaid" });
        (0, vitest_1.expect)(res.kind).toBe("illegal");
    });
});
//# sourceMappingURL=stateMachine.test.js.map
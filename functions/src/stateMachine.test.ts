import { describe, it, expect } from "vitest";
import { transitionSubmission } from "./stateMachine";

describe("State Machine - pure transitionSubmission logic", () => {
  it("pending -> approve transitions to approved", () => {
    const res = transitionSubmission("pending", { action: "approve" });
    expect(res).toEqual({ kind: "change", to: "approved" });
  });

  it("approved -> approve is noop", () => {
    const res = transitionSubmission("approved", { action: "approve" });
    expect(res).toEqual({ kind: "noop", current: "approved" });
  });

  it("rejected -> approve is illegal", () => {
    const res = transitionSubmission("rejected", { action: "approve" });
    expect(res.kind).toBe("illegal");
  });

  it("paid -> approve is illegal", () => {
    const res = transitionSubmission("paid", { action: "approve" });
    expect(res.kind).toBe("illegal");
  });

  it("pending -> reject with valid reason transitions to rejected", () => {
    const res = transitionSubmission("pending", {
      action: "reject",
      reason: " Video quality low ",
    });
    expect(res).toEqual({
      kind: "change",
      to: "rejected",
      reason: "Video quality low",
    });
  });

  it("pending -> reject without reason or empty reason is illegal", () => {
    const res1 = transitionSubmission("pending", { action: "reject" });
    expect(res1.kind).toBe("illegal");

    const res2 = transitionSubmission("pending", {
      action: "reject",
      reason: "   ",
    });
    expect(res2.kind).toBe("illegal");
  });

  it("pending -> reject with reason > 500 chars is illegal", () => {
    const res = transitionSubmission("pending", {
      action: "reject",
      reason: "a".repeat(501),
    });
    expect(res.kind).toBe("illegal");
  });

  it("rejected -> reject is noop", () => {
    const res = transitionSubmission("rejected", {
      action: "reject",
      reason: "any",
    });
    expect(res).toEqual({ kind: "noop", current: "rejected" });
  });

  it("approved -> reject is illegal", () => {
    const res = transitionSubmission("approved", {
      action: "reject",
      reason: "reason",
    });
    expect(res.kind).toBe("illegal");
  });

  it("approved -> markPaid transitions to paid", () => {
    const res = transitionSubmission("approved", { action: "markPaid" });
    expect(res).toEqual({ kind: "change", to: "paid" });
  });

  it("paid -> markPaid is noop", () => {
    const res = transitionSubmission("paid", { action: "markPaid" });
    expect(res).toEqual({ kind: "noop", current: "paid" });
  });

  it("pending -> markPaid is illegal", () => {
    const res = transitionSubmission("pending", { action: "markPaid" });
    expect(res.kind).toBe("illegal");
  });

  it("rejected -> markPaid is illegal", () => {
    const res = transitionSubmission("rejected", { action: "markPaid" });
    expect(res.kind).toBe("illegal");
  });
});

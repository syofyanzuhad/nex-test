export type SubmissionStatus = "pending" | "approved" | "rejected" | "paid";

export type ActionType = "approve" | "reject" | "markPaid";

export interface TransitionAction {
  action: ActionType;
  reason?: string;
}

export type TransitionResult =
  | { kind: "change"; to: SubmissionStatus; reason?: string }
  | { kind: "noop"; current: SubmissionStatus }
  | { kind: "illegal"; message: string };

/**
 * Pure state machine function for submission lifecycle transitions (D4)
 * Transitions table:
 * | from \ action | approve          | reject               | markPaid         |
 * | pending       | -> approved      | -> rejected (reason) | ILLEGAL          |
 * | approved      | NOOP             | ILLEGAL              | -> paid          |
 * | rejected      | ILLEGAL          | NOOP                 | ILLEGAL          |
 * | paid          | ILLEGAL          | ILLEGAL              | NOOP             |
 */
export function transitionSubmission(
  current: SubmissionStatus,
  transition: TransitionAction
): TransitionResult {
  const { action, reason } = transition;

  switch (action) {
    case "approve":
      if (current === "approved") {
        return { kind: "noop", current };
      }
      if (current === "pending") {
        return { kind: "change", to: "approved" };
      }
      return {
        kind: "illegal",
        message: `Cannot approve submission with status '${current}'`,
      };

    case "reject":
      // Validasi reason: wajib non-empty string trimmed, max 500 chars (R2.3)
      if (current === "rejected") {
        return { kind: "noop", current };
      }
      if (current === "pending") {
        const trimmed = (reason || "").trim();
        if (!trimmed) {
          return {
            kind: "illegal",
            message: "Reason is required when rejecting a submission",
          };
        }
        if (trimmed.length > 500) {
          return {
            kind: "illegal",
            message: "Reason cannot exceed 500 characters",
          };
        }
        return { kind: "change", to: "rejected", reason: trimmed };
      }
      return {
        kind: "illegal",
        message: `Cannot reject submission with status '${current}'`,
      };

    case "markPaid":
      if (current === "paid") {
        return { kind: "noop", current };
      }
      if (current === "approved") {
        return { kind: "change", to: "paid" };
      }
      return {
        kind: "illegal",
        message: `Cannot mark paid for submission with status '${current}'. Only 'approved' can be marked paid.`,
      };

    default:
      return {
        kind: "illegal",
        message: `Unknown action '${action}'`,
      };
  }
}

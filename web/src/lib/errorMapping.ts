/**
 * Maps Firebase / Functions / Rules error codes to i18n keys or translated text (R3.3, R5.1).
 * Never shows raw internal stack traces.
 */
export function mapFirebaseError(err: any, t?: (key: string, params?: any) => string): string {
  const translate = t || ((k: string, p?: any) => {
    if (p && p.message) return `${k}: ${p.message}`;
    return k;
  });

  if (!err) return translate("errors.unexpected");

  const message = err.message || "";
  const code = err.code || "";

  // Common Callable HttpsErrors
  if (code.includes("permission-denied") || message.includes("permission-denied")) {
    return translate("errors.permissionDenied");
  }
  if (code.includes("unauthenticated") || message.includes("unauthenticated")) {
    return translate("errors.unauthenticated");
  }
  if (code.includes("failed-precondition") || message.includes("failed-precondition")) {
    if (message.includes("Cannot approve")) {
      return translate("errors.cannotApproveNotPending");
    }
    if (message.includes("Cannot reject")) {
      return translate("errors.cannotRejectNotPending");
    }
    if (message.includes("Reason is required")) {
      return translate("errors.rejectReasonRequired");
    }
    if (message.includes("Only 'approved' can be marked paid")) {
      return translate("errors.onlyApprovedCanBePaid");
    }
    return translate("errors.actionNotPermitted", { message: message.replace(/^FirebaseError:\s*/, "") });
  }
  if (code.includes("invalid-argument") || message.includes("invalid-argument")) {
    return translate("errors.invalidInput");
  }
  if (code.includes("not-found") || message.includes("not-found")) {
    return translate("errors.recordNotFound");
  }

  // Firestore security rules errors
  if (code.includes("permission-denied") || message.includes("PERMISSION_DENIED")) {
    return translate("errors.rulesDenied");
  }

  // Network / server offline
  if (code.includes("unavailable") || message.includes("Failed to fetch") || message.includes("network")) {
    return translate("errors.serviceUnavailable");
  }

  return message || translate("errors.unexpected");
}

/**
 * Maps Firebase / Functions / Rules error codes to human-readable strings (R3.3).
 * Never shows raw internal stack traces.
 */
export function mapFirebaseError(err: any): string {
  if (!err) return "An unexpected error occurred.";

  const message = err.message || "";
  const code = err.code || "";

  // Common Callable HttpsErrors
  if (code.includes("permission-denied") || message.includes("permission-denied")) {
    return "Permission denied. You do not have permission to perform this action.";
  }
  if (code.includes("unauthenticated") || message.includes("unauthenticated")) {
    return "You are not logged in. Please sign in to continue.";
  }
  if (code.includes("failed-precondition") || message.includes("failed-precondition")) {
    // If the message contains our clean business rule error:
    if (message.includes("Cannot approve")) {
      return "Cannot approve: this submission is not in pending status.";
    }
    if (message.includes("Cannot reject")) {
      return "Cannot reject: this submission is not in pending status.";
    }
    if (message.includes("Reason is required")) {
      return "Rejection requires a non-empty reason.";
    }
    if (message.includes("Only 'approved' can be marked paid")) {
      return "Only approved submissions can be marked paid.";
    }
    return `Action not permitted: ${message.replace(/^FirebaseError:\s*/, "")}`;
  }
  if (code.includes("invalid-argument") || message.includes("invalid-argument")) {
    return "Invalid input provided. Please verify the submitted information.";
  }
  if (code.includes("not-found") || message.includes("not-found")) {
    return "The requested record was not found.";
  }

  // Firestore security rules errors
  if (code.includes("permission-denied") || message.includes("PERMISSION_DENIED")) {
    return "Request denied by security rules. Ensure the campaign is open and you are submitting with your own account.";
  }

  // Network / server offline
  if (code.includes("unavailable") || message.includes("Failed to fetch") || message.includes("network")) {
    return "Service unavailable. Please ensure Firebase emulators are running.";
  }

  return message || "An unknown error occurred.";
}

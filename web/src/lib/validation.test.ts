import { describe, it, expect } from "vitest";
import { validateTiktokUrl } from "./validation";
import { mapFirebaseError } from "./errorMapping";

describe("Web Pure Helpers - validation and error mapping", () => {
  it("validates valid tiktok URLs", () => {
    expect(validateTiktokUrl("https://www.tiktok.com/@somchai/video/7300000000000000001").valid).toBe(true);
    expect(validateTiktokUrl("https://tiktok.com/@somchai/video/7300000000000000001").valid).toBe(true);
    expect(validateTiktokUrl("https://vm.tiktok.com/ZSabc123/").valid).toBe(true);
    expect(validateTiktokUrl("https://vt.tiktok.com/ZSabc123/").valid).toBe(true);
  });

  it("rejects invalid or spoofed URLs", () => {
    expect(validateTiktokUrl("").valid).toBe(false);
    expect(validateTiktokUrl("https://tiktok.com.evil.com/x").valid).toBe(false);
    expect(validateTiktokUrl("https://evil.com/tiktok.com/").valid).toBe(false);
    expect(validateTiktokUrl("http://vm.tiktok.com/ZSabc123/").valid).toBe(false);
  });

  it("maps error codes to readable human messages", () => {
    expect(mapFirebaseError({ code: "permission-denied" })).toContain("Permission denied");
    expect(mapFirebaseError({ code: "unauthenticated" })).toContain("not logged in");
    expect(mapFirebaseError({ code: "failed-precondition", message: "Cannot approve submission with status 'rejected'" })).toContain("not in pending status");
    expect(mapFirebaseError({ code: "unavailable" })).toContain("Service unavailable");
  });
});

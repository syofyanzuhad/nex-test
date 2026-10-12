import { describe, it, expect } from "vitest";
import { validateTiktokUrl } from "./validation";
import { mapFirebaseError } from "./errorMapping";
import enJson from "../i18n/en.json";

function mockT(key: string, params?: any): string {
  const parts = key.split(".");
  let cur: any = enJson;
  for (const p of parts) {
    if (cur && p in cur) cur = cur[p];
  }
  let str = typeof cur === "string" ? cur : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}

describe("Web Pure Helpers - validation and error mapping (with i18n)", () => {
  it("validates valid tiktok URLs", () => {
    expect(validateTiktokUrl("https://www.tiktok.com/@somchai/video/7300000000000000001", mockT).valid).toBe(true);
    expect(validateTiktokUrl("https://tiktok.com/@somchai/video/7300000000000000001", mockT).valid).toBe(true);
    expect(validateTiktokUrl("https://vm.tiktok.com/ZSabc123/", mockT).valid).toBe(true);
    expect(validateTiktokUrl("https://vt.tiktok.com/ZSabc123/", mockT).valid).toBe(true);
  });

  it("rejects invalid or spoofed URLs with translated message", () => {
    expect(validateTiktokUrl("", mockT).error).toBe("TikTok URL is required");
    expect(validateTiktokUrl("https://tiktok.com.evil.com/x", mockT).valid).toBe(false);
    expect(validateTiktokUrl("https://evil.com/tiktok.com/", mockT).valid).toBe(false);
  });

  it("maps error codes to translated human messages", () => {
    expect(mapFirebaseError({ code: "permission-denied" }, mockT)).toContain("Permission denied");
    expect(mapFirebaseError({ code: "unauthenticated" }, mockT)).toContain("not logged in");
    expect(mapFirebaseError({ code: "failed-precondition", message: "Cannot approve submission with status 'rejected'" }, mockT)).toContain("not in pending status");
    expect(mapFirebaseError({ code: "unavailable" }, mockT)).toContain("Service unavailable");
  });
});

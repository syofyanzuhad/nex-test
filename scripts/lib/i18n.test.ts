import { describe, it, expect } from "vitest";
import { flattenKeys, diffI18nDictionaries } from "./i18n";

describe("i18n pure helpers (scripts/lib/i18n.ts)", () => {
  it("flattens nested object keys into dot notation", () => {
    const dict = {
      app: {
        title: "Hello",
        actions: {
          save: "Save",
        },
      },
      common: "Common",
    };
    const flat = flattenKeys(dict);
    expect(flat).toEqual({
      "app.title": "Hello",
      "app.actions.save": "Save",
      common: "Common",
    });
  });

  it("diffs dictionaries two-ways accurately", () => {
    const en = {
      welcome: "Welcome",
      actions: { submit: "Submit", cancel: "Cancel" },
    };
    const th = {
      welcome: "ยินดีต้อนรับ",
      actions: { submit: "ส่ง" },
      extraThOnly: "ส่วนเกิน",
    };

    const diff = diffI18nDictionaries(en, th);
    expect(diff.synchronized).toBe(false);
    expect(diff.missingInTh).toEqual(["actions.cancel"]);
    expect(diff.missingInEn).toEqual(["extraThOnly"]);
  });
});

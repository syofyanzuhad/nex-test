import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { validateCreatorsCsv } from "./creators";

describe("Creators CSV Validation (scripts/lib/creators.ts)", () => {
  it("processes data/creators-messy.csv matching exact expectations (TEST-PLAN Section C)", () => {
    const csvPath = path.resolve(__dirname, "../../data/creators-messy.csv");
    const rawCsv = fs.readFileSync(csvPath, "utf8");

    const { valid, errors } = validateCreatorsCsv(rawCsv);

    // Expected: 3 valid (rows 2, 3, 4), 4 errors (rows 5, 6, 7, 8)
    expect(valid.length).toBe(3);
    expect(errors.length).toBe(4);

    // Line 2: Somchai Jaidee
    expect(valid[0].lineNumber).toBe(2);
    expect(valid[0].name).toBe("Somchai Jaidee");
    expect(valid[0].email).toBe("somchai@example.com");

    // Line 3: "Nguyen, Linh"
    expect(valid[1].lineNumber).toBe(3);
    expect(valid[1].name).toBe("Nguyen, Linh");
    expect(valid[1].city).toBe("Chiang Mai, TH");

    // Line 4: Thai characters intact
    expect(valid[2].lineNumber).toBe(4);
    expect(valid[2].name).toBe("สมศรี ใจดี");

    // Line 5: Duplicate Person
    expect(errors[0].lineNumber).toBe(5);
    expect(errors[0].reasons).toEqual(["Duplicate email (already defined at line 2)"]);

    // Line 6: empty name + invalid email -> must report BOTH reasons
    expect(errors[1].lineNumber).toBe(6);
    expect(errors[1].reasons).toContain("Name is required");
    expect(errors[1].reasons).toContain("Invalid email format");

    // Line 7: Formula injection in name
    expect(errors[2].lineNumber).toBe(7);
    expect(errors[2].reasons).toContain("Potential formula injection detected in name");

    // Line 8: Mali Wong without @ handle
    expect(errors[3].lineNumber).toBe(8);
    expect(errors[3].reasons).toContain("Handle must start with '@'");
  });
});

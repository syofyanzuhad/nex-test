import { describe, it, expect } from "vitest";
import { parseCsv } from "./csv";

describe("RFC4180 CSV Parser (scripts/lib/csv.ts)", () => {
  it("removes BOM and parses simple rows", () => {
    const raw = "\ufeffname,email\nSomchai,somchai@example.com";
    const records = parseCsv(raw);
    expect(records.length).toBe(2);
    expect(records[0].fields).toEqual(["name", "email"]);
    expect(records[1].fields).toEqual(["Somchai", "somchai@example.com"]);
    expect(records[1].lineNumber).toBe(2);
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    const raw = 'name,notes\n"Nguyen, Linh","Says ""Hello"""\n';
    const records = parseCsv(raw);
    expect(records[1].fields).toEqual(["Nguyen, Linh", 'Says "Hello"']);
  });

  it("handles multiline quoted fields and keeps accurate line numbers", () => {
    const raw = 'name,bio,city\n"Multi\nLine",bio1,Bangkok\nSingle,bio2,Phuket';
    const records = parseCsv(raw);
    expect(records.length).toBe(3);
    expect(records[1].lineNumber).toBe(2);
    expect(records[1].fields[0]).toBe("Multi\nLine");
    expect(records[2].lineNumber).toBe(4);
    expect(records[2].fields[0]).toBe("Single");
  });
});

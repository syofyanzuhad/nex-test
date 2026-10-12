import { describe, it, expect } from "vitest";
import { getBangkokMonthKey, escapeCsvCell, generatePayoutCsv, type PayoutSubmission } from "./payoutCsv";

describe("Payout CSV Export (web/src/lib/payoutCsv.ts)", () => {
  it("computes Bangkok month key correctly around UTC boundary (D5)", () => {
    // 2026-09-15 08:00 UTC -> 15:00 Bangkok -> 2026-09
    expect(getBangkokMonthKey("2026-09-15T08:00:00Z")).toBe("2026-09");

    // Seed s4 trap: 2026-09-30T18:30:00Z is 2026-10-01 01:30 in Asia/Bangkok
    expect(getBangkokMonthKey("2026-09-30T18:30:00Z")).toBe("2026-10");
  });

  it("escapes formula injection prefixes and special characters (R4.3, D7)", () => {
    expect(escapeCsvCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(escapeCsvCell("+123456")).toBe("'+123456");
    expect(escapeCsvCell("@somchai")).toBe("'@somchai");
    expect(escapeCsvCell("-500")).toBe("'-500");

    // Quoting commas and internal quotes
    expect(escapeCsvCell('Hello, "World"')).toBe('"Hello, ""World"""');
  });

  it("generates correct payout CSV for September 2026 matching D5 test plan", () => {
    const mockSubmissions: PayoutSubmission[] = [
      {
        id: "s1",
        creatorId: "creator-a",
        campaignId: "camp-bkk",
        campaignTitle: "Bangkok Hotel",
        tiktokUrl: "https://www.tiktok.com/@a/video/1",
        status: "pending",
        createdAt: "2026-09-10T08:00:00Z",
        ratePerVideoTHB: 500,
      },
      {
        id: "s3",
        creatorId: "creator-a",
        campaignId: "camp-pkt",
        campaignTitle: "Phuket Resort",
        tiktokUrl: "https://vm.tiktok.com/ZSabc123/",
        status: "approved",
        createdAt: "2026-09-15T04:00:00Z",
        ratePerVideoTHB: 800,
      },
      {
        id: "s4",
        creatorId: "creator-b",
        campaignId: "camp-pkt",
        campaignTitle: "Phuket Resort",
        tiktokUrl: "https://www.tiktok.com/@b/video/4",
        status: "approved",
        createdAt: "2026-09-30T18:30:00Z", // Oct in Bangkok!
        ratePerVideoTHB: 800,
      },
      {
        id: "s6",
        creatorId: "creator-a",
        campaignId: "camp-pkt",
        campaignTitle: "Phuket Resort",
        tiktokUrl: "https://www.tiktok.com/@a/video/6",
        status: "paid",
        createdAt: "2026-08-28T09:00:00Z",
        ratePerVideoTHB: 800,
      },
    ];

    // For 2026-09: only s3 should appear (800 THB)
    const sepResult = generatePayoutCsv(mockSubmissions, "2026-09");
    expect(sepResult.rowCount).toBe(1);
    expect(sepResult.totalTHB).toBe(800);
    expect(sepResult.csvString.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM
    expect(sepResult.csvString).toContain("s3,creator-a,camp-pkt,Phuket Resort");
    expect(sepResult.csvString).not.toContain("s4");
    expect(sepResult.csvString).not.toContain("s6");

    // For 2026-10: s4 should appear (800 THB)
    const octResult = generatePayoutCsv(mockSubmissions, "2026-10");
    expect(octResult.rowCount).toBe(1);
    expect(octResult.totalTHB).toBe(800);
    expect(octResult.csvString).toContain("s4,creator-b,camp-pkt,Phuket Resort");
  });
});

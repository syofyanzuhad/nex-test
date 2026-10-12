/**
 * Interface representing submission joined with campaign details
 */
export interface PayoutSubmission {
  id: string;
  creatorId: string;
  campaignId: string;
  campaignTitle: string;
  tiktokUrl: string;
  status: string;
  createdAt: any; // Date, ISO string, or Firestore Timestamp
  ratePerVideoTHB: number;
}

/**
 * Returns year-month key in Asia/Bangkok timezone: 'YYYY-MM' (D5).
 * Uses standard Intl.DateTimeFormat with Asia/Bangkok timezone.
 */
export function getBangkokMonthKey(dateInput: any): string {
  let date: Date;
  if (!dateInput) {
    return "";
  }
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput.toDate === "function") {
    // Firestore Timestamp
    date = dateInput.toDate();
  } else if (typeof dateInput === "number") {
    date = new Date(dateInput);
  } else {
    date = new Date(String(dateInput));
  }

  if (isNaN(date.getTime())) {
    return "";
  }

  // Format as YYYY-MM using Asia/Bangkok timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  });

  // en-CA formats as 'YYYY-MM'
  return formatter.format(date);
}

const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Escapes a single CSV cell according to RFC4180 and D7:
 * - Neutralizes formula injection by prepending single quote (') if starting with =, +, -, @, \t, \r
 * - Wraps in double quotes if contains comma (,), double quote ("), or newline (\n)
 * - Escapes internal quotes as double quotes ("")
 */
export function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) {
    return "";
  }
  let str = String(val);

  // Anti-formula injection (R4.3, D7)
  if (FORMULA_PREFIXES.some((p) => str.startsWith(p))) {
    str = `'${str}`;
  }

  // Check if quoting is needed
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Builds UTF-8 CSV with BOM for payouts in specified month (D5, D6, D7).
 * Filters strictly:
 * - status === 'approved'
 * - createdAt matches monthKey in 'Asia/Bangkok' timezone
 */
export function generatePayoutCsv(
  submissions: PayoutSubmission[],
  targetMonthBangkok: string // e.g. '2026-09'
): { csvString: string; rowCount: number; totalTHB: number } {
  const headers = [
    "submissionId",
    "creatorId",
    "campaignId",
    "campaignTitle",
    "tiktokUrl",
    "createdAt",
    "amountTHB",
  ];

  const approvedInMonth = submissions.filter((s) => {
    if (s.status !== "approved") return false;
    const month = getBangkokMonthKey(s.createdAt);
    return month === targetMonthBangkok;
  });

  const lines: string[] = [];
  // Header line
  lines.push(headers.join(","));

  let totalTHB = 0;

  for (const s of approvedInMonth) {
    let isoCreatedAt = "";
    if (s.createdAt) {
      const d = typeof s.createdAt.toDate === "function"
        ? s.createdAt.toDate()
        : new Date(s.createdAt);
      isoCreatedAt = d.toISOString();
    }

    const row = [
      escapeCsvCell(s.id),
      escapeCsvCell(s.creatorId),
      escapeCsvCell(s.campaignId),
      escapeCsvCell(s.campaignTitle),
      escapeCsvCell(s.tiktokUrl),
      escapeCsvCell(isoCreatedAt),
      escapeCsvCell(s.ratePerVideoTHB),
    ];

    totalTHB += s.ratePerVideoTHB;
    lines.push(row.join(","));
  }

  // UTF-8 BOM prefix (\ufeff) and CRLF line terminators (D7)
  const csvString = "\ufeff" + lines.join("\r\n") + "\r\n";
  return {
    csvString,
    rowCount: approvedInMonth.length,
    totalTHB,
  };
}

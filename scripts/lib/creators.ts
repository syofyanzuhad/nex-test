import { parseCsv } from "./csv";

export interface CreatorRow {
  name: string;
  email: string;
  tiktokHandle: string;
  city: string;
}

export interface ValidatedCreator extends CreatorRow {
  emailLower: string;
  lineNumber: number;
}

export interface CreatorRowError {
  lineNumber: number;
  reasons: string[];
  rawRow: string[];
}

export interface ValidationReport {
  valid: ValidatedCreator[];
  errors: CreatorRowError[];
}

// Basic RFC5322-compliant simple email regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DANGEROUS_FORMULA_PREFIXES = ["=", "+", "-", "@"];

/**
 * Validates creators list parsed from CSV according to D8:
 * - name required (non-empty trimmed)
 * - email valid format
 * - duplicate emails (case-insensitive) rejected on 2nd+ occurrence with citation
 * - handle must start with '@'
 * - cells starting with formula prefixes (=, +, -, @) on name/city rejected as potential formula injection
 */
export function validateCreatorsCsv(rawCsv: string): ValidationReport {
  const records = parseCsv(rawCsv);
  if (records.length === 0) {
    return { valid: [], errors: [] };
  }

  // Header verification (1st line)
  const headerRecord = records[0];
  const headers = headerRecord.fields.map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf("name");
  const emailIdx = headers.indexOf("email");
  // Supports either 'tiktok_handle' or 'tiktokhandle'
  const handleIdx = headers.findIndex((h) => h === "tiktok_handle" || h === "tiktokhandle");
  const cityIdx = headers.indexOf("city");

  const valid: ValidatedCreator[] = [];
  const errors: CreatorRowError[] = [];
  const seenEmails = new Map<string, number>(); // emailLower -> firstLineNumber

  for (let i = 1; i < records.length; i++) {
    const record = records[i];
    // Ignore completely empty blank lines at EOF
    if (record.fields.length === 1 && record.fields[0].trim() === "") {
      continue;
    }

    const rawName = record.fields[nameIdx] ?? "";
    const rawEmail = record.fields[emailIdx] ?? "";
    const rawHandle = record.fields[handleIdx] ?? "";
    const rawCity = record.fields[cityIdx] ?? "";

    const name = rawName.trim();
    const email = rawEmail.trim();
    const handle = rawHandle.trim();
    const city = rawCity.trim();

    const reasons: string[] = [];

    // 1. Formula injection check on text fields (D8)
    if (rawName && DANGEROUS_FORMULA_PREFIXES.some((p) => rawName.startsWith(p))) {
      reasons.push("Potential formula injection detected in name");
    }
    if (rawCity && DANGEROUS_FORMULA_PREFIXES.some((p) => rawCity.startsWith(p))) {
      reasons.push("Potential formula injection detected in city");
    }

    // 2. Name validation
    if (!name) {
      reasons.push("Name is required");
    }

    // 3. Email validation
    if (!email || !EMAIL_REGEX.test(email)) {
      reasons.push("Invalid email format");
    } else {
      const emailLower = email.toLowerCase();
      if (seenEmails.has(emailLower)) {
        const firstLine = seenEmails.get(emailLower);
        reasons.push(`Duplicate email (already defined at line ${firstLine})`);
      } else {
        seenEmails.set(emailLower, record.lineNumber);
      }
    }

    // 4. Handle validation
    if (!handle || !handle.startsWith("@")) {
      reasons.push("Handle must start with '@'");
    }

    if (reasons.length > 0) {
      errors.push({
        lineNumber: record.lineNumber,
        reasons,
        rawRow: record.fields,
      });
    } else {
      valid.push({
        name,
        email,
        emailLower: email.toLowerCase(),
        tiktokHandle: handle,
        city,
        lineNumber: record.lineNumber,
      });
    }
  }

  return { valid, errors };
}

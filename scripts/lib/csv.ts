export interface CsvRecord {
  lineNumber: number;
  fields: string[];
}

/**
 * Pure RFC4180-compliant CSV parser.
 * Handles:
 * - UTF-8 BOM removal
 * - CRLF and LF newlines
 * - Quoted fields with commas, quotes (""), and multiline breaks
 * - Tracks 1-indexed original physical start line number for each record
 */
export function parseCsv(raw: string): CsvRecord[] {
  // 1. Remove UTF-8 BOM if present
  let text = raw;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const records: CsvRecord[] = [];
  let currentFields: string[] = [];
  let currentField = "";
  let insideQuotes = false;
  let currentRecordLine = 1;
  let currentLine = 1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = i + 1 < text.length ? text[i + 1] : null;

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i++;
        } else {
          // Closing quote
          insideQuotes = false;
        }
      } else {
        if (char === "\n") {
          currentLine++;
        }
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ",") {
        currentFields.push(currentField);
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") {
          i++;
        }
        currentFields.push(currentField);
        records.push({
          lineNumber: currentRecordLine,
          fields: currentFields,
        });
        currentField = "";
        currentFields = [];
        currentLine++;
        currentRecordLine = currentLine;
      } else if (char === "\n") {
        currentFields.push(currentField);
        records.push({
          lineNumber: currentRecordLine,
          fields: currentFields,
        });
        currentField = "";
        currentFields = [];
        currentLine++;
        currentRecordLine = currentLine;
      } else {
        currentField += char;
      }
    }
  }

  // Final field/record if file does not end with newline
  if (currentField.length > 0 || currentFields.length > 0) {
    currentFields.push(currentField);
    records.push({
      lineNumber: currentRecordLine,
      fields: currentFields,
    });
  }

  return records;
}

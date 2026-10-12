export type NestedDictionary = {
  [key: string]: string | NestedDictionary;
};

/**
 * Flattens nested JSON object into dot-separated keys.
 * e.g. { auth: { title: "Sign In" } } -> { "auth.title": "Sign In" }
 */
export function flattenKeys(obj: NestedDictionary, prefix = ""): Record<string, string> {
  const flattened: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      flattened[fullKey] = value;
    } else if (typeof value === "object" && value !== null) {
      Object.assign(flattened, flattenKeys(value as NestedDictionary, fullKey));
    }
  }

  return flattened;
}

export interface I18nDiffResult {
  missingInTh: string[];
  missingInEn: string[];
  totalEnKeys: number;
  totalThKeys: number;
  synchronized: boolean;
}

/**
 * Compares two dictionaries (en & th) two-way.
 * Detects keys missing in either language.
 */
export function diffI18nDictionaries(
  enRaw: NestedDictionary,
  thRaw: NestedDictionary
): I18nDiffResult {
  const enFlat = flattenKeys(enRaw);
  const thFlat = flattenKeys(thRaw);

  const enKeys = Object.keys(enFlat);
  const thKeys = Object.keys(thFlat);

  const missingInTh = enKeys.filter((k) => !(k in thFlat));
  const missingInEn = thKeys.filter((k) => !(k in enFlat));

  return {
    missingInTh,
    missingInEn,
    totalEnKeys: enKeys.length,
    totalThKeys: thKeys.length,
    synchronized: missingInTh.length === 0 && missingInEn.length === 0,
  };
}

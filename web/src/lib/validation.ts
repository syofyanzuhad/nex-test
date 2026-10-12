export const TIKTOK_URL_REGEX = /^https:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/.+/;

export function validateTiktokUrl(
  url: string,
  t?: (key: string) => string
): { valid: boolean; error?: string } {
  const trimmed = url.trim();
  const translate = t || ((k: string) => k);

  if (!trimmed) {
    return { valid: false, error: translate("validation.urlRequired") };
  }
  if (!TIKTOK_URL_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: translate("validation.urlInvalidFormat"),
    };
  }
  return { valid: true };
}

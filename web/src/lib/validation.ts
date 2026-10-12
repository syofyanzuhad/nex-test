/**
 * Regex for TikTok URLs
 * Allows:
 * - https://www.tiktok.com/@handle/video/1234567890
 * - https://tiktok.com/@handle/video/1234567890
 * - https://vm.tiktok.com/ZSabc123/
 * - https://vt.tiktok.com/ZSabc123/
 * Rejects domain spoofing like:
 * - https://tiktok.com.evil.com/x
 * - https://evil.com/tiktok.com/
 */
export const TIKTOK_URL_REGEX = /^https:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/.+/;

export function validateTiktokUrl(url: string): { valid: boolean; error?: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: false, error: "TikTok URL is required" };
  }
  if (!TIKTOK_URL_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: "Invalid TikTok URL format. Must start with https:// and belong to tiktok.com, vm.tiktok.com, or vt.tiktok.com",
    };
  }
  return { valid: true };
}

/**
 * Extract the best callsign/address from a freetext patient context block.
 *
 * Priority:
 *  1. "Address as: Chachaji"  → "Chachaji"
 *  2. "Name: Rajesh Verma"    → "Rajesh" (first word only — feels natural in speech)
 *  3. displayName fallback    → whatever the user typed as the display name
 *  4. Language-appropriate generic → "Aap" (Hinglish) | "there" (English)
 */
export function parseAddressFrom(
  context: string,
  displayName: string,
  language = "Hindi / Hinglish"
): string {
  const lines = context.split("\n").map(l => l.trim()).filter(Boolean);

  // 1. Explicit "Address as:" line
  for (const line of lines) {
    const m = line.match(/^address\s+as\s*:\s*(.+)/i);
    if (m?.[1]?.trim()) return m[1].trim();
  }

  // 2. "Name:" line — extract first meaningful token before comma / age marker
  for (const line of lines) {
    const m = line.match(/^name\s*:\s*([^,\n]+)/i);
    if (m?.[1]?.trim()) {
      // Strip trailing age/gender markers like "61M", "48F", "61 M"
      const raw = m[1].trim().replace(/\s*\d+\s*[MF]?\s*$/i, "").trim();
      if (raw) {
        // Return just the first name for natural speech
        return raw.split(/\s+/)[0];
      }
    }
  }

  // 3. displayName fallback
  if (displayName?.trim()) {
    return displayName.trim().split(/\s+/)[0]; // first name only
  }

  // 4. Generic callsign
  const isHindi = /hindi|hinglish/i.test(language);
  return isHindi ? "Aap" : "there";
}

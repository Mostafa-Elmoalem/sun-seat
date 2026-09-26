/**
 * Normalizes Arabic text for flexible, fuzzy-tolerant autocomplete matching.
 * 
 * Rules:
 * - Unifies Alef variants (أ, إ, آ, ٱ) -> ا
 * - Unifies Teh Marbuta & Heh (ة) -> ه
 * - Unifies Alef Maqsura & Yeh (ى) -> ي
 * - Strips all Arabic diacritics / Tashkeel and Tatweel
 * - Removes leading 'ال' (optional in search)
 * - Collapses multiple spaces and normalizes English to lowercase
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';

  return text
    // Convert Eastern Arabic numerals (٠-٩) to Latin (0-9)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    // Remove diacritics / Tashkeel & Tatweel
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    // Normalize Alefs
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Teh Marbuta
    .replace(/ة/g, 'ه')
    // Normalize Alef Maqsura
    .replace(/ى/g, 'ي')
    // Remove punctuation
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'«»]/g, ' ')
    // English lowercase
    .toLowerCase()
    // Collapse extra spaces and trim
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips the Arabic definite article 'ال' from words for root matching.
 */
export function stripAlPrefix(normalizedText: string): string {
  return normalizedText
    .split(' ')
    .map((word) => (word.startsWith('ال') && word.length > 3 ? word.slice(2) : word))
    .join(' ');
}

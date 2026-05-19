/**
 * Anchor ID generation utility for section linking.
 * Creates URL-safe anchor IDs from heading text for use in the search index.
 */

const MAX_LENGTH = 50;

/**
 * Generate a URL-safe anchor ID from heading text.
 *
 * Lowercases, strips HTML tags and non-word characters, collapses whitespace
 * and underscores into a single hyphen, trims hyphens from the ends, and
 * truncates at 50 characters on a hyphen boundary. Returns 'section' for
 * inputs that are non-strings or that reduce to an empty string.
 *
 * @param {string} text - Heading text to convert
 * @returns {string} URL-safe anchor ID
 */
export function generateAnchorId(text) {
  if (!text || typeof text !== 'string') {
    return 'section';
  }

  const cleaned = text
    .toLowerCase()
    .replace(/<[^>]+>/g, '') // strip HTML tags
    .replace(/[^\w\s-]/g, '') // drop punctuation
    .replace(/[\s_]+/g, '-') // collapse whitespace + underscores
    .replace(/-+/g, '-') // collapse repeated hyphens
    .replace(/^-+|-+$/g, ''); // trim hyphens from ends

  const truncated = cleaned.length > MAX_LENGTH ? cleaned.substring(0, MAX_LENGTH).replace(/-+$/, '') : cleaned;

  return truncated || 'section';
}

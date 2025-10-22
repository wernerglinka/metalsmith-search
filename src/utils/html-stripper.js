/**
 * HTML stripping utilities using Cheerio
 * Replaces expensive RegExp operations with fast, accurate Cheerio parsing
 */
import * as cheerio from 'cheerio';

/**
 * Strip HTML and return clean text using Cheerio
 * This is much faster and more accurate than RegExp-based approaches
 *
 * @param {string} html - HTML content to process
 * @param {Object} options - Processing options
 * @param {string[]} options.excludeSelectors - CSS selectors to remove (e.g., ['nav', 'footer'])
 * @param {boolean} options.decodeEntities - Whether to decode HTML entities (default: true)
 * @returns {string} Clean text content
 */
export function stripHtml(html, options = {}) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const config = {
    excludeSelectors: [],
    decodeEntities: true,
    ...options,
  };

  try {
    // Load HTML with Cheerio
    const $ = cheerio.load(html, {
      decodeEntities: config.decodeEntities,
    });

    // Remove excluded elements
    if (config.excludeSelectors && config.excludeSelectors.length > 0) {
      $(config.excludeSelectors.join(', ')).remove();
    }

    // Always remove scripts and styles
    $('script, style').remove();

    // Extract clean text
    return $.text().trim();
  } catch {
    // Fallback to empty string on parse error
    return '';
  }
}

/**
 * HTML stripping utilities for clean text extraction
 * Removes HTML markup while preserving readable content structure
 */

/**
 * Validate HTML input
 * @param {*} html - HTML input to validate
 * @returns {boolean} True if valid HTML input
 */
function isValidHtmlInput(html) {
  return html && typeof html === 'string';
}

/**
 * Remove script and style tags completely
 * @param {string} html - HTML string
 * @returns {string} HTML without script/style tags
 */
function removeScriptsAndStyles(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
}

/**
 * Convert common HTML elements to readable format
 * @param {string} html - HTML string
 * @param {boolean} preserveLineBreaks - Whether to preserve line breaks
 * @returns {string} HTML with converted elements
 */
function convertElements(html, preserveLineBreaks) {
  let result = html;
  
  if (preserveLineBreaks) {
    // Convert block elements to line breaks
    result = result.replace(/<\/(div|p|h[1-6]|li|tr|section|article|header|footer|main)[^>]*>/gi, '\n');
    result = result.replace(/<br\s*\/?>/gi, '\n');
    result = result.replace(/<hr\s*\/?>/gi, '\n---\n');
  }
  
  return result;
}

/**
 * Strip all HTML tags
 * @param {string} html - HTML string
 * @returns {string} Text without HTML tags
 */
function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

/**
 * Decode HTML entities
 * @param {string} text - Text with HTML entities
 * @returns {string} Text with decoded entities
 */
function decodeEntities(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™'
  };
  
  return text.replace(/&[a-zA-Z0-9#]+;/g, (match) => entities[match] || match);
}

/**
 * Clean up whitespace
 * @param {string} text - Text to clean
 * @param {boolean} cleanWhitespace - Whether to clean whitespace
 * @returns {string} Cleaned text
 */
function cleanWhitespace(text, cleanWhitespace) {
  if (!cleanWhitespace) {
    return text;
  }
  
  return text
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .replace(/\n\s+/g, '\n')  // Remove spaces at start of lines
    .replace(/\s+\n/g, '\n')  // Remove spaces at end of lines
    .replace(/\n{3,}/g, '\n\n');  // Collapse multiple newlines
}

/**
 * Strip HTML tags and clean content for readability
 * @param {string} html - HTML string to process
 * @param {Object} options - Processing options
 * @returns {string} Clean text content
 */
export function stripHtml(html, options = {}) {
  if (!isValidHtmlInput(html)) {
    return '';
  }
  
  const config = {
    preserveLineBreaks: true,
    cleanWhitespace: true,
    decodeEntities: true,
    ...options
  };
  
  let text = html;
  text = removeScriptsAndStyles(text);
  text = convertElements(text, config.preserveLineBreaks);
  text = stripTags(text);
  
  if (config.decodeEntities) {
    text = decodeEntities(text);
  }
  
  text = cleanWhitespace(text, config.cleanWhitespace);
  
  return text.trim();
}
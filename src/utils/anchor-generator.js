/**
 * Anchor ID generation utility for section linking
 * Creates URL-safe anchor IDs for deep linking to page sections
 */

/**
 * Check if text is valid for anchor generation
 * @param {*} text - Text to validate
 * @returns {boolean} True if valid text input
 */
function isValidTextInput(text) {
  return text && typeof text === 'string';
}

/**
 * Clean text for URL-safe anchor generation
 * @param {string} text - Text to clean
 * @param {string} separator - Separator to use
 * @returns {string} Cleaned text
 */
function cleanTextForAnchor(text, separator) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, separator) // Replace spaces with separator
    .replace(new RegExp(`${separator}+`, 'g'), separator) // Remove multiple separators
    .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), ''); // Trim separators
}

/**
 * Remove numbers from text if not allowed
 * @param {string} text - Text to process
 * @param {boolean} allowNumbers - Whether to allow numbers
 * @returns {string} Processed text
 */
function processNumbers(text, allowNumbers) {
  return allowNumbers ? text : text.replace(/\d/g, '');
}

/**
 * Truncate text to maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} separator - Separator to clean from end
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength, separator) {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength).replace(new RegExp(`${separator}+$`), '');
}

/**
 * Add prefix to anchor if specified
 * @param {string} anchor - Base anchor
 * @param {string} prefix - Prefix to add
 * @param {string} separator - Separator to use
 * @returns {string} Anchor with prefix
 */
function addPrefix(anchor, prefix, separator) {
  return prefix ? `${prefix}${separator}${anchor}` : anchor;
}

/**
 * Add suffix to anchor if specified
 * @param {string} anchor - Base anchor
 * @param {string} suffix - Suffix to add
 * @param {string} separator - Separator to use
 * @returns {string} Anchor with suffix
 */
function addSuffix(anchor, suffix, separator) {
  return suffix ? `${anchor}${separator}${suffix}` : anchor;
}

/**
 * Ensure anchor is not empty
 * @param {string} anchor - Anchor to validate
 * @returns {string} Valid anchor (fallback to 'section' if empty)
 */
function ensureValidAnchor(anchor) {
  return anchor || 'section';
}

/**
 * Generate a URL-safe anchor ID from text
 * @param {string} text - Text to convert to anchor ID
 * @param {Object} options - Generation options
 * @returns {string} URL-safe anchor ID
 */
export function generateAnchorId(text, options = {}) {
  if (!isValidTextInput(text)) {
    return 'section';
  }

  const config = {
    maxLength: 50,
    prefix: '',
    suffix: '',
    allowNumbers: true,
    separator: '-',
    ...options,
  };

  let anchor = cleanTextForAnchor(text, config.separator);
  anchor = processNumbers(anchor, config.allowNumbers);
  anchor = truncateText(anchor, config.maxLength, config.separator);
  anchor = addPrefix(anchor, config.prefix, config.separator);
  anchor = addSuffix(anchor, config.suffix, config.separator);

  return ensureValidAnchor(anchor);
}

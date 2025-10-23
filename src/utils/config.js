/**
 * Configuration utilities for plugin options:
 * deep merging, file pattern matching, and normalization.
 * Uses Metalsmith's native match() method to avoid external dependencies.
 */

/**
 * Default plugin options
 * All properties guaranteed to exist after merging with user options.
 * @type {Object}
 * @property {string} pattern - Files to process (HTML files)
 * @property {string[]} ignore - Files to exclude from processing
 * @property {string} indexPath - Output path for search index
 * @property {string[]} excludeSelectors - CSS selectors to exclude from content
 * @property {Object} fuseOptions - Fuse.js search configuration
 */
export const defaultOptions = {
  pattern: '**/*.html',
  ignore: ['**/search-index.json'],
  indexPath: 'search-index.json',
  excludeSelectors: ['nav', 'header', 'footer'],

  // Fuse.js options
  fuseOptions: {
    keys: [
      { name: 'title', weight: 10 }, // Page title from <title> or <h1>
      { name: 'content', weight: 5 }, // All page text content
      { name: 'excerpt', weight: 3 }, // Auto-generated excerpt
    ],
    threshold: 0.3,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 3, // Skip stop words (to, be, or, etc.)
  },
};

/**
 * Deep merge configuration objects without mutation
 * Recursively merges nested objects using reduce() and spread operators.
 * @param {Object} target - Base configuration object
 * @param {Object} source - Override configuration object
 * @returns {Object} Merged configuration
 */
const deepMerge = (target, source) =>
  Object.keys(source).reduce(
    (acc, key) => ({
      ...acc,
      // If source value is a plain object, recursively merge it
      // Otherwise, use the source value directly (overwrites target)
      [key]:
        source[key]?.constructor === Object
          ? deepMerge(target[key] || {}, source[key])
          : source[key],
    }),
    { ...target } // Start with a copy of target to avoid mutation
  );

/**
 * Convert string or invalid value to array
 * @param {*} value - Value to normalize
 * @returns {Array} Array version of value
 */
function normalizeToArray(value) {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [];
}

/**
 * Normalize options by converting string values to arrays
 * @param {Object} options - Merged options (defaults + user overrides)
 * @returns {Object} Options with arrays for pattern, ignore, and excludeSelectors
 */
export function normalizeOptions(options) {
  return {
    ...options,
    pattern: normalizeToArray(options.pattern),
    ignore: normalizeToArray(options.ignore),
    excludeSelectors: normalizeToArray(options.excludeSelectors),
  };
}

/**
 * Check if ignore patterns exist
 * @param {string[]} ignore - Array of ignore patterns
 * @returns {boolean} True if ignore patterns are present
 */
function hasIgnorePatterns(ignore) {
  return ignore.length > 0;
}

/**
 * Remove ignored files from matched files
 * @param {string[]} matchedFiles - Files matching pattern
 * @param {string[]} ignoredFiles - Files matching ignore patterns
 * @returns {string[]} Files to process (matched minus ignored)
 */
function filterIgnoredFiles(matchedFiles, ignoredFiles) {
  return matchedFiles.filter((filename) => !ignoredFiles.includes(filename));
}

/**
 * Get files matching pattern while excluding ignored files
 * Uses Metalsmith's native match() method for consistency with other plugins.
 * @param {Object} files - Metalsmith files object
 * @param {Object} options - Normalized options with pattern and ignore arrays
 * @param {Object} metalsmith - Metalsmith instance
 * @returns {string[]} Files to process
 */
export function validateFiles(files, options, metalsmith) {
  const { pattern, ignore } = options;
  const allFiles = Object.keys(files);
  const matchedFiles = metalsmith.match(pattern, allFiles);

  // Early return: no ignore patterns means no filtering needed
  if (!hasIgnorePatterns(ignore)) {
    return matchedFiles;
  }

  // Filter out ignored files
  const ignoredFiles = metalsmith.match(ignore, allFiles);
  return filterIgnoredFiles(matchedFiles, ignoredFiles);
}

// Export deepMerge for use in main plugin file
export { deepMerge, normalizeToArray, hasIgnorePatterns };

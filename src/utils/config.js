/**
 * Configuration Utilities for Metalsmith Plugins
 *
 * This file provides utilities for handling plugin configuration:
 * - Deep merging of configuration objects
 * - File pattern matching using Metalsmith's native methods
 * - Option validation and normalization
 *
 * Philosophy: Use Metalsmith's built-in capabilities and local utility functions
 * instead of external dependencies to keep plugins lightweight.
 */

// No external imports needed - we use Metalsmith's built-in match() method for file patterns

/**
 * Default plugin options
 * @type {Object}
 * @property {string} pattern - Files to process (always exists after merge)
 * @property {string[]} ignore - Files to ignore (always exists after merge)
 *
 * IMPORTANT: After deepMerge(defaults, userOptions), all default properties
 * are guaranteed to exist. User options can override values but cannot remove
 * properties. This means:
 * - pattern will NEVER be null or undefined
 * - ignore will NEVER be null or undefined
 */
export const defaultOptions = {
  pattern: '**/*.md',
  ignore: ['**/search-index.json'],
  async: false,
  batchSize: 10,

  // Search-specific options
  indexPath: 'search-index.json',
  indexLevels: ['page', 'section'],
  sectionsField: 'sections',
  stripHtml: true,
  generateAnchors: true,
  lazyLoad: true,

  // Fuse.js options
  fuseOptions: {
    keys: [
      { name: 'pageName', weight: 10 }, // Page name for high-priority search
      { name: 'title', weight: 8 }, // Section/entry title
      { name: 'leadIn', weight: 5 }, // Optional frontmatter field
      { name: 'prose', weight: 3 }, // Optional frontmatter field
      { name: 'content', weight: 1 }, // Plugin-generated full content
      { name: 'tags', weight: 6 }, // Content tags
    ],
    threshold: 0.3,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 3, // Skip stop words (to, be, or, etc.)
  },

  // Component-aware indexing (auto-detected)
  sectionTypeField: 'sectionType',
  autoDetectSectionTypes: true,

  // Traditional content processing
  maxSectionLength: 2000, // Split sections longer than this
  chunkSize: 1500, // Target chunk size for long content
  minSectionLength: 50, // Skip sections shorter than this
  processMarkdownFields: true, // Process markdown in frontmatter
  frontmatterFields: ['summary', 'intro', 'leadIn', 'subTitle', 'abstract', 'overview'], // Additional fields to index
};

/**
 * Deep merge configuration objects
 *
 * Modern functional approach using reduce() and object spread.
 * This implementation:
 * - Creates new objects instead of mutating existing ones
 * - Handles nested objects recursively
 * - Uses constructor check for reliable object detection
 * - Utilizes optional chaining for safe property access
 *
 * Based on the proven implementation from metalsmith-optimize-images.
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
 * Normalize plugin options
 * @param {Object} options - Raw options (already merged with defaults)
 * @returns {Object} Normalized options
 */
export function normalizeOptions(options) {
  return {
    ...options,
    pattern: normalizeToArray(options.pattern),
    ignore: normalizeToArray(options.ignore),
  };
}

/**
 * Check if files should be ignored
 * @param {string[]} ignore - Ignore patterns
 * @returns {boolean} True if there are patterns to ignore
 */
function hasIgnorePatterns(ignore) {
  return ignore.length > 0;
}

/**
 * Filter out ignored files from matched files
 * @param {string[]} matchedFiles - Files that match include patterns
 * @param {string[]} ignoredFiles - Files that match ignore patterns
 * @returns {string[]} Filtered file list
 */
function filterIgnoredFiles(matchedFiles, ignoredFiles) {
  return matchedFiles.filter((filename) => !ignoredFiles.includes(filename));
}

/**
 * Get files that match patterns and are not ignored
 *
 * Uses Metalsmith's built-in match() method instead of external glob libraries.
 * This approach:
 * - Leverages Metalsmith's native file matching capabilities
 * - Eliminates external dependencies
 * - Ensures consistent behavior with other Metalsmith plugins
 * - Supports all glob patterns that Metalsmith supports
 *
 * @param {Object} files - Metalsmith files object (all files in the build)
 * @param {Object} options - Normalized options with pattern and ignore arrays
 * @param {Object} metalsmith - Metalsmith instance (needed for match method)
 * @returns {string[]} Array of file paths to process
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

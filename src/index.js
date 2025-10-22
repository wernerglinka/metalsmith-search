/**
 * HTML-First Metalsmith Search Plugin
 *
 * Processes final rendered HTML files after layouts/templates for accurate search indexing.
 * Uses Cheerio for fast, accurate HTML parsing instead of expensive RegExp operations.
 *
 * This plugin uses Metalsmith's built-in methods:
 * - metalsmith.match(patterns, files) for pattern matching
 * - metalsmith.debug(namespace) for debug logging
 */
import { deepMerge, defaultOptions } from './utils/config.js';
import { processAllFiles } from './processors/file-processor.js';
import { setupFileProcessing, createAndSaveIndex } from './utils/index-helpers.js';

/**
 * Plugin options
 * @typedef {Object} Options
 * @property {string|string[]} [pattern] - HTML files to process (default: '**\/*.html')
 * @property {string|string[]} [ignore] - Files to ignore
 * @property {string} [indexPath] - Output path for search index (default: 'search-index.json')
 * @property {string[]} [excludeSelectors] - CSS selectors to exclude (e.g., ['nav', 'footer'])
 * @property {string[]} [contentFields] - Frontmatter fields to index
 * @property {Object} [fuseOptions] - Fuse.js configuration options
 */

/**
 * HTML-first Metalsmith search plugin with Fuse.js.
 * Processes final rendered HTML using Cheerio for accurate content extraction.
 * Best positioned AFTER layouts/templates in the Metalsmith pipeline.
 *
 * @param {Options} options - Plugin options
 * @returns {import('metalsmith').Plugin} Metalsmith plugin function
 */
export default function search(options = {}) {
  // Normalize options with defaults
  const config = deepMerge(defaultOptions, options);

  // Return the actual plugin function (two-phase pattern)
  const metalsmithPlugin = function (files, metalsmith, done) {
    const debug = metalsmith.debug('metalsmith-search');
    debug('Starting metalsmith-search with options:', config);

    try {
      // Setup and validate files for processing
      const setup = setupFileProcessing(files, config, metalsmith, debug);

      if (setup.shouldExit) {
        return done();
      }

      const { normalizedOptions, filesToProcess } = setup;

      // Process all files and collect search entries
      const allSearchEntries = processAllFiles(
        filesToProcess,
        files,
        normalizedOptions,
        debug,
        metalsmith
      );

      // Create and save the search index
      createAndSaveIndex(allSearchEntries, files, normalizedOptions, debug);

      debug('metalsmith-search completed successfully');
      done();
    } catch (error) {
      debug('metalsmith-search failed:', error);
      done(error);
    }
  };

  // Set function name for debugging (helps with stack traces and debugging)
  Object.defineProperty(metalsmithPlugin, 'name', {
    value: 'searchPlugin',
    configurable: true,
  });

  return metalsmithPlugin;
}

/**
 * Search Index Helper Utilities
 * Functions for creating and managing search indexes
 */

import { createSearchIndex } from '../processors/search-indexer.js';
import { validateFiles, normalizeOptions } from './config.js';

/**
 * Create an empty search index and add it to files
 * @param {Object} files - Metalsmith files object
 * @param {Object} options - Plugin options
 * @param {Function} debug - Debug logging function
 * @returns {Promise<void>}
 */
export function createEmptyIndex(files, options, debug) {
  debug('Creating empty search index');
  const emptySearchIndex = createSearchIndex([], options);
  files[options.indexPath] = {
    contents: Buffer.from(JSON.stringify(emptySearchIndex, null, 2)),
    mode: '0644',
  };
  debug(`Created empty search index at ${options.indexPath}`);
}

/**
 * Setup and validate files for processing
 * @param {Object} files - Metalsmith files object
 * @param {Object} options - Plugin options
 * @param {Object} metalsmith - Metalsmith instance
 * @param {Function} debug - Debug logging function
 * @returns {Promise<Object>} Object with setup results
 */
export function setupFileProcessing(files, options, metalsmith, debug) {
  // Normalize and validate options
  const normalizedOptions = normalizeOptions(options);

  // Get files that match patterns (trusts pattern option, no binary detection)
  const filesToProcess = validateFiles(files, normalizedOptions, metalsmith);

  if (filesToProcess.length === 0) {
    createEmptyIndex(files, normalizedOptions, debug);
    return { shouldExit: true };
  }

  debug(`Processing ${filesToProcess.length} matched files`);

  return {
    shouldExit: false,
    normalizedOptions,
    filesToProcess,
  };
}

/**
 * Create and save the final search index
 * @param {Array} searchEntries - All collected search entries
 * @param {Object} files - Metalsmith files object
 * @param {Object} options - Plugin options
 * @param {Function} debug - Debug logging function
 * @returns {Promise<void>}
 */
export function createAndSaveIndex(searchEntries, files, options, debug) {
  // Create the search index
  const searchIndex = createSearchIndex(searchEntries, options);

  // Add the search index file to Metalsmith files
  files[options.indexPath] = {
    contents: Buffer.from(JSON.stringify(searchIndex, null, 2)),
    mode: '0644',
  };

  debug(`Created search index at ${options.indexPath}`);
}

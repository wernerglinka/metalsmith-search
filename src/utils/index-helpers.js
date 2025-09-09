/**
 * Search Index Helper Utilities
 * Functions for creating and managing search indexes
 */

import { createSearchIndex } from '../processors/search-indexer.js';
import { validateFiles, normalizeOptions } from './config.js';
import { filterAndSortFiles } from './file-filter.js';
import { discoverSectionTypes, generateComponentFields } from './plugin-helpers.js';

/**
 * Create an empty search index and add it to files
 * @param {Object} files - Metalsmith files object
 * @param {Object} options - Plugin options
 * @param {Function} debug - Debug logging function
 * @returns {Promise<void>}
 */
export async function createEmptyIndex(files, options, debug) {
  debug('Creating empty search index');
  const emptySearchIndex = await createSearchIndex([], options);
  files[options.indexPath] = {
    contents: Buffer.from(JSON.stringify(emptySearchIndex, null, 2)),
    mode: '0644'
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
export async function setupFileProcessing(files, options, metalsmith, debug) {
  // Normalize and validate options
  const normalizedOptions = normalizeOptions(options);
  
  // Get files that match patterns
  const matchedFiles = validateFiles(files, normalizedOptions, metalsmith);
  
  if (matchedFiles.length === 0) {
    await createEmptyIndex(files, normalizedOptions, debug);
    return { shouldExit: true };
  }
  
  // Filter and optimize files for processing
  const filesToProcess = filterAndSortFiles(files, matchedFiles, {
    ...normalizedOptions,
    prioritizeProcessing: true
  });
  
  if (filesToProcess.length === 0) {
    await createEmptyIndex(files, normalizedOptions, debug);
    return { shouldExit: true };
  }
  
  // Auto-discover section types if enabled
  if (normalizedOptions.autoDetectSectionTypes) {
    const discoveredTypes = discoverSectionTypes(files, filesToProcess, normalizedOptions);
    normalizedOptions.sectionTypes = Array.from(discoveredTypes);
    normalizedOptions.componentFields = generateComponentFields(discoveredTypes);
    
    debug(`Auto-detected section types: ${normalizedOptions.sectionTypes.join(', ')}`);
  }
  
  debug(`Processing ${filesToProcess.length} files (filtered from ${matchedFiles.length} matched files)`);
  
  return {
    shouldExit: false,
    normalizedOptions,
    filesToProcess
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
export async function createAndSaveIndex(searchEntries, files, options, debug) {
  // Create the search index
  const searchIndex = await createSearchIndex(searchEntries, options);
  
  // Add the search index file to Metalsmith files
  files[options.indexPath] = {
    contents: Buffer.from(JSON.stringify(searchIndex, null, 2)),
    mode: '0644'
  };
  
  debug(`Created search index at ${options.indexPath}`);
}
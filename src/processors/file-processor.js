/**
 * File Processing Utilities
 * Simplified HTML-first processing with no binary detection or priority sorting
 */

import { extractSearchableContent } from './content-extractor.js';

/**
 * Process a single file and extract search entries
 * @param {string} filename - Filename to process
 * @param {Object} files - Metalsmith files object
 * @param {Object} options - Processing options
 * @param {Function} debug - Debug function
 * @param {Object} metalsmith - Metalsmith instance
 * @returns {Promise<Array>} Array of search entries
 */
function processFile(filename, files, options, debug, metalsmith) {
  try {
    const file = files[filename];

    // Extract searchable content from the file
    const fileSearchEntries = extractSearchableContent(file, filename, options, metalsmith);

    debug(`Successfully processed: ${filename} (${fileSearchEntries.length} entries)`);
    return fileSearchEntries;
  } catch (error) {
    debug(`Error processing ${filename}:`, error);
    // Log but continue with other files
    return [];
  }
}

/**
 * Process all files and collect search entries
 * @param {string[]} filesToProcess - Array of filenames to process
 * @param {Object} files - Metalsmith files object
 * @param {Object} options - Processing options
 * @param {Function} debug - Debug function
 * @param {Object} metalsmith - Metalsmith instance
 * @returns {Promise<Array>} All search entries from all files
 */
export function processAllFiles(filesToProcess, files, options, debug, metalsmith) {
  const allSearchEntries = [];

  // Process all files synchronously (Cheerio parsing is fast)
  for (const filename of filesToProcess) {
    const entries = processFile(filename, files, options, debug, metalsmith);
    allSearchEntries.push(...entries);
  }

  debug(`Extracted ${allSearchEntries.length} total search entries`);
  return allSearchEntries;
}

/**
 * File Processing Utilities
 * Handles batch processing and individual file processing logic
 */

import { extractSearchableContent } from './content-extractor.js';
import { processAsync } from './async.js';
import { validateFileForSearch } from '../utils/file-filter.js';
import { isCriticalFileError, shouldProcessAsync } from '../utils/plugin-helpers.js';

/**
 * Process a batch of files and extract search entries
 * @param {string[]} batch - Array of filenames to process
 * @param {Object} files - Metalsmith files object
 * @param {Object} options - Processing options
 * @param {Function} debug - Debug function
 * @param {Object} metalsmith - Metalsmith instance
 * @returns {Promise<Array>} Array of search entries
 */
export async function processBatch(batch, files, options, debug, metalsmith) {
  const searchEntries = [];

  await Promise.all(
    batch.map(async (filename) => {
      try {
        const file = files[filename];

        // Quick validation using the file filter
        const validation = validateFileForSearch(file, filename, options);
        if (!validation.canProcess) {
          debug(`Skipping ${filename}: ${validation.issues.join(', ')}`);
          return;
        }

        debug(`Processing file: ${filename} (priority: ${validation.priority})`);

        // Extract searchable content from the file
        const fileSearchEntries = await extractSearchableContent(
          file,
          filename,
          options,
          metalsmith
        );

        // Add entries to our collection
        searchEntries.push(...fileSearchEntries);

        // Apply async processing if enabled
        if (shouldProcessAsync(options)) {
          try {
            await processAsync(file, filename, options);
          } catch (asyncError) {
            debug(`Async processing failed for ${filename}: ${asyncError.message}`);
            // Continue processing but log the error
          }
        }

        debug(`Successfully processed: ${filename} (${fileSearchEntries.length} entries)`);
      } catch (error) {
        debug(`Error processing ${filename}:`, error);

        // Handle error based on type
        if (isCriticalFileError(error)) {
          throw new Error(`Critical file validation error for ${filename}: ${error.message}`);
        }

        // For content extraction errors, log but continue
        debug(`Skipping ${filename} due to processing error: ${error.message}`);
        // Don't throw - continue with other files
      }
    })
  );

  return searchEntries;
}

/**
 * Process all files in batches and collect search entries
 * @param {string[]} filesToProcess - Array of filenames to process
 * @param {Object} files - Metalsmith files object
 * @param {Object} options - Processing options
 * @param {Function} debug - Debug function
 * @param {Object} metalsmith - Metalsmith instance
 * @returns {Promise<Array>} All search entries from all files
 */
export async function processAllFiles(filesToProcess, files, options, debug, metalsmith) {
  const allSearchEntries = [];

  // Process files in batches for better performance
  for (let i = 0; i < filesToProcess.length; i += options.batchSize) {
    const batch = filesToProcess.slice(i, i + options.batchSize);
    const batchEntries = await processBatch(batch, files, options, debug, metalsmith);
    allSearchEntries.push(...batchEntries);
  }

  debug(`Extracted ${allSearchEntries.length} total search entries`);
  return allSearchEntries;
}

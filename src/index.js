/**
 * Metalsmith Native Methods
 * This plugin uses Metalsmith's built-in methods:
 * - metalsmith.match(patterns, files) for pattern matching
 * - metalsmith.debug(namespace) for debug logging
 * - metalsmith.metadata() for accessing global metadata
 * - metalsmith.path() for path operations
 * - metalsmith.source() and metalsmith.destination() for directories
 */
import { processAsync } from './processors/async.js';
import { normalizeOptions, validateFiles, deepMerge } from './utils/config.js';

/**
 * Default options
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
const defaults = {
  pattern: '**/*',
  ignore: [],
  async: false,
  batchSize: 10,};

/**
 * Plugin options
 * @typedef {Object} Options
 * @property {string|string[]} pattern - Files to process
 * @property {string|string[]} ignore - Files to ignore
 * @property {boolean} [async=false] - Enable async processing
 * @property {number} [batchSize=10] - Batch size for processing */

/**
 * Search function for metalsmith
 *
 * @param {Options} options - Plugin options
 * @returns {import('metalsmith').Plugin} Metalsmith plugin function
 */
export default function search(options = {}) {
  // Normalize options with defaults
  const config = deepMerge(defaults, options);
  
  // Return the actual plugin function (two-phase pattern)
  const metalsmithPlugin = async function (files, metalsmith, done) {
    const debug = metalsmith.debug('metalsmith-search');
    debug('Starting metalsmith-search with options:', config);
    
    try {
      // Normalize and validate options
      const normalizedOptions = normalizeOptions(config);
      
      // Get files to process
      const filesToProcess = validateFiles(files, normalizedOptions, metalsmith);
      
      if (filesToProcess.length === 0) {
        debug('No files to process');
        return done();
      }
      
      debug(`Processing ${filesToProcess.length} files`);
      
        // Process files
        await Promise.all(
          filesToProcess.map(async (filename) => {
            try {
              const file = files[filename];
              debug(`Processing file: ${filename}`);
              
              
              
              
              // Apply async processing if enabled
              if (normalizedOptions.async) {
                await processAsync(file, filename, normalizedOptions);
              }
              
              
              debug(`Successfully processed: ${filename}`);
            } catch (error) {
              debug(`Error processing ${filename}:`, error);
              throw error;
            }
          })
        );
      
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
    configurable: true 
  });
  
  return metalsmithPlugin;
}




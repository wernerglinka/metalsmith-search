/**
 * Metalsmith Native Methods
 * This plugin uses Metalsmith's built-in methods:
 * - metalsmith.match(patterns, files) for pattern matching
 * - metalsmith.debug(namespace) for debug logging
 * - metalsmith.metadata() for accessing global metadata
 * - metalsmith.path() for path operations
 * - metalsmith.source() and metalsmith.destination() for directories
 */
import { deepMerge, defaultOptions } from './utils/config.js';
import { processAllFiles } from './processors/file-processor.js';
import { setupFileProcessing, createAndSaveIndex } from './utils/index-helpers.js';



/**
 * Plugin options
 * @typedef {Object} Options
 * @property {string|string[]} [pattern] - Markdown files to process (default: all .md files)
 * @property {string|string[]} ignore - Files to ignore
 * @property {boolean} [async=false] - Enable async processing
 * @property {number} [batchSize=10] - Batch size for processing
 * @property {string} [indexPath='search-index.json'] - Output path for search index
 * @property {string[]} [indexLevels=['page','section']] - Levels to index
 * @property {string} [sectionsField='sections'] - Frontmatter field containing component arrays
 * @property {string} [sectionTypeField='sectionType'] - Field name for component type identification
 * @property {boolean} [autoDetectSectionTypes=true] - Auto-discover section types from content
 * @property {boolean} [stripHtml=true] - Strip HTML from content
 * @property {boolean} [generateAnchors=true] - Generate section anchor links
 * @property {boolean} [lazyLoad=true] - Generate lazy-loadable index
 * @property {Object} [fuseOptions] - Fuse.js configuration options
 * @property {string[]} [sectionTypes] - Component types to recognize
 * @property {Object} [componentFields] - Fields to extract per component type
 * @property {number} [maxSectionLength=2000] - Split sections longer than this
 * @property {number} [chunkSize=1500] - Target chunk size for long content
 * @property {number} [minSectionLength=50] - Skip sections shorter than this
 * @property {boolean} [processMarkdownFields=true] - Process markdown in frontmatter
 * @property {string[]} [frontmatterFields] - Additional frontmatter fields to index
 */

/**
 * Modern Metalsmith search plugin with Fuse.js and component-based indexing.
 * Designed for markdown-first sites with clean content extraction.
 * Best positioned early in the Metalsmith pipeline before HTML generation.
 *
 * @param {Options} options - Plugin options
 * @returns {import('metalsmith').Plugin} Metalsmith plugin function
 */
export default function search(options = {}) {
  // Normalize options with defaults
  const config = deepMerge(defaultOptions, options);
  
  // Return the actual plugin function (two-phase pattern)
  const metalsmithPlugin = async function (files, metalsmith, done) {
    const debug = metalsmith.debug('metalsmith-search');
    debug('Starting metalsmith-search with options:', config);
    
    try {
      // Setup and validate files for processing
      const setup = await setupFileProcessing(files, config, metalsmith, debug);
      
      if (setup.shouldExit) {
        return done();
      }
      
      const { normalizedOptions, filesToProcess } = setup;
      
      // Process all files and collect search entries
      const allSearchEntries = await processAllFiles(
        filesToProcess, 
        files, 
        normalizedOptions, 
        debug, 
        metalsmith
      );
      
      // Create and save the search index
      await createAndSaveIndex(allSearchEntries, files, normalizedOptions, debug);
      
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




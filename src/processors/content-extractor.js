/**
 * HTML-first content extraction processor for search indexing
 *
 * Simplified approach:
 * - Extract all text content from the page
 * - Find all headings and ensure they have IDs (generate if missing)
 * - Return single page entry with headings metadata for client-side scroll-to
 */
import * as cheerio from 'cheerio';
import { generateAnchorId } from '../utils/anchor-generator.js';

/**
 * Extract searchable content from HTML file
 *
 * Returns a single search entry per page with:
 * - All text content
 * - Metadata from frontmatter
 * - List of headings with IDs for scroll-to functionality
 *
 * @param {Object} file - Metalsmith file object
 * @param {string} filename - File path
 * @param {Object} options - Processing options
 * @param {Object} metalsmith - Metalsmith instance
 * @returns {Array} Array with single search entry (or empty if no content)
 */
export function extractSearchableContent(file, filename, options, metalsmith) {
  const debug = metalsmith.debug('metalsmith-search:extractor');

  try {
    // Validate file input
    if (!file || !Buffer.isBuffer(file.contents)) {
      debug(`Skipping ${filename}: invalid file object`);
      return [];
    }

    const html = file.contents.toString();
    if (!html.trim()) {
      debug(`Skipping ${filename}: empty content`);
      return [];
    }

    // Load HTML with Cheerio
    const $ = cheerio.load(html);

    // Remove excluded selectors (nav, header, footer, etc.)
    if (options.excludeSelectors && options.excludeSelectors.length > 0) {
      $(options.excludeSelectors.join(', ')).remove();
      debug(`Removed excluded selectors: ${options.excludeSelectors.join(', ')}`);
    }

    // Always remove scripts and styles
    $('script, style').remove();

    // Generate base URL for this file
    // Handle root index.html: index.html -> /
    // Handle nested index: foo/index.html -> /foo
    // Handle regular files: foo/bar.html -> /foo/bar
    let baseUrl = filename.replace(/\.html$/, '');
    if (baseUrl === 'index' || baseUrl.endsWith('/index')) {
      baseUrl = baseUrl.replace(/\/?index$/, '') || '/';
    }
    const cleanUrl = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;

    // Determine page title from HTML <title> tag or first <h1>
    const pageTitle = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

    debug(`Processing ${filename} (URL: ${cleanUrl}, title: ${pageTitle})`);

    // Extract all headings and ensure they have IDs
    const headings = extractAndProcessHeadings($, debug);

    // Extract all text content
    const mainText = $.text().trim();
    if (!mainText) {
      debug(`Skipping ${filename}: no text content after processing`);
      return [];
    }

    // Create excerpt from content (first 250 chars)
    const excerpt =
      mainText.length > 300 ? `${mainText.substring(0, 250).replace(/\s+\S*$/, '')}...` : mainText;

    // Create single page entry
    const entry = {
      id: `page:${cleanUrl}`,
      type: 'page',
      url: cleanUrl,
      title: pageTitle,
      content: mainText,
      excerpt,
      headings, // Array of {level, id, title} for scroll-to functionality
      wordCount: mainText.split(/\s+/).filter(Boolean).length,
    };

    debug(`Extracted page entry with ${headings.length} headings and ${entry.wordCount} words`);
    return [entry];
  } catch (error) {
    debug(`Error extracting content from ${filename}:`, error);
    return [];
  }
}

/**
 * Extract all headings (h1-h6) and ensure they have IDs
 *
 * For headings without IDs, generates URL-safe IDs from the heading text.
 * Returns metadata array for client-side scroll-to functionality.
 *
 * @param {Object} $ - Cheerio instance
 * @param {Function} debug - Debug logging function
 * @returns {Array} Array of {level: 'h2', id: 'section-id', title: 'Section Title'}
 */
function extractAndProcessHeadings($, debug) {
  const headings = [];
  const usedIds = new Set(); // Track used IDs to ensure uniqueness

  $('h1, h2, h3, h4, h5, h6').each((index, el) => {
    const $heading = $(el);
    const level = el.name; // 'h1', 'h2', etc.
    const title = $heading.text().trim();

    if (!title) {
      return; // Skip empty headings
    }

    // Get existing ID or generate one
    let id = $heading.attr('id');

    if (!id) {
      // Generate ID from heading text
      id = generateAnchorId(title);

      // Ensure uniqueness by appending number if needed
      let uniqueId = id;
      let counter = 1;
      while (usedIds.has(uniqueId)) {
        uniqueId = `${id}-${counter}`;
        counter++;
      }
      id = uniqueId;

      // Set the ID on the heading element
      $heading.attr('id', id);
      debug(`Generated ID '${id}' for ${level}: ${title}`);
    }

    usedIds.add(id);

    headings.push({
      level,
      id,
      title,
    });
  });

  return headings;
}

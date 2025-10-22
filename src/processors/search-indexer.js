/**
 * Search index creation processor
 * Creates optimized search indexes using Fuse.js patterns
 */

/**
 * Create a search index from extracted content entries
 * @param {Array} searchEntries - Array of search entries
 * @param {Object} options - Index creation options
 * @returns {Promise<Object>} Search index object
 */
export function createSearchIndex(searchEntries, options) {
  if (!Array.isArray(searchEntries) || searchEntries.length === 0) {
    return createEmptyIndex(options);
  }

  // Optimize entries for search
  const optimizedEntries = optimizeEntriesForSearch(searchEntries);

  // Create index structure
  const index = {
    version: '1.0.0',
    generator: 'metalsmith-search',
    generated: new Date().toISOString(),
    totalEntries: optimizedEntries.length,

    // Index configuration for client-side reconstruction
    config: {
      fuseOptions: options.fuseOptions,
    },

    // Statistics for debugging and optimization
    stats: generateIndexStats(optimizedEntries),

    // The actual searchable data
    entries: optimizedEntries,
  };

  return index;
}

/**
 * Optimize search entries for better search performance
 * @param {Array} entries - Raw search entries
 * @param {Object} options - Optimization options
 * @returns {Array} Optimized entries
 */
function optimizeEntriesForSearch(entries) {
  return entries.map((entry, index) => {
    const optimized = {
      // Unique identifier for each entry
      id: entry.id || `entry-${index}`,

      // Entry type and metadata
      type: entry.type || 'page',
      url: entry.url || '/',

      // Searchable content fields
      title: cleanText(entry.title || ''),
      content: cleanText(entry.content || ''),

      // Additional metadata for enhanced search
      ...(entry.description && { description: cleanText(entry.description) }),
      ...(entry.excerpt && { excerpt: cleanText(entry.excerpt) }),
      ...(entry.tags && { tags: entry.tags }),
      ...(entry.date && { date: entry.date }),
      ...(entry.author && { author: entry.author }),

      // Headings array for client-side scroll-to functionality
      // Format: [{level: 'h2', id: 'section-id', title: 'Section Title'}, ...]
      ...(entry.headings && entry.headings.length > 0 && { headings: entry.headings }),

      // Search relevance (initially 0, will be set by Fuse.js)
      score: 0,
    };

    // Remove empty or undefined fields to reduce index size
    return removeEmptyFields(optimized);
  });
}

/**
 * Generate statistics about the search index
 * @param {Array} entries - Search entries
 * @returns {Object} Index statistics
 */
function generateIndexStats(entries) {
  const stats = {
    totalEntries: entries.length,
    entriesByType: {},
    averageContentLength: 0,
    totalContentLength: 0,
  };

  let totalLength = 0;

  for (const entry of entries) {
    // Count by entry type
    stats.entriesByType[entry.type] = (stats.entriesByType[entry.type] || 0) + 1;

    // Calculate content length
    const contentLength = (entry.content || '').length;
    totalLength += contentLength;
  }

  stats.totalContentLength = totalLength;
  stats.averageContentLength = entries.length > 0 ? Math.round(totalLength / entries.length) : 0;

  return stats;
}

/**
 * Create an empty search index when no entries are found
 * @param {Object} options - Index options
 * @returns {Object} Empty index structure
 */
function createEmptyIndex(options) {
  return {
    version: '1.0.0',
    generator: 'metalsmith-search',
    generated: new Date().toISOString(),
    totalEntries: 0,
    config: {
      fuseOptions: options.fuseOptions,
    },
    stats: {
      totalEntries: 0,
      entriesByType: {},
      averageContentLength: 0,
      totalContentLength: 0,
    },
    entries: [],
  };
}

/**
 * Clean text content for search optimization
 * @param {string} text - Raw text content
 * @returns {string} Cleaned text
 */
function cleanText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return (
    text
      .trim()
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove excessive punctuation
      .replace(/[^\w\s\-.,!?;:'"()]/g, '')
      // Limit length to prevent index bloat (adjust as needed)
      .substring(0, 2000)
  );
}

/**
 * Remove empty or undefined fields from an object
 * @param {Object} obj - Object to clean
 * @returns {Object} Cleaned object
 */
function removeEmptyFields(obj) {
  const cleaned = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      // Keep arrays even if empty (they might be intentionally empty)
      if (Array.isArray(value) || value) {
        cleaned[key] = value;
      }
    }
  }

  return cleaned;
}

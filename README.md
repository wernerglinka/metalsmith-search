# metalsmith-search

Modern Metalsmith search plugin with Fuse.js, component-based indexing, and clean markdown-first
approach

[![metalsmith:plugin][metalsmith-badge]][metalsmith-url] [![npm: version][npm-badge]][npm-url]
[![license: MIT][license-badge]][license-url] [![test coverage][coverage-badge]][coverage-url]
[![ESM/CommonJS][modules-badge]][npm-url]
[![Known Vulnerabilities](https://snyk.io/test/npm/metalsmith-search/badge.svg)](https://snyk.io/test/npm/metalsmith-search)

> This Metalsmith plugin is under active development. The API is stable, but breaking changes may
> occur before reaching 1.0.0.

## Features

- **Markdown-First Design**: Optimized for clean content extraction before HTML generation
- **Modern Search**: Powered by Fuse.js with page-name prioritized search keys and stop word
  filtering
- **Component-Aware**: Understands 2025 component-based Metalsmith architectures with deep nested
  content extraction
- **Traditional Support**: Handles long-form markdown content with intelligent chunking
- **Chrome-Free Indexing**: Avoids navigation, header, and footer pollution in search results
- **Page Context**: Every search entry includes `pageName` field for user-friendly result display
- **Smart ID Management**: Automatically generates missing section IDs for perfect template
  synchronization
- **Deep Content Extraction**: Finds content at any nesting level (`section.text.title`,
  `section.content.main.text.prose`)
- **Enhanced Search Keys**: Page names, titles, tags, frontmatter fields, and generated content
- **Stop Word Filtering**: Automatically filters common words for better relevance
- **Perfect Anchor Links**: Modifies frontmatter to ensure search URLs match rendered HTML IDs
- **Performance Optimized**: Lazy loading, batch processing, and efficient indexing
- **Multi-Level Indexing**: Search at page, section, and component levels
- **Early Pipeline Positioning**: Best used before HTML generation for clean content
- **Universal Compatibility**: Works with both ESM and CommonJS

## Installation

```bash
npm install metalsmith-search
```

## Requirements

- **Node.js**: >= 18.0.0
- **Metalsmith**: ^2.5.0
- **Modern Browser**: For client-side search functionality

## Theory of Operation

### Architecture Overview

metalsmith-search creates search indexes by understanding both traditional and modern Metalsmith
site patterns. Unlike legacy plugins that treat pages as monolithic documents, this plugin
recognizes the compositional nature of modern web content and is designed for **early pipeline
positioning** to capture clean content before HTML chrome pollution.

### Content Processing Pipeline

1. **Clean Source Processing**: Plugin processes markdown files **before** HTML generation to avoid
   chrome pollution
2. **File Analysis**: Examines each markdown file to determine its content architecture
3. **Content Extraction**: Multiple extraction strategies handle different content patterns:
   - **Component-based pages**: Extracts from structured `sections` arrays in frontmatter
   - **Traditional pages**: Splits long-form content by headings and logical breaks
   - **Mixed content**: Handles pages with both approaches seamlessly
4. **Content Processing**:
   - Processes clean markdown content (no HTML chrome)
   - Handles markdown syntax in frontmatter fields
   - Generates clean, searchable text
5. **Enhanced Search Keys**: Creates entries with comprehensive field coverage:
   - `title` (weight: 10) - Page/section titles
   - `tags` (weight: 8) - Content tags
   - `leadIn` (weight: 5) - Intro/summary fields
   - `prose` (weight: 3) - Rich text content
   - `content` (weight: 1) - Full processed content
6. **Stop Word Filtering**: Automatically excludes words shorter than 3 characters
7. **Intelligent Chunking**: Long content gets split into searchable sections
8. **Index Generation**: Creates optimized Fuse.js-compatible search indexes
9. **Anchor Generation**: Creates URL fragments for direct section linking

### Multi-Level Indexing Strategy

The plugin creates search entries at multiple granularity levels:

**Page Level**: Entire page content with metadata

- Full page title, description, and aggregated content
- Ideal for broad topic searches
- Includes processed frontmatter fields

**Section Level**: Individual page sections

- Component-based sections (hero, text-only, media-image, etc.)
- Traditional content sections (split by headings)
- Each section gets its own anchor link for direct access

**Component Level**: Individual components within sections

- Future extensibility for micro-level search
- Currently focuses on section-level granularity

### Content Type Recognition

#### Component-Based Content (Modern Pattern)

```yaml
sections:
  - sectionType: hero
    text:
      title: 'Welcome'
      prose: 'Modern web **development** guide'
  - sectionType: text-only
    text:
      prose: 'Comprehensive content here...'
```

The plugin extracts each section as a separate search entry with proper component type
classification.

#### Traditional Content (Legacy Pattern)

```markdown
---
title: 'Complete Guide'
description: 'Learn about **modern development**'
---

# Introduction

Traditional markdown content gets automatically split by headings.

## Chapter 1: Fundamentals

Each section becomes searchable with generated anchor links.
```

Long content gets intelligently chunked while preserving readability.

#### Mixed Content (Hybrid Pattern)

Pages can combine both approaches - component sections in frontmatter plus traditional markdown body
content.

### Search Index Structure

Generated indexes follow this optimized structure:

```json
{
  "version": "0.0.1",
  "generator": "metalsmith-search",
  "generated": "2025-01-15T10:30:00.000Z",
  "totalEntries": 42,
  "config": {
    "fuseOptions": { "threshold": 0.3, "keys": [...] },
    "indexLevels": ["page", "section"],
    "lazyLoad": true
  },
  "stats": {
    "entriesByType": { "page": 10, "section": 32 },
    "entriesBySectionType": { "hero": 5, "traditional": 15 },
    "averageContentLength": 285
  },
  "entries": [
    {
      "id": "page:/about",
      "type": "page",
      "title": "About Us",
      "pageName": "About Us - Company Information",
      "content": "Complete page content...",
      "url": "/about",
      "tags": ["company", "team"],
      "wordCount": 450
    },
    {
      "id": "section:/about:0",
      "type": "section",
      "sectionType": "hero",
      "title": "Our Mission",
      "pageName": "About Us - Company Information",
      "leadIn": "Building the future",
      "prose": "Section content with nested extraction...",
      "content": "Complete section content...",
      "url": "/about#our-mission",
      "sectionIndex": 0
    }
  ]
}
```

### Performance Optimizations

- **Batch Processing**: Files processed in configurable batches
- **Content Chunking**: Long sections split for optimal search performance
- **Index Compression**: Removes empty fields and optimizes data structures
- **Lazy Loading**: Optional deferred index loading for large sites
- **Caching-Friendly**: Static JSON indexes work with CDNs and browser caching

## Usage

### Basic Usage (Recommended Early Pipeline)

```js
import Metalsmith from 'metalsmith';
import search from 'metalsmith-search';
import layouts from '@metalsmith/layouts';

Metalsmith(__dirname)
  .source('./src')
  .destination('./build')
  .use(search()) // Run BEFORE layouts for clean content
  .use(layouts()) // HTML generation happens after indexing
  .build((err) => {
    if (err) throw err;
    console.log('Search index created with clean content!');
  });
```

**Why Early Pipeline?**

- ✅ **Clean Content**: Processes markdown before HTML chrome is added
- ✅ **No Pollution**: Avoids navigation, headers, footers in search results
- ✅ **Better Relevance**: Search results focus on actual content
- ✅ **Smaller Index**: No irrelevant HTML structure

### Component-Based Sites (2025 Pattern)

Perfect for modern Metalsmith sites using structured frontmatter:

```js
Metalsmith(__dirname)
  .use(
    search({
      indexLevels: ['page', 'section'],
      sectionTypes: ['hero', 'text-only', 'media-image', 'cta'],
      generateAnchors: true,
      fuseOptions: {
        keys: [
          { name: 'title', weight: 10 },
          { name: 'tags', weight: 8 },
          { name: 'leadIn', weight: 5 },
          { name: 'prose', weight: 3 },
          { name: 'content', weight: 1 }, // Generated content field
        ],
        minMatchCharLength: 3, // Filter stop words
      },
    })
  )
  .use(layouts()) // HTML generation after search indexing
  .build((err) => {
    if (err) throw err;
  });
```

### Traditional Long-Form Sites

Optimized for blogs, documentation, and article sites:

```js
Metalsmith(__dirname)
  .use(
    search({
      indexLevels: ['page', 'section'],
      maxSectionLength: 1500,
      minSectionLength: 100,
      processMarkdownFields: true,
      frontmatterFields: ['summary', 'abstract', 'intro'],
      fuseOptions: {
        keys: [
          { name: 'title', weight: 10 },
          { name: 'tags', weight: 8 },
          { name: 'content', weight: 1 }, // Main content field
          { name: 'excerpt', weight: 2 },
        ],
        threshold: 0.2, // More precise matching for articles
        minMatchCharLength: 3, // Filter stop words
      },
    })
  )
  .use(layouts()) // Process layouts after search indexing
  .build((err) => {
    if (err) throw err;
  });
```

### Auto-Detection of Component Types

The plugin automatically discovers component types from your content - **no manual configuration
needed!**

```js
// Zero config - just add the plugin
Metalsmith(__dirname)
  .use(search()) // Auto-detects: hero, text-only, media-image, cta, etc.
  .use(layouts())
  .build((err) => {
    if (err) throw err;
  });
```

**How it works:**

1. Scans all markdown files for component arrays (default: `sections`)
2. Discovers section types from each component's `sectionType` field
3. Automatically generates appropriate field mappings
4. No need to update metalsmith.js when adding new components!

**Debug output:**

```bash
DEBUG=metalsmith-search* npm run build
# Auto-detected section types: hero, text-only, media-image, banner, traditional
```

### Custom Component Field Names

For sites using different field names for component arrays:

```js
// Site using 'myComponents' instead of 'sections'
Metalsmith(__dirname)
  .use(
    search({
      sectionsField: 'myComponents', // Look for file.myComponents
      indexLevels: ['page', 'section'],
      fuseOptions: {
        keys: [
          { name: 'title', weight: 10 },
          { name: 'content', weight: 1 },
        ],
      },
    })
  )
  .use(layouts())
  .build((err) => {
    if (err) throw err;
  });
```

**Frontmatter example:**

```yaml
---
title: 'Custom Components Page'
myComponents: # Custom field name
  - sectionType: hero
    text:
      title: 'Welcome'
      prose: 'Content here'
  - sectionType: text-only
    text:
      prose: 'More content'
---
```

### Hybrid Sites (Best of Both)

For sites mixing traditional and component-based content:

```js
Metalsmith(__dirname)
  .use(
    search({
      // Index both patterns
      indexLevels: ['page', 'section'],

      // Component support
      sectionTypes: ['hero', 'text-only', 'traditional'],
      generateAnchors: true,

      // Traditional content support
      maxSectionLength: 2000,
      chunkSize: 1500,
      processMarkdownFields: true,

      // Flexible search configuration
      fuseOptions: {
        keys: [
          { name: 'title', weight: 8 },
          { name: 'content', weight: 1 },
          { name: 'leadIn', weight: 4 },
          { name: 'prose', weight: 1 },
        ],
        threshold: 0.3,
        includeMatches: true,
      },
    })
  )
  .build((err) => {
    if (err) throw err;
  });
```

## Advanced Features

### Page Naming and Context

Every search entry includes a `pageName` field for better user experience. The plugin uses a smart
fallback hierarchy:

```yaml
---
# Frontmatter examples
pageTitle: 'Getting Started Guide' # 1st priority - explicit search display name
title: 'Getting Started with Components' # 3rd priority - page title fallback
seo:
  title: 'Complete Getting Started Guide - Learn Fast' # 2nd priority - SEO title
---
```

**Priority Order:**

1. `pageTitle` - Explicit field for search result display
2. `seo.title` - SEO-optimized title (usually most descriptive)
3. `title` - Basic page title
4. `'Untitled Page'` - Final fallback

### Deep Nested Content Extraction

The plugin intelligently extracts content from deeply nested component structures:

```yaml
sections:
  - sectionType: hero
    text:                    # Level 1 nesting
      title: "Welcome"       # ✅ Found and indexed
      prose: "Content..."    # ✅ Found and indexed

  - sectionType: complex
    content:                 # Level 2 nesting
      main:
        text:                # Level 3 nesting
          title: "Deep Title"  # ✅ Found and indexed
          prose: "Deep content"# ✅ Found and indexed
```

### Automatic Section ID Management

The plugin ensures perfect synchronization between search URLs and rendered HTML by modifying
frontmatter:

**Before processing:**

```yaml
sections:
  - sectionType: hero
    # No ID specified
    text:
      title: 'Welcome Section'
```

**After processing:**

```yaml
sections:
  - sectionType: hero
    id: 'welcome-section' # ✅ Auto-generated
    text:
      title: 'Welcome Section'
```

**Result:**

- Search index: `"url": "/page#welcome-section"`
- Template renders: `<section id="welcome-section">`
- Links work perfectly! ✅

## Options

| Option                   | Type                 | Default                                                              | Description                                   |
| ------------------------ | -------------------- | -------------------------------------------------------------------- | --------------------------------------------- |
| `pattern`                | `string \| string[]` | `'**/*.md'`                                                          | Markdown files to process                     |
| `ignore`                 | `string \| string[]` | `['**/search-index.json']`                                           | Files to ignore                               |
| `indexPath`              | `string`             | `'search-index.json'`                                                | Output path for search index                  |
| `indexLevels`            | `string[]`           | `['page', 'section']`                                                | Granularity levels to index                   |
| `sectionsField`          | `string`             | `'sections'`                                                         | Frontmatter field containing component arrays |
| `sectionTypeField`       | `string`             | `'sectionType'`                                                      | Field name for component type identification  |
| `autoDetectSectionTypes` | `boolean`            | `true`                                                               | Auto-discover section types from content      |
| `stripHtml`              | `boolean`            | `true`                                                               | Strip HTML from content                       |
| `generateAnchors`        | `boolean`            | `true`                                                               | Generate section anchor links                 |
| `lazyLoad`               | `boolean`            | `true`                                                               | Enable lazy-loadable index format             |
| `fuseOptions`            | `object`             | `{...}`                                                              | Fuse.js configuration options                 |
| `componentFields`        | `object`             | `{...}`                                                              | Fields to extract per component type          |
| `maxSectionLength`       | `number`             | `2000`                                                               | Split sections longer than this               |
| `chunkSize`              | `number`             | `1500`                                                               | Target chunk size for long content            |
| `minSectionLength`       | `number`             | `50`                                                                 | Skip sections shorter than this               |
| `processMarkdownFields`  | `boolean`            | `true`                                                               | Process markdown in frontmatter               |
| `frontmatterFields`      | `string[]`           | `['summary', 'intro', 'leadIn', 'subTitle', 'abstract', 'overview']` | Additional frontmatter fields to index        |
| `async`                  | `boolean`            | `false`                                                              | Enable async processing                       |
| `batchSize`              | `number`             | `10`                                                                 | Files per processing batch                    |

### Fuse.js Options

The `fuseOptions` object is passed directly to Fuse.js. The plugin includes optimized defaults:

```js
fuseOptions: {
  // Search sensitivity (0.0 = exact match, 1.0 = match anything)
  threshold: 0.3,

  // Optimized search keys with weights (default configuration)
  keys: [
    { name: 'title', weight: 10 },      // Page/section titles (highest priority)
    { name: 'tags', weight: 8 },        // Content tags
    { name: 'leadIn', weight: 5 },      // Optional intro/summary fields
    { name: 'prose', weight: 3 },       // Optional rich content fields
    { name: 'content', weight: 1 }      // Generated full content (fallback)
  ],

  // Include match details and scores in results
  includeScore: true,
  includeMatches: true,

  // Stop word filtering - excludes words shorter than 3 characters
  minMatchCharLength: 3,  // Filters "to", "be", "or", "in", etc.

  // Maximum pattern length
  maxPatternLength: 32
}
```

**Key Improvements:**

- ✅ **Enhanced Coverage**: Searches both frontmatter fields AND generated content
- ✅ **Stop Word Filtering**: `minMatchCharLength: 3` removes noise words
- ✅ **Proper Weighting**: Important fields like titles and tags get higher priority
- ✅ **Fallback Search**: Content field ensures nothing is missed

## Client-Side Usage

Once the search index is generated, use it in your frontend:

### Basic JavaScript Implementation

```js
// Load the search index
const response = await fetch('/search-index.json');
const searchData = await response.json();

// Initialize Fuse.js
const fuse = new Fuse(searchData.entries, searchData.config.fuseOptions);

// Perform searches
const results = fuse.search('modern web development');

// Results structure:
results.forEach((result) => {
  console.log(`Found: ${result.item.title}`);
  console.log(`Page: ${result.item.pageName}`);
  console.log(`URL: ${result.item.url}`);
  console.log(`Type: ${result.item.type}`);
  console.log(`Score: ${result.score}`);
});
```

### Advanced Search Interface

```js
// Search functionality using functions
let fuse = null;
let searchData = null;

// Initialize search
async function initSearch() {
  try {
    const response = await fetch('/search-index.json');
    searchData = await response.json();
    fuse = new Fuse(searchData.entries, searchData.config.fuseOptions);
    return true;
  } catch (error) {
    console.error('Failed to load search index:', error);
    return false;
  }
}

// Main search function
function search(query, options = {}) {
  if (!fuse) return [];

  const results = fuse.search(query);

  // Filter by content type if specified
  if (options.type) {
    return results.filter((r) => r.item.type === options.type);
  }

  // Filter by section type if specified
  if (options.sectionType) {
    return results.filter((r) => r.item.sectionType === options.sectionType);
  }

  return results;
}

// Search only page-level content
function searchPages(query) {
  return search(query, { type: 'page' });
}

// Search only section-level content
function searchSections(query) {
  return search(query, { type: 'section' });
}

// Search specific component types
function searchComponents(query, componentType) {
  return search(query, { type: 'section', sectionType: componentType });
}

// Usage - initialize search when page loads
document.addEventListener('DOMContentLoaded', async () => {
  const searchReady = await initSearch();

  if (searchReady) {
    // Search is ready - you can now call search functions
    const results = searchPages('metalsmith components');
    const heroResults = searchComponents('welcome', 'hero');
    console.log('Search results:', results);
  }
});
```

## Examples

### Real-World Component Page

Content from a modern Metalsmith site:

```yaml
---
title: 'Modern Web Components'
description: 'Build **reusable components** for modern web applications'
sections:
  - sectionType: hero
    text:
      title: 'Component Architecture'
      prose: 'Modern web development uses **component-based patterns** for better maintainability.'
  - sectionType: text-only
    text:
      prose: |-
        ## Benefits of Components

        Component-based architecture provides several advantages:
        - Reusability across projects
        - Better testing isolation
        - Cleaner code organization

        Each component handles a specific responsibility.
---
```

**Generated Search Entries:**

```json
[
  {
    "id": "page:/components",
    "type": "page",
    "title": "Modern Web Components",
    "content": "Build reusable components for modern web applications Modern web development uses component-based patterns...",
    "url": "/components"
  },
  {
    "id": "section:/components:0",
    "type": "section",
    "sectionType": "hero",
    "title": "Component Architecture",
    "content": "Component Architecture Modern web development uses component-based patterns for better maintainability.",
    "url": "/components#component-architecture"
  },
  {
    "id": "section:/components:1",
    "type": "section",
    "sectionType": "text-only",
    "title": "Benefits of Components",
    "content": "Benefits of Components Component-based architecture provides several advantages: Reusability across projects Better testing isolation...",
    "url": "/components#benefits-of-components"
  }
]
```

### Traditional Long-Form Article

Content from a traditional blog post:

```markdown
---
title: 'Complete Metalsmith Guide'
description: 'Learn **everything** about Metalsmith static site generation'
summary: 'Comprehensive tutorial covering setup, plugins, and advanced techniques'
---

# Complete Metalsmith Guide

Metalsmith is a powerful static site generator built on JavaScript.

## Getting Started

Installation is straightforward with npm...

## Advanced Configuration

For complex sites, consider these patterns...

## Plugin Development

Creating custom plugins requires understanding the Metalsmith API...
```

**Generated Search Entries:**

- Page-level entry with processed frontmatter
- Section entries for each heading (Getting Started, Advanced Configuration, Plugin Development)
- Intelligent content chunking for long sections
- Generated anchor links for direct section access

## Debug

Enable debug logging to troubleshoot processing:

```bash
DEBUG=metalsmith-search* npm run build
```

Debug output shows:

- Files being processed
- Content extraction details
- Search entries generated
- Index statistics

## Testing and Coverage

```bash
# Build the plugin (required before testing)
npm run build

# Run all tests (ESM and CJS)
npm test

# Run with coverage
npm run test:coverage

# Test specific formats
npm run test:esm
npm run test:cjs
```

This project maintains comprehensive test coverage including:

- Component-based content extraction
- Traditional long-form content processing
- Frontmatter markdown processing
- Edge cases and error handling
- Both ESM and CommonJS compatibility

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the established patterns and add comprehensive tests
4. Ensure all tests pass and coverage remains high
5. Write clear commit messages following conventional commit format
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Setup

```bash
# Clone and install
git clone https://github.com/wernerglinka/metalsmith-search.git
cd metalsmith-search
npm install

# Build and test
npm run build
npm test

# Run enhanced test with real content
node -e "
import('./src/index.js').then(search => {
  import('metalsmith').then(Metalsmith => {
    Metalsmith('./test/fixtures/basic')
      .use(search.default())
      .build(console.log);
  });
});
"
```

## Migration from metalsmith-lunr

This plugin is a modern replacement for the deprecated metalsmith-lunr. Key improvements:

**✅ Advantages over metalsmith-lunr:**

- **No compatibility issues**: Works with current dependencies
- **Better search**: Fuse.js provides superior fuzzy matching
- **Smaller bundle**: 6.69kB vs 8.9kB (gzipped)
- **Component awareness**: Understands modern site architectures
- **Active maintenance**: Regular updates and bug fixes
- **Modern JavaScript**: ESM/CJS support, async processing

**Migration Guide:**

```js
// Old metalsmith-lunr
import lunr from 'metalsmith-lunr';

Metalsmith(__dirname).use(
  lunr({
    ref: 'title',
    fields: {
      contents: 1,
      title: 10,
    },
  })
);

// New metalsmith-search
import search from 'metalsmith-search';

Metalsmith(__dirname).use(
  search({
    fuseOptions: {
      keys: [
        { name: 'content', weight: 1 },
        { name: 'title', weight: 10 },
      ],
    },
  })
);
```

## License

MIT © [Werner Glinka](https://github.com/wernerglinka)

[metalsmith-badge]: https://img.shields.io/badge/metalsmith-plugin-green.svg?longCache=true
[metalsmith-url]: https://metalsmith.io
[npm-badge]: https://img.shields.io/npm/v/metalsmith-search.svg
[npm-url]: https://www.npmjs.com/package/metalsmith-search
[license-badge]: https://img.shields.io/github/license/wernerglinka/metalsmith-search
[license-url]: LICENSE
[coverage-badge]: https://img.shields.io/badge/test%20coverage-80%25-brightgreen
[coverage-url]: #testing-and-coverage
[modules-badge]: https://img.shields.io/badge/modules-ESM%2FCJS-blue

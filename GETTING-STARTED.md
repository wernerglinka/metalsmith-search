# Getting Started with metalsmith-search

This guide covers everything you need to know to implement search functionality in your Metalsmith
site using Fuse.js-powered fuzzy search with component-based indexing.

## Table of Contents

1. [Theory of Operation](#theory-of-operation)
2. [Quick Start](#quick-start)
3. [Usage Patterns](#usage-patterns)
4. [Advanced Features](#advanced-features)
5. [Client-Side Implementation](#client-side-implementation)
6. [Real-World Examples](#real-world-examples)
7. [Migration Guide](#migration-guide)

## Prerequisites

- Node.js 18 or higher
- An existing Metalsmith project
- Basic familiarity with Metalsmith plugins

## Theory of Operation

### Architecture Overview

**metalsmith-search** creates search indexes by understanding both traditional and structured
content Metalsmith site patterns. Unlike legacy plugins that treat pages as monolithic HTML
documents, this plugin recognizes the compositional nature of modern web content and is designed to
capture content before HTML processing.

### Content Processing Pipeline

1. **Clean Source Processing**: Plugin processes markdown files **before** HTML generation
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

### Smart Section Navigation

The plugin indexes content at different levels to provide precise search results:

**Page Results**: Find entire pages that match your search terms

**Section Results**: Find specific sections within pages that contain your search terms

When you click on a section result, the browser will:

1. **Navigate to the page** containing that section
2. **Scroll automatically** to the specific section
3. **Highlight the search term** within that section

This means you land exactly where the relevant content is, rather than having to scroll through an
entire page looking for your search term.

### Content Type Recognition

#### Component-Based Content

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

For structured content pages, the plugin extracts each section as a separate search entry with
proper component type classification.

#### Traditional Content

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

For long articles, the plugin automatically breaks content into smaller, logical sections at
headings and paragraph breaks. This means when you search for something in a 5,000-word article,
you'll jump directly to the relevant section instead of landing at the top and having to hunt
through the entire page.

#### Mixed Content (Hybrid Pattern)

Pages may combine both approaches - structured content sections in frontmatter plus traditional
markdown body content.

### Search Index Structure

Generated indexes follow this structure:

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

## Installation

```bash
npm install metalsmith-search
```

## Quick Start

### 1. Add the Plugin to Your Build

```javascript
// build.js or metalsmith.js
import Metalsmith from 'metalsmith';
import search from 'metalsmith-search';
import layouts from '@metalsmith/layouts';
import collections from '@metalsmith/collections';

const metalsmith = Metalsmith(__dirname)
  .source('src')
  .destination('dist')

  // Add search plugin EARLY for clean content (recommended)
  .use(
    search({
      // Defaults to '**/*.md' - processes clean markdown files
      indexLevels: ['page', 'section'],
    })
  )

  // Content processing happens AFTER search indexing
  .use(layouts()) // HTML generation after search
  .use(collections()) // Collections after search

  .build((err) => {
    if (err) throw err;
    console.log('Build complete with clean search index!');
  });
```

### 2. Build Your Site

```bash
node metalsmith.js
```

This creates `build/search-index.json` containing your searchable content extracted from clean
markdown files.

## Usage Patterns

### Component-Based Sites

For Metalsmith sites using structured frontmatter:

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

## Client-Side Implementation Example

### Basic HTML Structure

```html
<!-- search.html -->
<!DOCTYPE html>
<html>
  <head>
    <title>Search - My Site</title>
    <script src="https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js"></script>
  </head>
  <body>
    <div class="search-container">
      <input type="text" id="search-input" placeholder="Search..." />
      <div id="search-results"></div>
    </div>

    <script src="/js/search.js"></script>
  </body>
</html>
```

### JavaScript Search Implementation

Create `src/js/search.js`:

```javascript
// Search functionality using functions
let fuse = null;
let searchInput = null;
let searchResults = null;

// Initialize search when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initSearch();
});

async function initSearch() {
  try {
    // Get DOM elements
    searchInput = document.getElementById('search-input');
    searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) {
      console.error('Search elements not found');
      return;
    }

    // Load the search index
    const response = await fetch('/search-index.json');
    const searchData = await response.json();

    // Initialize Fuse.js with the index
    fuse = new Fuse(searchData.entries, searchData.config.fuseOptions);

    // Set up event listeners
    searchInput.addEventListener('input', handleSearch);

    console.log(`Search ready with ${searchData.searchData.length} entries`);
  } catch (error) {
    console.error('Failed to initialize search:', error);
  }
}

function handleSearch(event) {
  const query = event.target.value.trim();

  if (query.length < 2) {
    clearResults();
    return;
  }

  const results = fuse.search(query);
  displayResults(results);
}

function displayResults(results) {
  if (results.length === 0) {
    searchResults.innerHTML = '<p>No results found.</p>';
    return;
  }

  const resultsHTML = results
    .map((result) => {
      const item = result.item;
      const score = Math.round((1 - result.score) * 100);

      return `
      <div class="search-result">
        <h3><a href="${item.url}">${item.title}</a></h3>
        ${item.pageName ? `<div class="page-context">From: <strong>${item.pageName}</strong></div>` : ''}
        ${item.excerpt ? `<p class="excerpt">${item.excerpt}</p>` : ''}
        <div class="meta">
          <span class="score">Relevance: ${score}%</span>
          ${item.type ? `<span class="type">${item.type}</span>` : ''}
        </div>
      </div>
    `;
    })
    .join('');

  searchResults.innerHTML = resultsHTML;
}

function clearResults() {
  searchResults.innerHTML = '';
}
```

### Basic CSS Styling

Create `src/css/search.css`:

```css
.search-container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
}

#search-input {
  width: 100%;
  padding: 1rem;
  font-size: 1.1rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  margin-bottom: 2rem;
}

#search-input:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.1);
}

.search-result {
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.search-result:last-child {
  border-bottom: none;
}

.search-result h3 {
  margin: 0 0 0.5rem 0;
}

.search-result h3 a {
  color: #007acc;
  text-decoration: none;
}

.search-result h3 a:hover {
  text-decoration: underline;
}

.page-context {
  font-size: 0.85rem;
  color: #666;
  margin: 0.25rem 0 0.5rem 0;
  font-style: italic;
}

.excerpt {
  color: #666;
  line-height: 1.5;
  margin: 0.5rem 0;
}

.meta {
  font-size: 0.9rem;
  color: #888;
}

.meta .score {
  font-weight: bold;
  color: #007acc;
}

.meta .type {
  background: #f0f0f0;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  margin-left: 1rem;
}
```

## Configuration Options

### Basic Configuration

```javascript
.use(search({
  // Markdown files to index (default: '**/*.md')
  pattern: '**/*.md',

  // Output file
  indexPath: 'search-index.json',

  // What to index
  indexLevels: ['page', 'section'],

  // Component array field (default: 'sections')
  sectionsField: 'sections',

  // Auto-detection (default: true)
  autoDetectSectionTypes: true,
  sectionTypeField: 'sectionType',

  // Performance options
  batchSize: 10,
  async: false
}))
```

### Advanced Configuration

```javascript
.use(search({
  // File processing (markdown-first approach)
  pattern: '**/*.md',
  ignore: ['**/search-index.json'],

  // Index configuration
  indexPath: 'search-index.json',
  indexLevels: ['page', 'section'],
  sectionsField: 'sections',  // Customize component field name
  stripHtml: true,
  generateAnchors: true,

  // Content processing
  maxSectionLength: 2000,
  chunkSize: 1500,
  minSectionLength: 50,
  processMarkdownFields: true,
  frontmatterFields: ['summary', 'intro', 'leadIn'],

  // Enhanced Fuse.js options (with page-name prioritized search keys)
  fuseOptions: {
    keys: [
      { name: 'pageName', weight: 10 },   // Page context - highest priority
      { name: 'title', weight: 8 },       // Section titles
      { name: 'tags', weight: 6 },        // Content tags
      { name: 'leadIn', weight: 5 },      // Optional frontmatter
      { name: 'prose', weight: 3 },       // Optional frontmatter
      { name: 'content', weight: 1 }      // Generated full content
    ],
    threshold: 0.3,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 3  // Filter stop words
  },

  // Performance
  batchSize: 20,
  async: true
}))
```

## Content Types Supported

### Auto-Detection of Component Types

**Zero Configuration Required!** The plugin automatically discovers your component types:

```javascript
// Just add the plugin - it discovers everything automatically
.use(search())

// Debug to see what was discovered
DEBUG=metalsmith-search* node build.js
// Output: Auto-detected section types: hero, text-only, media-image, cta, traditional
```

**How Auto-Detection Works:**

1. **Scans all files** for component arrays (default field: `sections`)
2. **Discovers section types** from each component's `sectionType` field
3. **Generates field mappings** automatically for discovered types
4. **No manual updates** needed when adding new components

**Benefit:** Add new component types to your content and they're automatically indexed - no need to
update your metalsmith.js configuration!

### Custom Component Field Names

If your site uses a different field name for component arrays, configure it:

```javascript
.use(search({
  sectionsField: 'myComponents',  // Instead of default 'sections'
  indexLevels: ['page', 'section']
}))
```

**Frontmatter structure:**

```yaml
---
title: 'My Page'
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

### Modern Component-Based Sites

For sites using component-based architecture:

```yaml
---
title: 'My Page'
sections:
  - sectionType: hero
    text:
      title: 'Welcome'
      leadIn: 'Get started'
      prose: 'This is searchable content'
  - sectionType: text-only
    text:
      prose: 'More searchable content here'
---
```

### Traditional Markdown Sites

For traditional long-form content:

```yaml
---
title: 'My Article'
summary: 'Brief description with **markdown**'
tags: ['web', 'development']
---
# Article Title

Long-form content that gets automatically chunked for search...
```

## Plugin Position

**Important**: Place the search plugin before templates are applied:

```javascript
metalsmith
  // Search plugin goes EARLY (recommended)
  .use(
    search({
      // Processes clean markdown files
      // Default pattern: '**/*.md'
    })
  )

  .use(markdown()) // Convert markdown after indexing
  .use(layouts()) // Apply templates after indexing
  .use(collections()) // Organize content after indexing
  .use(assets()); // Process assets after indexing
```

This approach ensures search:

- Clean markdown source files
- Pure frontmatter metadata
- Content without HTML Tags pollution

## Advanced Features

### Page Context in Search Results

Every search entry includes a `pageName` field for better user experience. This helps users
understand which page each result comes from:

```yaml
---
# Use pageTitle for explicit search display control
pageTitle: 'Getting Started Guide'
title: 'Getting Started with Metalsmith Components'
seo:
  title: 'Complete Getting Started Guide - Learn Metalsmith'
---
```

The plugin uses smart fallback priority:

1. `pageTitle` - Explicit search display name
2. `seo.title` - SEO-optimized title
3. `title` - Basic page title
4. `'Untitled Page'` - Final fallback

### Deep Nested Content Extraction

The plugin automatically finds content at any nesting level in your component structures:

```yaml
sections:
  - sectionType: hero
    text: # Level 1: text.title found
      title: 'Hero Title'
      prose: 'Hero content'

  - sectionType: complex
    content: # Level 2: content.main.text.title found
      main:
        text:
          title: 'Deep Title'
          prose: 'Deep content'
```

No configuration needed - the plugin recursively searches all nested objects to find `title`,
`prose`, `leadIn`, and other content fields.

### Automatic Section Anchor Management

The plugin ensures perfect synchronization between search URLs and rendered HTML by automatically
adding missing section IDs to your frontmatter:

```yaml
sections:
  - sectionType: hero
    id: 'welcome-section' # Auto-generated from title
    text:
      title: 'Welcome Section'
      prose: 'Content here'
```

**Result:**

- Search index: `"url": "/page#welcome-section"`
- Template renders: `<section id="welcome-section">`

### Search Result Highlighting

Enhance your search results with match highlighting:

```javascript
function displayResults(results) {
  const resultsHTML = results
    .map((result) => {
      const item = result.item;

      // Highlight matched terms
      let title = item.title;
      let excerpt = item.excerpt || item.prose?.substring(0, 200) + '...';

      if (result.matches) {
        result.matches.forEach((match) => {
          const field = match.key;
          const indices = match.indices;

          if (field === 'title') {
            title = highlightMatches(title, indices);
          } else if (field === 'prose' || field === 'excerpt') {
            excerpt = highlightMatches(excerpt, indices);
          }
        });
      }

      return `
      <div class="search-result">
        <h3><a href="${item.url}">${title}</a></h3>
        <p class="excerpt">${excerpt}</p>
      </div>
    `;
    })
    .join('');

  searchResults.innerHTML = resultsHTML;
}

function highlightMatches(text, indices) {
  let result = text;
  let offset = 0;

  indices.forEach(([start, end]) => {
    const before = result.substring(0, start + offset);
    const match = result.substring(start + offset, end + 1 + offset);
    const after = result.substring(end + 1 + offset);

    result = before + `<mark>${match}</mark>` + after;
    offset += 13; // Length of <mark></mark> tags
  });

  return result;
}
```

### Search Categories

Filter results by content type:

```javascript
// Add category filtering to your search
function handleSearch(event) {
  const query = event.target.value.trim();
  const category = document.getElementById('category-filter').value;

  if (query.length < 2) {
    clearResults();
    return;
  }

  let results = fuse.search(query);

  // Filter by category if selected
  if (category && category !== 'all') {
    results = results.filter((result) => result.item.type === category);
  }

  displayResults(results);
}
```

## Real-World Examples

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

## Migration Guide

### Migration from metalsmith-lunr

This plugin is a modern replacement for the ancient metalsmith-lunr. Key improvements:

**Advantages over metalsmith-lunr:**

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

## Debugging

Enable debug logging to troubleshoot issues:

```bash
DEBUG=metalsmith-search node build.js
```

This shows detailed information about:

- Files being processed
- Content extraction
- Index generation
- Performance metrics

## Performance Tips

### For Large Sites

```javascript
.use(search({
  // Enable async processing
  async: true,
  batchSize: 50,

  // Optimize content chunking
  maxSectionLength: 1500,
  chunkSize: 1000,

  // Reduce index size,
  minSectionLength: 100
}))
```

### Production Optimization

```javascript
// Only run search indexing in production builds
const isProduction = process.env.NODE_ENV === 'production';

const metalsmith = Metalsmith(__dirname)
  .source('src')
  .destination('dist')
  .use(layouts())
  .use(collections());

if (isProduction) {
  metalsmith.use(
    search({
      pattern: '**/*.html',
      indexPath: 'search-index.json',
    })
  );
}

metalsmith.build((err) => {
  if (err) throw err;
  console.log('Build complete!');
});
```

## Troubleshooting

### Common Issues

**Empty search index:**

- Ensure the plugin runs on the correct file pattern (default: `**/*.md`)
- Check that your markdown files contain searchable content
- Verify frontmatter and content structure is valid

**Large bundle size:**

- Use `stripHtml: true` (default) to remove markup
- Increase `minSectionLength` to filter short content
- Consider `lazyLoad: true` for large indexes

**Poor search results:**

- Adjust `threshold` in `fuseOptions` (lower = more strict)
- Modify field weights to prioritize important content
- Ensure `content` field is included in search keys for comprehensive coverage
- Consider lowering `minMatchCharLength` if filtering too many relevant short terms

### Getting Help

If you encounter issues:

1. Enable debug logging: `DEBUG=metalsmith-search node build.js`
2. Check the generated `search-index.json` file
3. Verify your content structure matches the plugin's expectations
4. Review the [README.md](./README.md) for detailed API documentation

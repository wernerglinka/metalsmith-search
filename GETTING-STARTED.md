# Getting Started with metalsmith-search

This guide covers everything you need to implement fast, accurate search functionality in your
Metalsmith site. The plugin extracts content from rendered HTML and emits a Fuse.js-compatible
index that you wire up to Fuse on the client.

## Table of Contents

1. [Theory of Operation](#theory-of-operation)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Client-Side Implementation](#client-side-implementation)
5. [Advanced Features](#advanced-features)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 22 or higher
- An existing Metalsmith project
- Basic familiarity with Metalsmith plugins

## Theory of Operation

### Processing Pipeline

```
HTML Files (after layouts)
    ↓
Load with Cheerio (read-only; HTML is not modified)
    ↓
Remove excluded elements (nav, header, footer, …)
    ↓
Collect headings into the index entry:
  - existing id attribute → reused verbatim
  - no id → slug generated for the index entry only
    ↓
Extract text content, excerpt, word count
    ↓
Generate search-index.json
```

### Deep Linking with Headings

Each index entry carries a `headings` array describing the page's structure:

```json
{
  "url": "/docs/guide",
  "title": "Developer Guide",
  "headings": [
    { "level": "h2", "id": "getting-started", "title": "Getting Started" },
    { "level": "h2", "id": "installation", "title": "Installation" }
  ]
}
```

A client search component reads this to build deep-link URLs like
`/docs/guide#getting-started`. For the browser to actually scroll to the target
heading, **the rendered HTML must already have those `id` attributes** on the
heading elements (typically via a markdown anchor plugin upstream of
`metalsmith-search`), or the client must resolve anchors itself by matching the
slug against the headings array.

For the full contract and rationale see
[docs/THEORY.md](docs/THEORY.md).

## Installation

```bash
npm install metalsmith-search
```

## Quick Start

### 1. Add the Plugin to Your Build

**CRITICAL**: The plugin must run **AFTER** layouts/templates:

```javascript
// build.js or metalsmith.js
import Metalsmith from 'metalsmith';
import markdown from '@metalsmith/markdown';
import layouts from '@metalsmith/layouts';
import search from 'metalsmith-search';

const metalsmith = Metalsmith(import.meta.dirname)
  .source('src')
  .destination('dist')

  // Process content first
  .use(markdown())
  .use(layouts())

  // THEN index the HTML
  .use(
    search({
      pattern: '**/*.html',
      excludeSelectors: ['nav', 'header', 'footer'],
    })
  )

  .build((err) => {
    if (err) throw err;
    console.log('Build complete with search index!');
  });
```

### 2. Build Your Site

```bash
node metalsmith.js
```

This creates `dist/search-index.json` containing your searchable content.

### 3. View the Index

```bash
cat dist/search-index.json
```

Example output:

```json
{
  "version": "1.0.0",
  "generator": "metalsmith-search",
  "totalEntries": 5,
  "entries": [
    {
      "id": "page:/",
      "type": "page",
      "url": "/",
      "title": "Home",
      "content": "Welcome to our site...",
      "excerpt": "Welcome to our site...",
      "headings": [{ "level": "h1", "id": "welcome", "title": "Welcome" }],
      "wordCount": 150
    }
  ]
}
```

## Configuration

### Default Configuration

```javascript
.use(search({
  // HTML files to index
  pattern: '**/*.html',

  // Files to exclude
  ignore: ['**/search-index.json'],

  // Output file
  indexPath: 'search-index.json',

  // CSS selectors to exclude (optional chrome removal)
  excludeSelectors: ['nav', 'header', 'footer'],

  // Fuse.js configuration
  fuseOptions: {
    keys: [
      { name: 'title', weight: 10 },
      { name: 'content', weight: 5 },
      { name: 'excerpt', weight: 3 }
    ],
    threshold: 0.3,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 3
  }
}))
```

### Configuration Options

| Option             | Type               | Default                       | Description                           |
| ------------------ | ------------------ | ----------------------------- | ------------------------------------- |
| `pattern`          | `string\|string[]` | `'**/*.html'`                 | Files to index                        |
| `ignore`           | `string\|string[]` | `['**/search-index.json']`    | Files to exclude                      |
| `indexPath`        | `string`           | `'search-index.json'`         | Output file path                      |
| `excludeSelectors` | `string[]`         | `['nav', 'header', 'footer']` | CSS selectors to exclude from content |
| `fuseOptions`      | `object`           | See above                     | Fuse.js search configuration          |

### Customizing Excluded Content

By default, the plugin excludes navigation, headers, and footers. You can customize this:

```javascript
.use(search({
  // Remove more elements
  excludeSelectors: ['nav', 'header', 'footer', 'aside', '.advertisement'],

  // Or index everything (empty array)
  excludeSelectors: []
}))
```

### Customizing Search Behavior

Adjust Fuse.js options for different search characteristics:

```javascript
.use(search({
  fuseOptions: {
    // Stricter matching (lower threshold = more strict)
    threshold: 0.2,

    // Different field weights
    keys: [
      { name: 'title', weight: 10 },    // Prioritize titles
      { name: 'excerpt', weight: 5 },   // Then excerpts
      { name: 'content', weight: 1 }    // Then full content
    ],

    // Minimum match length (filter short words)
    minMatchCharLength: 2
  }
}))
```

## Client-Side Implementation

For a client-side reference implementation with linking to the found search term and result highlighting see the [Search Library Component](https://github.com/wernerglinka/metalsmith-components/tree/main/lib/layouts/components/_partials/search)
repo.

### Search Statistics

Display helpful statistics from the index:

```javascript
async function initSearch() {
  const response = await fetch('/search-index.json');
  const searchData = await response.json();

  // Display statistics
  console.log('Search Index Statistics:');
  console.log(`  Total entries: ${searchData.totalEntries}`);
  console.log(`  Average content length: ${searchData.stats.averageContentLength} chars`);
  console.log(`  Total content: ${searchData.stats.totalContentLength} chars`);

  // Initialize Fuse.js
  fuse = new Fuse(searchData.entries, searchData.config.fuseOptions);
}
```

## Debugging

Enable debug logging to troubleshoot issues:

```bash
DEBUG=metalsmith-search* node build.js
```

This shows detailed information about:

- Files being processed
- Headings collected and any index-only ids slugified
- Content extraction
- Index generation
- Performance metrics

Example output:

```
metalsmith-search Processing /docs/guide.html (URL: /docs/guide, title: Developer Guide)
metalsmith-search:extractor Generated index-only ID 'getting-started' for h2: Getting Started
metalsmith-search:extractor Extracted page entry with 5 headings and 450 words
```



## Next Steps

- Read [docs/THEORY.md](docs/THEORY.md) for deep dive into anchor generation
- Check [README.md](README.md) for complete API documentation
- See [test/fixtures/](test/fixtures/) for example HTML structures
- Explore Fuse.js documentation for advanced search features

## Getting Help

If you encounter issues:

1. Enable debug logging: `DEBUG=metalsmith-search* node build.js`
2. Inspect the generated `search-index.json` file
3. Verify plugin runs after layouts in your build pipeline
4. Check the [GitHub issues](https://github.com/wernerglinka/metalsmith-search/issues)

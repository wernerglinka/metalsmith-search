# Getting Started with metalsmith-search

This guide covers everything you need to implement fast, accurate search functionality in your
Metalsmith site using Fuse.js-powered fuzzy search with HTML-first indexing.

## Table of Contents

1. [Theory of Operation](#theory-of-operation)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Client-Side Implementation](#client-side-implementation)
5. [Advanced Features](#advanced-features)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18 or higher
- An existing Metalsmith project
- Basic familiarity with Metalsmith plugins

## Theory of Operation

### HTML-First Architecture

**metalsmith-search** processes **final rendered HTML** to create accurate search indexes. This
approach ensures you index exactly what users see in their browsers.

**Key Principle**: Process HTML after layouts and templates have been applied.

### Why HTML-First?

Traditional search plugins process markdown files before HTML generation, which creates several
problems:

- **Missing template content**: Navigation, headers, footers, and template-generated text are
  excluded
- **Incomplete context**: Content composed from multiple sources isn't captured
- **Architecture assumptions**: Requires specific frontmatter structures

The HTML-first approach solves these issues:

✅ **Accurate**: Indexes final rendered content ✅ **Simple**: Single HTML parsing path with Cheerio
✅ **Universal**: Works with any site architecture ✅ **Fast**: Cheerio parsing is faster than
complex regex operations ✅ **Maintainable**: No assumptions about content structure

### Processing Pipeline

```
HTML Files (after layouts)
    ↓
Load with Cheerio
    ↓
Remove excluded elements (nav, header, footer)
    ↓
Extract headings and generate IDs
    ↓
Extract text content
    ↓
Create search entries with:
  - Page title
  - Full content
  - Excerpt (first 250 chars)
  - Headings metadata
    ↓
Generate search-index.json
```

### Deep Linking with Headings

The plugin automatically generates IDs for headings without them, enabling deep linking to specific
sections:

```html
<!-- Input HTML -->
<h2>Getting Started</h2>

<!-- Modified by plugin -->
<h2 id="getting-started">Getting Started</h2>
```

The search index includes heading metadata:

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

Client-side code can use this to create deep links: `/docs/guide#getting-started`

For complete details on the anchor generation system, see
[THEORY-OPERATIONS.md](THEORY-OPERATIONS.md).

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

const metalsmith = Metalsmith(__dirname)
  .source('src')
  .destination('dist')

  // Process content first
  .use(markdown())
  .use(layouts())

  // THEN index the final HTML
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

### Basic HTML Structure

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Search</title>
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

### JavaScript Implementation

Create `src/js/search.js`:

```javascript
let fuse = null;
let searchInput = null;
let searchResults = null;

// Initialize when DOM is ready
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

    // Load search index
    const response = await fetch('/search-index.json');
    const searchData = await response.json();

    // Initialize Fuse.js
    fuse = new Fuse(searchData.entries, searchData.config.fuseOptions);

    // Set up event listener
    searchInput.addEventListener('input', handleSearch);

    console.log(`Search ready with ${searchData.totalEntries} entries`);
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
          ${item.excerpt ? `<p>${item.excerpt}</p>` : ''}
          <div class="meta">
            <span class="score">Relevance: ${score}%</span>
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

.search-result h3 a {
  color: #007acc;
  text-decoration: none;
}

.search-result h3 a:hover {
  text-decoration: underline;
}

.meta {
  font-size: 0.9rem;
  color: #888;
}

.meta .score {
  font-weight: bold;
  color: #007acc;
}
```

## Advanced Features

### Deep Linking to Sections

Use the headings metadata to create deep links:

```javascript
function buildDeepLink(entry, searchTerm) {
  // Check if search matches a specific heading
  const matchingHeading = entry.headings?.find((h) =>
    h.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (matchingHeading) {
    return `${entry.url}#${matchingHeading.id}`;
  }

  return entry.url;
}

function displayResults(results, searchTerm) {
  const resultsHTML = results
    .map((result) => {
      const item = result.item;
      const url = buildDeepLink(item, searchTerm);

      return `
        <div class="search-result">
          <h3><a href="${url}">${item.title}</a></h3>
          <p>${item.excerpt}</p>
        </div>
      `;
    })
    .join('');

  searchResults.innerHTML = resultsHTML;
}
```

### Search Result Highlighting

Highlight matched terms in results:

```javascript
function displayResults(results) {
  const resultsHTML = results
    .map((result) => {
      const item = result.item;
      let title = item.title;
      let excerpt = item.excerpt;

      // Highlight matches
      if (result.matches) {
        result.matches.forEach((match) => {
          if (match.key === 'title') {
            title = highlightMatches(title, match.indices);
          } else if (match.key === 'excerpt' || match.key === 'content') {
            excerpt = highlightMatches(excerpt, match.indices);
          }
        });
      }

      return `
        <div class="search-result">
          <h3><a href="${item.url}">${title}</a></h3>
          <p>${excerpt}</p>
        </div>
      `;
    })
    .join('');

  searchResults.innerHTML = resultsHTML;
}

function highlightMatches(text, indices) {
  if (!text) return '';

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

### Table of Contents from Headings

Generate a table of contents using heading metadata:

```javascript
function generateTOC(entry) {
  if (!entry.headings || entry.headings.length === 0) {
    return '';
  }

  return `
    <nav class="toc">
      <h4>On this page:</h4>
      <ul>
        ${entry.headings
          .map(
            (h) => `
          <li class="toc-${h.level}">
            <a href="${entry.url}#${h.id}">${h.title}</a>
          </li>
        `
          )
          .join('')}
      </ul>
    </nav>
  `;
}
```

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

## Real-World Examples

### Example: Documentation Site

```javascript
Metalsmith(__dirname)
  .source('src')
  .destination('dist')
  .use(markdown())
  .use(layouts())
  .use(
    search({
      pattern: '**/*.html',
      excludeSelectors: ['nav', 'header', 'footer', 'aside'],
      fuseOptions: {
        keys: [
          { name: 'title', weight: 10 },
          { name: 'content', weight: 5 },
          { name: 'excerpt', weight: 3 },
        ],
        threshold: 0.2, // Stricter for technical docs
      },
    })
  )
  .build((err) => {
    if (err) throw err;
  });
```

### Example: Blog

```javascript
Metalsmith(__dirname)
  .source('src')
  .destination('dist')
  .use(markdown())
  .use(layouts())
  .use(
    search({
      pattern: 'posts/**/*.html', // Only index blog posts
      excludeSelectors: ['nav', 'header', 'footer', '.comments'],
      fuseOptions: {
        keys: [
          { name: 'title', weight: 10 },
          { name: 'excerpt', weight: 8 },
          { name: 'content', weight: 3 },
        ],
        threshold: 0.3, // More fuzzy for blog content
      },
    })
  )
  .build((err) => {
    if (err) throw err;
  });
```

### Example: Marketing Site

```javascript
Metalsmith(__dirname)
  .source('src')
  .destination('dist')
  .use(markdown())
  .use(layouts())
  .use(
    search({
      pattern: '**/*.html',
      excludeSelectors: [], // Index everything, including nav
      fuseOptions: {
        keys: [
          { name: 'title', weight: 10 },
          { name: 'content', weight: 5 },
        ],
        threshold: 0.4, // Very fuzzy for marketing copy
      },
    })
  )
  .build((err) => {
    if (err) throw err;
  });
```

## Debugging

Enable debug logging to troubleshoot issues:

```bash
DEBUG=metalsmith-search* node build.js
```

This shows detailed information about:

- Files being processed
- Headings extracted and IDs generated
- Content extraction
- Index generation
- Performance metrics

Example output:

```
metalsmith-search Processing /docs/guide.html (URL: /docs/guide, title: Developer Guide)
metalsmith-search:extractor Generated ID 'getting-started' for h2: Getting Started
metalsmith-search:extractor Extracted page entry with 5 headings and 450 words
```

## Troubleshooting

### Empty Search Index

**Symptom**: `search-index.json` has no entries or is missing

**Solutions**:

1. Verify plugin runs **after** layouts:

   ```javascript
   .use(layouts())
   .use(search())  // Must be after layouts
   ```

2. Check the pattern matches your HTML files:

   ```bash
   DEBUG=metalsmith-search* node build.js
   ```

3. Ensure HTML files have text content (not just empty templates)

### Search Not Finding Results

**Symptom**: Search returns no results for valid queries

**Solutions**:

1. Lower the threshold (more lenient matching):

   ```javascript
   fuseOptions: {
     threshold: 0.6;
   }
   ```

2. Check that search keys include the right fields:

   ```javascript
   fuseOptions: {
     keys: [
       { name: 'title', weight: 10 },
       { name: 'content', weight: 5 }, // Make sure this exists
     ];
   }
   ```

3. Verify the search index contains content:
   ```bash
   cat dist/search-index.json | grep -A 5 content
   ```

### Headings Don't Have IDs

**Symptom**: Deep links don't work, headings don't have `id` attributes

**Explanation**: The plugin modifies HTML in the Metalsmith files object during the build. The IDs
are added to the output HTML files.

**Verification**:

```bash
# Check that generated HTML has IDs
cat dist/docs/guide.html | grep '<h2 id='
```

**Expected output**:

```html
<h2 id="getting-started">Getting Started</h2>
```

### Large Bundle Size

**Symptom**: `search-index.json` is very large

**Solutions**:

1. Exclude more content:

   ```javascript
   excludeSelectors: ['nav', 'header', 'footer', 'aside', '.comments', '.ads'];
   ```

2. Index only specific pages:

   ```javascript
   pattern: ['docs/**/*.html', 'blog/**/*.html'];
   ```

3. Consider server-side search for very large sites

## Performance Tips

### Production Builds

Only generate the search index in production:

```javascript
const isProduction = process.env.NODE_ENV === 'production';

const metalsmith = Metalsmith(__dirname).use(markdown()).use(layouts());

if (isProduction) {
  metalsmith.use(search());
}

metalsmith.build((err) => {
  if (err) throw err;
});
```

### CDN Caching

The search index is a static JSON file that can be cached:

```
Cache-Control: public, max-age=3600
```

### Lazy Loading

For large indexes, load them only when the search UI is opened:

```javascript
let fuse = null;

async function openSearch() {
  if (!fuse) {
    const response = await fetch('/search-index.json');
    const data = await response.json();
    fuse = new Fuse(data.entries, data.config.fuseOptions);
  }

  // Show search UI
}
```

## Next Steps

- Read [THEORY-OPERATIONS.md](THEORY-OPERATIONS.md) for deep dive into anchor generation
- Check [README.md](README.md) for complete API documentation
- See [test/fixtures/](test/fixtures/) for example HTML structures
- Explore Fuse.js documentation for advanced search features

## Getting Help

If you encounter issues:

1. Enable debug logging: `DEBUG=metalsmith-search* node build.js`
2. Inspect the generated `search-index.json` file
3. Verify plugin runs after layouts in your build pipeline
4. Check the [GitHub issues](https://github.com/wernerglinka/metalsmith-search/issues)

# Getting Started with Metalsmith Search

This guide walks you through adding modern fuzzy search capabilities to your Metalsmith site using `metalsmith-search` with its clean markdown-first approach.

## Prerequisites

- Node.js 18 or higher
- An existing Metalsmith project
- Basic familiarity with Metalsmith plugins

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
  .use(search({
    // Defaults to '**/*.md' - processes clean markdown files
    indexLevels: ['page', 'section']
  }))
  
  // Content processing happens AFTER search indexing
  .use(layouts())      // HTML generation after search
  .use(collections())  // Collections after search
  
  .build((err) => {
    if (err) throw err;
    console.log('Build complete with clean search index!');
  });
```

### 2. Build Your Site

```bash
node metalsmith.js
```

This creates `build/search-index.json` containing your searchable content extracted from clean markdown files.

## Client-Side Implementation

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

  const resultsHTML = results.map(result => {
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
  }).join('');

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

**Benefit:** Add new component types to your content and they're automatically indexed - no need to update your metalsmith.js configuration!

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
title: "My Page"
myComponents:  # Custom field name
  - sectionType: hero
    text:
      title: "Welcome"
      prose: "Content here"
  - sectionType: text-only
    text:
      prose: "More content"
---
```

Common alternative field names:
- `sections` (default)
- `components`
- `blocks` 
- `content`
- `myComponents`
- `pageComponents`

### Modern Component-Based Sites

For sites using component-based architecture:

```yaml
---
title: "My Page"
sections:
  - sectionType: hero
    text:
      title: "Welcome"
      leadIn: "Get started"
      prose: "This is searchable content"
  - sectionType: text-only
    text:
      prose: "More searchable content here"
---
```

### Traditional Markdown Sites

For traditional long-form content:

```yaml
---
title: "My Article"
summary: "Brief description with **markdown**"
tags: ["web", "development"]
---

# Article Title

Long-form content that gets automatically chunked for search...
```

## Pipeline Positioning

**Important**: Place the search plugin **early** in the pipeline for clean content:

```javascript
Metalsmith(__dirname)
  // Search plugin goes EARLY (recommended)
  .use(search({
    // Processes clean markdown files
    // Default pattern: '**/*.md'
  }))
  
  .use(markdown())      // Convert markdown after indexing
  .use(layouts())       // Apply templates after indexing
  .use(collections())   // Organize content after indexing
  .use(assets())        // Process assets after indexing
```

**Benefits of Early Pipeline Positioning:**
- ✅ **Clean Content**: Avoids HTML chrome (nav, headers, footers)
- ✅ **Better Search Results**: No irrelevant page structure in index
- ✅ **Smaller Index**: Only meaningful content is indexed
- ✅ **Faster Processing**: Less content to parse and clean

This approach ensures search processes:
- Clean markdown source files
- Pure frontmatter metadata
- Content without HTML pollution

## Advanced Features

### Page Context in Search Results

Every search entry now includes a `pageName` field for better user experience. This helps users understand which page each result comes from:

```yaml
---
# Use pageTitle for explicit search display control
pageTitle: "Getting Started Guide"
title: "Getting Started with Metalsmith Components"  
seo:
  title: "Complete Getting Started Guide - Learn Metalsmith"
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
    text:                    # ✅ Level 1: text.title found
      title: "Hero Title"
      prose: "Hero content"
      
  - sectionType: complex
    content:                 # ✅ Level 2: content.main.text.title found  
      main:
        text:
          title: "Deep Title"
          prose: "Deep content"
```

No configuration needed - the plugin recursively searches all nested objects to find `title`, `prose`, `leadIn`, and other content fields.

### Automatic Section Anchor Management

The plugin ensures perfect synchronization between search URLs and rendered HTML by automatically adding missing section IDs to your frontmatter:

**Your template:**
```html
<section id="{{ section.id }}">
  <h2>{{ section.text.title }}</h2>
</section>
```

**Plugin processing:**
- Detects missing `section.id` 
- Generates ID from section title: `"welcome-section"`
- Adds it to frontmatter: `section.id = "welcome-section"`
- Creates search URL: `"/page#welcome-section"`
- Template renders: `<section id="welcome-section">`
- **Links work perfectly!** ✅

### Search Result Highlighting

Enhance your search results with match highlighting:

```javascript
function displayResults(results) {
  const resultsHTML = results.map(result => {
    const item = result.item;
    
    // Highlight matched terms
    let title = item.title;
    let excerpt = item.excerpt || item.prose?.substring(0, 200) + '...';
    
    if (result.matches) {
      result.matches.forEach(match => {
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
  }).join('');
  
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
    results = results.filter(result => result.item.type === category);
  }
  
  displayResults(results);
}
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
  
  // Reduce index size
  stripHtml: true,
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
  metalsmith.use(search({
    pattern: '**/*.html',
    indexPath: 'search-index.json'
  }));
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
- Use `stripHtml: true` to remove markup
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

## Next Steps

- Customize the search UI to match your site's design
- Add advanced features like search suggestions or recent searches
- Implement search analytics to understand user behavior
- Consider adding search to your site's navigation

Happy searching! 🔍

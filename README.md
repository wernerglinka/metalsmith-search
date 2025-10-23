# metalsmith-search

[![metalsmith:plugin][metalsmith-badge]][metalsmith-url] [![npm: version][npm-badge]][npm-url]
[![license: MIT][license-badge]][license-url] [![test coverage][coverage-badge]][coverage-url]
[![ESM/CommonJS][modules-badge]][npm-url]
[![Known Vulnerabilities](https://snyk.io/test/npm/metalsmith-search/badge.svg)](https://snyk.io/test/npm/metalsmith-search)

An HTML-first Metalsmith search plugin with Fuse.js and Cheerio for accurate content indexing. For a
live example of Metasmith Search see the
[Metalsmith Component Library](https://ms-components-library.netlify.app/references/sections/search/)
website.

> **Version 0.2.0** introduces breaking changes with HTML-first architecture. See migration guide
> below.

## Features

- Processes final rendered HTML after layouts/templates
- Uses Cheerio for HTML parsing
- Configurable content exclusion via CSS selectors
- Page-level indexing with automatic heading extraction
- Automatic anchor ID generation for headings without IDs
- Integrates frontmatter fields into search index
- Powered by Fuse.js with configurable search keys
- Supports both ESM and CommonJS

## Installation

```bash
npm install metalsmith-search
```

## Usage

**IMPORTANT**: Place the search plugin **AFTER** layouts/templates in your pipeline:

```js
import Metalsmith from 'metalsmith';
import layouts from '@metalsmith/layouts';
import search from 'metalsmith-search';

Metalsmith(__dirname)
  .source('./src')
  .destination('./build')
  .use(layouts()) // HTML generation FIRST
  .use(
    search({
      // Search indexing AFTER layouts
      pattern: '**/*.html',
      excludeSelectors: ['nav', 'header', 'footer'], // Optional chrome removal
    })
  )
  .build((err) => {
    if (err) throw err;
    console.log('Build complete!');
  });
```

### Index Everything (Including Navigation)

```js
metalsmith.use(
  search({
    pattern: '**/*.html',
    excludeSelectors: [], // Index ALL content including nav/header/footer
    contentFields: ['title', 'description', 'summary'],
    fuseOptions: {
      keys: [
        { name: 'title', weight: 10 },
        { name: 'content', weight: 5 },
        { name: 'description', weight: 3 },
      ],
      minMatchCharLength: 3, // Filter stop words
    },
  })
);
```

**[Complete Documentation & Examples →](./GETTING-STARTED.md)**

## How It Works

The plugin processes HTML files **after** layouts/templates for accurate search indexing:

1. **HTML Parsing**: Uses Cheerio to parse final rendered HTML
2. **Content Exclusion**: Optionally removes nav, header, footer elements
3. **Content Extraction**: Extracts all text content from the page
4. **Heading Processing**: Finds all headings (h1-h6) and ensures they have IDs
5. **Index Generation**: Creates Fuse.js-compatible search index with:
   - Full page text content
   - Metadata from frontmatter
   - Headings array for scroll-to functionality
6. **Anchor Generation**: Automatically generates IDs for headings without them

## Options

| Option             | Type                 | Default                                          | Description                             |
| ------------------ | -------------------- | ------------------------------------------------ | --------------------------------------- |
| `pattern`          | `string \| string[]` | `'**/*.html'`                                    | HTML files to process                   |
| `ignore`           | `string \| string[]` | `['**/search-index.json']`                       | Files to ignore                         |
| `indexPath`        | `string`             | `'search-index.json'`                            | Output path for search index            |
| `excludeSelectors` | `string[]`           | `['nav', 'header', 'footer']`                    | CSS selectors to exclude from indexing  |
| `contentFields`    | `string[]`           | `['title', 'description', 'summary', 'excerpt']` | Frontmatter fields to include in search |
| `fuseOptions`      | `object`             | `{keys: [...], threshold: 0.3, ...}`             | Fuse.js configuration options           |

### Fuse.js Options

The `fuseOptions` object is passed directly to Fuse.js. The plugin includes optimized defaults:

```js
fuseOptions: {
  // Search sensitivity (0.0 = exact match, 1.0 = match anything)
  threshold: 0.3,

  // Search keys with weights
  keys: [
    { name: 'title', weight: 10 },      // Page titles (highest priority)
    { name: 'content', weight: 5 },     // Main text content
    { name: 'description', weight: 3 }, // Page descriptions
    { name: 'tags', weight: 7 },        // Content tags
  ],

  // Include match details and scores in results
  includeScore: true,
  includeMatches: true,

  // Stop word filtering - excludes words shorter than 3 characters
  minMatchCharLength: 3,  // Filters "to", "be", "or", "in", etc.
}
```

### Search Index Structure

Each page generates a single search entry with this structure:

```json
{
  "id": "page:/blog/post",
  "type": "page",
  "url": "/blog/post",
  "title": "Blog Post Title",
  "description": "Page description",
  "excerpt": "Brief excerpt...",
  "content": "All page text content...",
  "tags": ["javascript", "tutorial"],
  "headings": [
    { "level": "h2", "id": "introduction", "title": "Introduction" },
    { "level": "h3", "id": "overview", "title": "Overview" },
    { "level": "h2", "id": "conclusion", "title": "Conclusion" }
  ],
  "wordCount": 1523
}
```

**The `headings` array enables scroll-to functionality:**

- Fuse.js finds all matches within the page content
- Client-side JavaScript uses `headings` to determine which section each match is in
- Users can be scrolled to the nearest heading anchor

**Automatic ID generation:**

- Headings with existing IDs: preserved as-is
- Headings without IDs: automatically generated from heading text
- Duplicate prevention: adds `-2`, `-3` suffixes for uniqueness

## Examples

For comprehensive examples including client-side implementation, component-based sites, traditional
sites, and advanced features, see **[GETTING-STARTED.md](./GETTING-STARTED.md)**.

## Debug

To enable debug logs, set the `DEBUG` environment variable to `metalsmith-search*`:

```javascript
metalsmith.env('DEBUG', 'metalsmith-search*');
```

## Migration from v0.1.x

Version 0.2.0 introduces breaking changes with HTML-first architecture:

### Breaking Changes

1. **Pattern default changed**: `**/*.md` → `**/*.html`
2. **Pipeline position**: Before layouts → After layouts
3. **Removed options**: `async`, `batchSize`, `lazyLoad`, `processMarkdownFields`, `sectionsField`,
   `sectionTypeField`, `autoDetectSectionTypes`, `componentFields`, `maxSectionLength`, `chunkSize`,
   `minSectionLength`, `frontmatterFields`
4. **New options**: `excludeSelectors`, `contentFields`
5. **New dependency**: Cheerio added for HTML parsing

### Migration Steps

**Before (v0.1.x):**

```js
metalsmith
  .use(
    search({
      pattern: '**/*.md',
      indexLevels: ['page', 'section'],
      sectionsField: 'sections',
    })
  )
  .use(layouts());
```

**After (v0.2.0):**

```js
metalsmith
  .use(layouts()) // Move layouts BEFORE search
  .use(
    search({
      pattern: '**/*.html', // Change to HTML
      indexLevels: ['page', 'section'],
      excludeSelectors: ['nav', 'header', 'footer'], // Optional
      contentFields: ['title', 'description'], // Configurable
    })
  );
```

## Migration from metalsmith-lunr

This plugin is a modern replacement for the deprecated metalsmith-lunr:

**Advantages:**

- **Better search**: Fuse.js provides fuzzy matching
- **Accurate indexing**: Cheerio HTML parsing
- **Smaller bundle**: More efficient than Lunr.js
- **Active maintenance**: Regular updates and bug fixes
- **Modern JavaScript**: ESM/CJS support

**Migration:**

```js
// Old metalsmith-lunr
import lunr from 'metalsmith-lunr';

Metalsmith(__dirname)
  .use(markdown())
  .use(
    lunr({
      ref: 'title',
      fields: { contents: 1, title: 10 },
    })
  );

// New metalsmith-search
import search from 'metalsmith-search';

Metalsmith(__dirname)
  .use(markdown())
  .use(layouts()) // Add layouts
  .use(
    search({
      pattern: '**/*.html', // HTML not markdown
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
[coverage-badge]: https://img.shields.io/badge/test%20coverage-97%25-brightgreen
[coverage-url]: #testing-and-coverage
[modules-badge]: https://img.shields.io/badge/modules-ESM%2FCJS-blue

# metalsmith-search

[![metalsmith:plugin][metalsmith-badge]][metalsmith-url] [![npm: version][npm-badge]][npm-url]
[![license: MIT][license-badge]][license-url] [![test coverage][coverage-badge]][coverage-url]
[![ESM/CommonJS][modules-badge]][npm-url]
[![Known Vulnerabilities](https://snyk.io/test/npm/metalsmith-search/badge.svg)](https://snyk.io/test/npm/metalsmith-search)

A Metalsmith search plugin with Fuse.js, component-based indexing, and markdown-first approach

> This Metalsmith plugin is under active development. The API is stable, but breaking changes may
> occur before reaching 1.0.0.

## Features

- **Markdown-First Design**: Optimized for content extraction before HTML generation
- **Modern Search**: Powered by Fuse.js with page-name prioritized search keys and stop word
  filtering
- **Component-Aware**: Understands component-based Metalsmith architectures with nested content
  extraction
- **Traditional Support**: Handles long-form markdown content with chunking
- **Chrome-Free Indexing**: Avoids navigation, header, and footer pollution in search results
- **Page Context**: Every search entry includes `pageName` field for user-friendly result display
- **Auto IDs**: Automatically generates missing section IDs for navigating directly to page section
  with found search term.
- **Deep Content Extraction**: Finds content at any nesting level (`section.text.title`,
  `section.content.main.text.prose`)
- **Stop Word Filtering**: Filters common words, like "a," "an, "in," "on," "of," and "or"
- **Target Anchor Links**: Modifies frontmatter to ensure search URLs match rendered HTML IDs
- **Performance Optimized**: Lazy loading, batch processing, and efficient indexing
- **ESM and CommonJS support**:
  - ESM: `import bundledComponents from 'metalsmith-bundled-components'`
  - CommonJS: `const bundledComponents = require('metalsmith-bundled-components')`

## Installation

```bash
npm install metalsmith-search
```

## Usage

```js
metalsmith
  .source('./src')
  .destination('./build')
  .use(
    search({
      pattern: '**/*.md',
      indexLevels: ['page', 'section'],
      generateAnchors: true,
    })
  )
  .build((err) => {
    if (err) throw err;
    console.log('Build complete!');
  });
```

### Component-Based Sites

```js
metalsmith
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

**[Complete Documentation & Examples →](./GETTING-STARTED.md)**

## How It Works

The plugin processes markdown files **before** HTML generation to create clean, searchable indexes:

1. **Content Analysis**: Examines each markdown file to determine its content architecture
2. **Multi-Level Extraction**: Extracts content from both component-based frontmatter and
   traditional markdown
3. **Content Processing**: Handles markdown syntax in frontmatter fields and generates clean text
4. **Index Generation**: Creates Fuse.js-compatible search indexes
5. **Anchor Management**: Generates section IDs for direct linking

### Plugin Position

**Important**: Place the search plugin before templates are applied:

```js
metalsmith
  .use(search()) // Process clean markdown FIRST
  .use(layouts()) // HTML generation AFTER indexing
  .use(collections())
  .build();
```

**Benefits**: Clean content without HTML tags, smaller indexes, better search results.

For detailed architecture information, usage patterns, and examples, see
**[GETTING-STARTED.md](./GETTING-STARTED.md)**.

## Options

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

## Examples

For comprehensive examples including client-side implementation, component-based sites, traditional
sites, and advanced features, see **[GETTING-STARTED.md](./GETTING-STARTED.md)**.

## Debug

To enable debug logs, set the DEBUG environment variable to `metalsmith-search*`:

```javascript
metalsmith.env('DEBUG', 'metalsmith-search*');
```

Or via command line:

```bash
DEBUG=metalsmith-search* npm run build
```

## Migration from metalsmith-lunr

This plugin is a modern replacement for the deprecated metalsmith-lunr. Key improvements:

**Advantages over metalsmith-lunr:**

- **No compatibility issues**: Works with current dependencies
- **Better search**: Fuse.js provides fuzzy matching
- **Smaller bundle**: 6.69kB vs 8.9kB (gzipped)
- **Component awareness**: Understands component site architectures
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
[coverage-badge]: https://img.shields.io/badge/test%20coverage-90%25-brightgreen
[coverage-url]: #testing-and-coverage
[modules-badge]: https://img.shields.io/badge/modules-ESM%2FCJS-blue

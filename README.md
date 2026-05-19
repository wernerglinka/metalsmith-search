# metalsmith-search

[![metalsmith:plugin][metalsmith-badge]][metalsmith-url] [![npm: version][npm-badge]][npm-url]
[![license: MIT][license-badge]][license-url] [![test coverage][coverage-badge]][coverage-url]

An HTML-first Metalsmith search plugin that uses Cheerio to extract content from final rendered
HTML and emits a Fuse.js-compatible JSON index for client-side search. For a live example see the
[Metalsmith Component Library](https://ms-components-library.netlify.app/references/sections/search/)
website.

> **Version 1.0.0** is ESM-only and requires Node.js 22+. Fuse.js is no longer bundled — install it
> separately on the client. See the migration guide below.

## Features

- Processes final rendered HTML after layouts/templates
- Uses Cheerio for HTML parsing
- Configurable content exclusion via CSS selectors
- Page-level indexing with automatic heading extraction
- Slugified anchor ids generated in the index for headings without an `id` attribute
- Emits a Fuse.js-compatible index with configurable search keys (Fuse runs client-side)
- ESM-only (Node.js 22+)

## Installation

```bash
npm install metalsmith-search
```

The plugin generates a Fuse.js-compatible JSON index at build time but does not depend on Fuse.js
itself. To consume the index in the browser, install Fuse.js in your site separately:

```bash
npm install fuse.js
```

## Usage

**IMPORTANT**: Place the search plugin **AFTER** layouts/templates in your pipeline:

```js
import Metalsmith from 'metalsmith';
import layouts from '@metalsmith/layouts';
import search from 'metalsmith-search';

Metalsmith(import.meta.dirname)
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
    fuseOptions: {
      keys: [
        { name: 'title', weight: 10 },
        { name: 'content', weight: 5 }
      ],
      minMatchCharLength: 3, // Filter stop words
    },
  })
);
```

**[Complete Documentation & Examples →](./GETTING-STARTED.md)**

## How It Works

The plugin processes HTML files **after** layouts/templates for accurate search indexing:

1. **HTML Parsing**: Uses Cheerio to parse the final rendered HTML.
2. **Content Exclusion**: Optionally removes elements matching `excludeSelectors`
   (defaults to `nav`, `header`, `footer`).
3. **Content Extraction**: Pulls all remaining text content for the index entry.
4. **Heading Collection**: Walks every `h1`–`h6` and records `{level, id, title}`
   in the entry's `headings` array. If a heading carries an `id` attribute that id
   is reused; otherwise a slugified id is generated for the index entry. The
   rendered HTML is not modified — see [Heading IDs](#heading-ids).
5. **Index Generation**: Emits a Fuse.js-compatible `search-index.json` containing
   the page text, excerpt, word count, headings metadata, and the Fuse config the
   client should use to query it.

## Options

| Option             | Type                 | Default                                          | Description                             |
| ------------------ | -------------------- | ------------------------------------------------ | --------------------------------------- |
| `pattern`          | `string \| string[]` | `'**/*.html'`                                    | HTML files to process                   |
| `ignore`           | `string \| string[]` | `['**/search-index.json']`                       | Files to ignore                         |
| `indexPath`        | `string`             | `'search-index.json'`                            | Output path for search index            |
| `excludeSelectors` | `string[]`           | `['nav', 'header', 'footer']`                    | CSS selectors to exclude from indexing  |
| `fuseOptions`      | `object`             | `{keys: [...], threshold: 0.3, ...}`             | Fuse.js configuration options           |

### Fuse.js Options

The `fuseOptions` object is passed directly to Fuse.js. The plugin includes optimized defaults:

```js
fuseOptions: {
  // Search sensitivity (0.0 = exact match, 1.0 = match anything)
  threshold: 0.3,

  // Search keys with weights (must match fields produced by the extractor)
  keys: [
    { name: 'title', weight: 10 },   // Page title from <title> or <h1>
    { name: 'content', weight: 5 },  // All page text content
    { name: 'excerpt', weight: 3 }   // Auto-generated excerpt
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
  "excerpt": "Brief excerpt...",
  "content": "All page text content...",
  "headings": [
    { "level": "h2", "id": "introduction", "title": "Introduction" },
    { "level": "h3", "id": "overview", "title": "Overview" },
    { "level": "h2", "id": "conclusion", "title": "Conclusion" }
  ],
  "wordCount": 1523
}
```

### Heading IDs

The plugin does **not** modify your HTML files. It reads the rendered HTML and emits
the `headings` array on each index entry:

- Headings with an `id` attribute: the existing `id` is recorded verbatim.
- Headings without an `id`: a URL-safe slug is generated from the heading text and
  recorded in the index entry only. `-1`, `-2` suffixes are appended to keep ids
  unique within a page.

For a deep link like `/page#some-id` to actually scroll the browser to that heading,
the rendered HTML must have an element with that `id`. Two ways to make that work:

1. **Render with auto-anchored headings.** Run a markdown plugin (e.g.
   `markdown-it-anchor`) or layout helper that adds `id` attributes during build,
   before this plugin sees the HTML. The plugin will reuse those ids verbatim.
2. **Resolve client-side.** Read the index's `headings` array in your search
   component and scroll / highlight by matching the slug against heading text,
   without relying on DOM `id` attributes. The
   [reference search component](https://github.com/wernerglinka/metalsmith-components/tree/main/lib/layouts/components/_partials/search)
   takes this approach.

## Examples

For comprehensive examples including client-side implementation, component-based sites, traditional
sites, and features, see **[GETTING-STARTED.md](./GETTING-STARTED.md)**.

## Test Coverage

Run the test suite with coverage via `npm run coverage`. The plugin uses Node's
native test runner and built-in coverage reporter; the coverage badge above is
updated by CI on each merge to `main`.

## Debug

To enable debug logs, set the `DEBUG` environment variable to `metalsmith-search*`:

```javascript
metalsmith.env('DEBUG', 'metalsmith-search*');
```

## Migration from v0.x to v1.0

Version 1.0.0 modernizes the toolchain and trims the public surface.

### Breaking Changes

1. **ESM only.** The CommonJS build is gone. Use `import search from 'metalsmith-search'` from an
   ESM project.
2. **Node.js 22+ required.** Earlier versions are unsupported.
3. **Fuse.js is no longer a runtime dependency.** The plugin still produces a Fuse-compatible
   index, but consumers must `npm install fuse.js` separately on the client.
4. **`contentFields` option removed.** Frontmatter fields are no longer indexed; the plugin
   processes only final rendered HTML. Move searchable content into your templates.
5. **Search index schema bumped to `2.0.0`.** The entry shape no longer includes `description`,
   `tags`, `date`, or `author` — only fields the HTML extractor produces (`id`, `type`, `url`,
   `title`, `content`, `excerpt`, `headings`, `wordCount`). Update any client code that reads
   those legacy fields.

### Migration from v0.1.x (HTML-first architecture)

If you are still on v0.1.x, you also need the v0.2.0 changes:

- **Pattern default changed**: `**/*.md` → `**/*.html`
- **Pipeline position**: place `search()` **after** `layouts()`
- **Options removed**: `async`, `batchSize`, `lazyLoad`, `processMarkdownFields`, `sectionsField`,
  `sectionTypeField`, `autoDetectSectionTypes`, `componentFields`, `maxSectionLength`,
  `chunkSize`, `minSectionLength`, `frontmatterFields`
- **Option added**: `excludeSelectors`

## Migration from metalsmith-lunr

This plugin is a modern replacement for the deprecated metalsmith-lunr:

**Advantages:**

- **Better search**: Fuse.js provides fuzzy matching
- **Accurate indexing**: Cheerio HTML parsing
- **Smaller bundle**: More efficient than Lunr.js
- **Active maintenance**: Regular updates and bug fixes
- **Modern JavaScript**: ESM-only, Node.js 22+

**Migration:**

```js
// Old metalsmith-lunr
import lunr from 'metalsmith-lunr';

Metalsmith(import.meta.dirname)
  .use(markdown())
  .use(
    lunr({
      ref: 'title',
      fields: { contents: 1, title: 10 },
    })
  );

// New metalsmith-search
import search from 'metalsmith-search';

Metalsmith(import.meta.dirname)
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
[coverage-url]: #test-coverage

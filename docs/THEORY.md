# Theory of Operations: Heading Metadata & Deep Linking

## Overview

The `metalsmith-search` plugin extracts content from final rendered HTML and emits a
Fuse.js-compatible JSON index. As part of that index, every page entry carries a
`headings` array describing the page's heading structure. This array is the
foundation for deep-linking search results to specific sections:

```
Search: "visual storytelling"
Result link: /docs/guide#visual-storytelling
```

This document explains how the heading metadata is built, what guarantees the plugin
does and does not make about the rendered HTML, and how consumers wire up the deep
links on the client side.

## Architecture: Index-Only

The plugin operates in a single pass during the Metalsmith build:

```
HTML Input (post-layouts)
    ↓
Load with Cheerio (in-memory parse, never serialized back)
    ↓
Optionally remove excludeSelectors (nav, header, footer, …)
    ↓
Collect h1-h6 headings → headings: [{ level, id, title }, …]
    ↓
Extract page text, build excerpt and wordCount
    ↓
Emit search-index.json
```

**The rendered HTML is not modified.** The Cheerio DOM is used to read content and
walk headings; `file.contents` is never written back. If the input HTML already
has `id` attributes on its headings, those ids are reused verbatim in the index.
If a heading has no `id`, the plugin generates a slug (purely for the index entry)
so consumers still have a stable anchor to target — see
[Consumer Contract for Heading IDs](#consumer-contract-for-heading-ids) below.

## Heading Collection

**Location**: `src/processors/content-extractor.js:extractAndProcessHeadings()`

For each `h1`–`h6` element:

1. If the element has an `id` attribute, that id is recorded in the headings array.
2. If it has no `id`, `generateAnchorId(title)` slugifies the text content. A
   `-1`, `-2`, … suffix is appended if the slug is already in use on the same page.
3. An entry `{ level, id, title }` is pushed onto the page's headings array.

Empty / whitespace-only headings are skipped.

### Example

For this input HTML:

```html
<h1>Getting Started</h1>
<h2 id="install">Installation</h2>
<h2>Installation</h2>     <!-- duplicate title -->
<h2></h2>                  <!-- empty: skipped -->
```

…the search-index entry's `headings` array contains:

```json
[
  { "level": "h1", "id": "getting-started", "title": "Getting Started" },
  { "level": "h2", "id": "install",         "title": "Installation"   },
  { "level": "h2", "id": "installation",    "title": "Installation"   }
]
```

Note that the second `<h2>`'s existing `id="install"` is reused untouched, while the
third gets a freshly-slugified `installation`. The rendered HTML is unchanged.

## Consumer Contract for Heading IDs

The `id` values in the search index are best understood as **stable slugs**, not as
a guarantee that those ids exist as `id=` attributes on the rendered page. For a
link like `/docs/guide#installation` to actually scroll the user to the right
heading, one of two things must be true:

1. **The rendered HTML already has those ids on its heading elements.** Achieve this
   upstream of `metalsmith-search`: render markdown with a heading-anchor plugin
   (e.g. `markdown-it-anchor` configured with the same slug rules), or have layouts
   emit `id` attributes directly. The plugin will read those ids verbatim and the
   browser will resolve the `#anchor` natively.

2. **The client resolves anchors itself.** A search component can read the index's
   `headings` array, match an incoming `#slug` against `headings[].id`, and
   scroll / highlight the corresponding heading element by text rather than by DOM
   id. The reference implementation at
   [metalsmith-components/search](https://github.com/wernerglinka/metalsmith-components/tree/main/lib/layouts/components/_partials/search)
   does this — it works against any HTML, regardless of whether the original
   headings carried `id` attributes.

Either path is supported. Most sites pick whichever fits their existing
markdown / templating pipeline; component-based sites tend toward option 2 because
the search component already owns the scroll/highlight behaviour.

---

## Anchor ID Generation Algorithm

### Location

`src/utils/anchor-generator.js:generateAnchorId()`

### Transformation Pipeline

```
Input: "Getting Started: Chapter 3"
    ↓
cleanTextForAnchor()
  - Convert to lowercase
  - Strip HTML tags
  - Remove special characters
  - Replace spaces with separator
  - Normalize multiple separators
  - Trim edge separators
    ↓
Result: "getting-started-chapter-3"
    ↓
processNumbers() [if allowNumbers: false]
    ↓
truncateText() [if over maxLength]
    ↓
addPrefix() [if prefix specified]
    ↓
addSuffix() [if suffix specified]
    ↓
ensureValidAnchor() [fallback to 'section']
    ↓
Output: "getting-started-chapter-3"
```

### Default Configuration

```javascript
{
  maxLength: 50,        // Maximum anchor length
  prefix: '',           // Optional prefix
  suffix: '',           // Optional suffix
  allowNumbers: true,   // Include numbers in anchor
  separator: '-'        // Word separator
}
```

### Transformation Examples

| Input                                              | Output                  | Notes                       |
| -------------------------------------------------- | ----------------------- | --------------------------- |
| `"Getting Started"`                                | `"getting-started"`     | Basic case                  |
| `"API & Configuration"`                            | `"api-configuration"`   | Special chars removed       |
| `"<strong>Important!</strong>"`                    | `"important"`           | HTML stripped               |
| `"Chapter 5"`                                      | `"chapter-5"`           | Numbers preserved (default) |
| `"Chapter 5"` (allowNumbers: false)                | `"chapter-"`            | Numbers removed             |
| `"This is a very long heading..."` (maxLength: 20) | `"this-is-a-very-long"` | Truncated                   |
| `null`                                             | `"section"`             | Fallback for invalid input  |

---

## Search Index Generation

### Data Structure

The search index includes heading metadata for each page:

```json
{
  "entries": [
    {
      "id": "page:/docs/guide",
      "type": "page",
      "url": "/docs/guide",
      "title": "Getting Started Guide",
      "content": "Full page text content...",
      "excerpt": "First 250 characters...",
      "headings": [
        {
          "level": "h1",
          "id": "getting-started",
          "title": "Getting Started"
        },
        {
          "level": "h2",
          "id": "installation",
          "title": "Installation"
        },
        {
          "level": "h2",
          "id": "installation-1",
          "title": "Installation"
        },
        {
          "level": "h2",
          "id": "configuration",
          "title": "Configuration"
        }
      ],
      "wordCount": 450
    }
  ]
}
```

### Heading Metadata Fields

- **level** (`string`): Heading tag name (`h1`, `h2`, `h3`, etc.)
- **id** (`string`): URL-safe anchor ID (matches HTML id attribute)
- **title** (`string`): Original heading text content

## Client-Side Integration

### Search Index Usage

The search index is loaded client-side for fuzzy searching:

```javascript
// Load the search index
fetch('/search-index.json')
  .then((response) => response.json())
  .then((data) => {
    // Initialize Fuse.js with the entries
    const fuse = new Fuse(data.entries, data.config.fuseOptions);

    // User searches
    const results = fuse.search('installation');
  });
```

### Building Deep Links

```javascript
function buildDeepLink(entry, searchTerm) {
  // Check if search term matches a heading
  const matchingHeading = entry.headings.find((h) =>
    h.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (matchingHeading) {
    // Return deep link to specific section
    return `${entry.url}#${matchingHeading.id}`;
  }

  // Return page-level link
  return entry.url;
}

// Example usage
const entry = {
  url: '/docs/guide',
  headings: [{ level: 'h2', id: 'installation', title: 'Installation' }],
};

buildDeepLink(entry, 'installation');
// → "/docs/guide#installation"
```

### Enhanced Search Results

```javascript
function renderSearchResult(entry, searchTerm) {
  const url = buildDeepLink(entry, searchTerm);

  return `
    <div class="search-result">
      <a href="${url}">
        <h3>${entry.title}</h3>
        <p>${entry.excerpt}</p>
      </a>
    </div>
  `;
}
```

### Table of Contents Generation

The headings metadata can also generate table of contents:

```javascript
function generateTOC(entry) {
  return entry.headings
    .map(
      (h) => `
    <li class="toc-${h.level}">
      <a href="${entry.url}#${h.id}">${h.title}</a>
    </li>
  `
    )
    .join('\n');
}

// Output:
// <li class="toc-h1"><a href="/docs/guide#getting-started">Getting Started</a></li>
// <li class="toc-h2"><a href="/docs/guide#installation">Installation</a></li>
```

## Edge Cases Handled

### 1. Empty or Whitespace-Only Headings

```html
<h2></h2>
```

**Handling**:

```javascript
const title = $heading.text().trim();

if (!title) {
  return; // Skip empty headings
}
```

### 2. Headings with HTML Tags

```html
<h2>Getting <strong>Started</strong></h2>
```

**Processing**:

```javascript
cleanTextForAnchor('Getting <strong>Started</strong>', '-');
// → "getting-started"
```

### 3. Non-ASCII Characters

```html
<h2>Über uns</h2>
```

**Processing**:

```javascript
// Special characters removed
cleanTextForAnchor('Über uns', '-');
// → "ber-uns"
```

### 4. Very Long Headings

```html
<h2>This is an extremely long heading that would create an unwieldy anchor ID</h2>
```

**Processing**:

```javascript
truncateText('this-is-an-extremely-long-heading...', 50, '-');
// → "this-is-an-extremely-long-heading-that-would"
```

---

## Conclusion

The anchor generation system provides a robust foundation for deep linking in search results.

This system transforms basic page-level search into precise section-level navigation, significantly
improving user experience.

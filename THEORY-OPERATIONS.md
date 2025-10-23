# Theory of Operations: Anchor Generation & Deep Linking

## Overview

The metalsmith-search plugin implements a sophisticated anchor generation system that enables **deep
linking to specific sections within pages**. This document explains the theory, implementation, and
client-side integration of this system.

## The Problem

Traditional search plugins only return page-level results:

```
Search: "visual storytelling"
Result: /docs/guide → User lands on page, must manually find section
```

This creates poor user experience because:

- Users must scroll to find relevant content
- No visual indication of where the match occurred
- Longer pages become difficult to navigate from search results

## The Solution: Deep Linking

The plugin implements **heading-based deep linking** that allows search results to point directly to
sections:

```
Search: "visual storytelling"
Result: /docs/guide#visual-storytelling → Browser scrolls directly to section
```

## Architecture: Two-Phase System

The system operates in two phases during the Metalsmith build:

### Phase 1: HTML Modification (Build-Time)

The plugin modifies HTML files to ensure all headings have unique IDs.

### Phase 2: Index Generation (Build-Time)

The plugin captures heading metadata in the search index for client-side use.

---

## Phase 1: HTML Modification

### Process Flow

```
HTML Input
    ↓
Load with Cheerio
    ↓
Find all headings (h1-h6)
    ↓
For each heading:
  - Has ID? → Keep it
  - No ID? → Generate one
    ↓
Add ID to HTML element
    ↓
Modified HTML Output
```

### Implementation

**Location**: `src/processors/content-extractor.js:extractAndProcessHeadings()`

**Code Flow**:

```javascript
function extractAndProcessHeadings($, debug) {
  const headings = [];
  const usedIds = new Set(); // Prevent duplicates

  $('h1, h2, h3, h4, h5, h6').each((index, el) => {
    const $heading = $(el);
    const title = $heading.text().trim();

    // Get existing ID or generate new one
    let id = $heading.attr('id');

    if (!id) {
      id = generateAnchorId(title);

      // Ensure uniqueness
      let uniqueId = id;
      let counter = 1;
      while (usedIds.has(uniqueId)) {
        uniqueId = `${id}-${counter}`;
        counter++;
      }
      id = uniqueId;

      // CRITICAL: Modify the HTML
      $heading.attr('id', id);
    }

    usedIds.add(id);
    headings.push({ level, id, title });
  });

  return headings;
}
```

### Example Transformation

**Input HTML**:

```html
<!DOCTYPE html>
<html>
  <body>
    <h1>Getting Started</h1>
    <p>Introduction text...</p>

    <h2>Installation</h2>
    <p>Install instructions...</p>

    <h2>Installation</h2>
    <!-- Duplicate -->
    <p>Alternative method...</p>
  </body>
</html>
```

**Output HTML** (modified during build):

```html
<!DOCTYPE html>
<html>
  <body>
    <h1 id="getting-started">Getting Started</h1>
    <p>Introduction text...</p>

    <h2 id="installation">Installation</h2>
    <p>Install instructions...</p>

    <h2 id="installation-1">Installation</h2>
    <p>Alternative method...</p>
  </body>
</html>
```

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

## Phase 2: Search Index Generation

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

---

## Uniqueness Guarantee

### Problem: Duplicate Headings

Real-world pages often have duplicate headings:

```html
<h2>Introduction</h2>
<h2>Introduction</h2>
<h2>Introduction</h2>
```

Without uniqueness handling, all three would get `id="introduction"`, causing:

- Invalid HTML (duplicate IDs)
- Browser navigation issues
- Search result ambiguity

### Solution: Counter Suffix

```javascript
let uniqueId = id;
let counter = 1;
while (usedIds.has(uniqueId)) {
  uniqueId = `${id}-${counter}`;
  counter++;
}
```

**Result**:

```html
<h2 id="introduction">Introduction</h2>
<h2 id="introduction-1">Introduction</h2>
<h2 id="introduction-2">Introduction</h2>
```

### Tracking Used IDs

```javascript
const usedIds = new Set(); // Fast O(1) lookup

// After processing each heading:
usedIds.add(id);
```

Using a `Set` ensures:

- Constant-time duplicate detection
- No need to scan entire array
- Memory efficient for large documents

---

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

---

## Design Principles

### 1. Preserve User Intent

**Rule**: Never modify existing IDs

```javascript
let id = $heading.attr('id');

if (!id) {
  // Only generate if missing
  id = generateAnchorId(title);
}
```

**Rationale**: If a developer manually set an ID, respect it. They may have:

- External links pointing to that ID
- Analytics tracking that specific anchor
- SEO optimization for that URL

### 2. Functional Decomposition

**Pattern**: Single-responsibility pure functions

```javascript
// BAD: Monolithic function
function generateAnchor(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\s-]/g, '');
  // ... 20 more operations
}

// GOOD: Composed pipeline
function generateAnchor(text) {
  let result = cleanTextForAnchor(text);
  result = processNumbers(result);
  result = truncateText(result);
  return ensureValidAnchor(result);
}
```

**Benefits**:

- Each step is independently testable
- Easy to modify one transformation without affecting others
- Clear data flow through pipeline
- Self-documenting code

### 3. Defensive Programming

**Input Validation**:

```javascript
function isValidTextInput(text) {
  return text && typeof text === 'string';
}

if (!isValidTextInput(text)) {
  return 'section'; // Safe fallback
}
```

**Guarantees**:

- Never return empty string (browsers ignore empty IDs)
- Always return valid URL characters
- Handle edge cases gracefully (null, undefined, numbers, objects)

### 4. Zero External Dependencies

**Implementation**: Uses only JavaScript built-ins

```javascript
// No external slugify library
// No external sanitization library
// No external uniqueness library

// Pure JavaScript:
text
  .toLowerCase()
  .replace(/[^\w\s-]/g, '')
  .replace(/[\s_]+/g, separator);
```

**Advantages**:

- Smaller bundle size
- No security vulnerabilities from dependencies
- Full control over behavior
- Easier to maintain

---

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

**Note**: For better internationalization, you could enhance this to use `slugify` libraries that
preserve non-ASCII characters, but current implementation prioritizes simplicity.

### 4. Very Long Headings

```html
<h2>This is an extremely long heading that would create an unwieldy anchor ID</h2>
```

**Processing**:

```javascript
truncateText('this-is-an-extremely-long-heading...', 50, '-');
// → "this-is-an-extremely-long-heading-that-would"
```

### 5. Invalid Input Types

```javascript
generateAnchorId(null); // → "section"
generateAnchorId(undefined); // → "section"
generateAnchorId(123); // → "section"
generateAnchorId({}); // → "section"
```

---

## Testing Strategy

### Unit Tests: Anchor Generator

**Location**: `test/utilities.test.js`

Tests cover:

- Basic text transformation
- Special character removal
- HTML tag stripping
- Number handling (allowed/disallowed)
- Prefix/suffix addition
- Truncation
- Invalid input fallbacks

### Integration Tests: Content Extraction

Tests verify:

- Headings are extracted from HTML
- IDs are generated for headings without IDs
- Existing IDs are preserved
- Duplicate headings get unique IDs
- Heading metadata appears in search index

### Real-World Test Cases

**Fixture**: `test/fixtures/basic/src/duplicate-headings.html`

```html
<h2>Introduction</h2>
<h2>Introduction</h2>
<h2>Introduction</h2>
```

**Expected Output**: `build/search-index.json`

```json
{
  "headings": [
    { "level": "h2", "id": "introduction", "title": "Introduction" },
    { "level": "h2", "id": "introduction-1", "title": "Introduction" },
    { "level": "h2", "id": "introduction-2", "title": "Introduction" }
  ]
}
```

---

## Performance Considerations

### HTML Modification

**Complexity**: O(n) where n = number of headings

```javascript
$('h1, h2, h3, h4, h5, h6').each((index, el) => {
  // Constant-time operations per heading
  const id = generateAnchorId(title); // O(m) where m = title length
  $heading.attr('id', id); // O(1)
  usedIds.add(id); // O(1)
});
```

**Typical Page**: 10-50 headings → Negligible performance impact

### ID Generation

**Complexity**: O(m) where m = text length

All operations are linear string transformations:

- `.toLowerCase()` → O(m)
- `.replace()` → O(m)
- `Set.has()` → O(1)

**Bottleneck**: None. String operations are optimized in V8/JavaScript engines.

### Memory Usage

```javascript
const usedIds = new Set();
```

**Per-page overhead**: ~50-100 bytes per heading (storing IDs in Set)

**Total overhead**: Minimal. Cleared after each page is processed.

---

## Future Enhancements

### 1. Configurable ID Generation

Allow users to customize the anchor generation algorithm:

```javascript
search({
  anchorOptions: {
    maxLength: 60,
    separator: '_',
    allowNumbers: false,
    preserveCase: true,
  },
});
```

### 2. Smart Section Matching

Match search terms against specific sections:

```javascript
// If search term matches a heading, boost that result
const searchTerm = 'installation';
const matchingHeading = entry.headings.find(
  (h) => h.title.toLowerCase() === searchTerm.toLowerCase()
);

if (matchingHeading) {
  result.score *= 2; // Boost exact heading matches
  result.deepLink = `${entry.url}#${matchingHeading.id}`;
}
```

### 3. Multilingual Support

Better handling of non-ASCII characters:

```javascript
import slugify from '@sindresorhus/slugify';

function generateAnchorId(text, options = {}) {
  return slugify(text, {
    lowercase: true,
    separator: options.separator || '-',
    preserveCharacters: ['ä', 'ö', 'ü'], // Preserve umlauts
  });
}
```

### 4. Heading Context in Search Results

Include surrounding content for better context:

```javascript
{
  "headings": [
    {
      "level": "h2",
      "id": "installation",
      "title": "Installation",
      "content": "First 200 chars after this heading..." // NEW
    }
  ]
}
```

---

## Conclusion

The anchor generation system provides a robust foundation for deep linking in search results. Key
achievements:

✅ **Automatic ID generation** - No manual intervention required ✅ **Uniqueness guarantee** -
Handles duplicate headings gracefully ✅ **HTML modification** - IDs work immediately in browsers ✅
**Search index metadata** - Enables client-side deep linking ✅ **Zero dependencies** - Pure
JavaScript implementation ✅ **Fully tested** - Edge cases covered ✅ **Maintainable** - Functional
decomposition for clarity

This system transforms basic page-level search into precise section-level navigation, significantly
improving user experience.

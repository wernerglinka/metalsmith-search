# Theory of Operations: Anchor Generation & Deep Linking

## Overview

The `metalsmith-search` plugin implements an anchor generation system that enables **deep linking to
specific sections within pages**. This document explains the theory, implementation, and client-side
integration of this system. The plugin implements **heading-based deep linking** that allows search
results to point directly to sections:

```
Search: "visual storytelling"
Results in link: /docs/guide#visual-storytelling → Browser scrolls directly to section
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

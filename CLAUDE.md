# metalsmith-search - Development Context

## Current Status ✅

**Refactoring Complete** - HTML-first architecture successfully implemented and tested.

- ✅ **70 tests passing** (all edge cases resolved)
- ✅ **88.79% branch coverage** (exceeds 78% target)
- ✅ **100% search quality score** (valid/invalid/edge cases)
- ✅ **No linting errors** - Code fully compliant
- ✅ **All fixtures clean** - No orphaned test files
- ✅ **Try/catch in all tests** - Reliable error handling

**Key Improvements from Refactoring:**

- Fixed index.html → `/` URL normalization for permalinks
- Added try/catch blocks to all async tests (prevents timeout errors)
- Cleaned up fixture files (removed orphaned traditional-page.html)
- Fixed whitespace-only and all-content-excluded edge cases

## Project Overview

This is an **HTML-first Metalsmith search plugin** that processes final rendered HTML for accurate
search indexing. Built with Fuse.js and Cheerio, it represents a fundamental architectural
improvement over both the initial markdown-first approach (v0.1.0) and legacy solutions like
metalsmith-lunr.

**Version**: 0.2.0 (HTML-First Refactor) **Technology**: Fuse.js + Cheerio for fast, accurate HTML
parsing **Architecture**: Dual ESM/CommonJS support with simplified, maintainable codebase

## MCP Server Integration (CRITICAL)

**IMPORTANT**: This plugin was created with `metalsmith-plugin-mcp-server`. When working on this plugin, AI assistants (Claude) MUST use the MCP server tools rather than creating their own implementations.

### Essential MCP Commands

```bash
# List all available templates
list-templates

# Get specific template content (use these exactly as provided)
get-template plugin/CLAUDE.md
get-template configs/release-it.json
get-template configs/eslint.config.js

# Validate plugin and get actionable recommendations
validate .

# Generate configuration files
configs .

# Show recommended configuration templates
show-template release-it
show-template eslint

# Update dependencies
update-deps .
```

### CRITICAL RULES for AI Assistants

1. **ALWAYS use MCP server templates verbatim** - Never create simplified versions
2. **ALWAYS use `list-templates` first** to see what's available
3. **ALWAYS use `get-template`** to retrieve exact template content
4. **NEVER improvise or create custom implementations** when MCP server provides templates
5. **When validation recommends templates**, use the exact commands provided
6. **If a command seems unclear**, ask the user for clarification rather than improvising

### Common Mistakes to AVOID

**❌ Wrong Approach:**
- Creating custom CLAUDE.md content instead of using `get-template plugin/CLAUDE.md`
- Scaffolding entire new plugins when you just need a template
- Making up template content or "simplifying" official templates
- Ignoring validation recommendations
- Using commands like `npx metalsmith-plugin-mcp-server scaffold ./ CLAUDE.md claude-context`

**✅ Correct Approach:**
- Use `list-templates` to see what's available
- Use `get-template <template-name>` to get exact content
- Follow validation recommendations exactly as provided
- Ask for clarification when commands seem confusing
- Always use official templates verbatim

### Quick Commands

**Quality & Validation:**
```bash
npx metalsmith-plugin-mcp-server validate . --functional  # Validate with MCP server
npm test                                                   # Run tests with coverage
npm run lint                                              # Lint and fix code
```

**Release Process:**
```bash
npm run release:patch   # Bug fixes (1.5.4 → 1.5.5)
npm run release:minor   # New features (1.5.4 → 1.6.0)  
npm run release:major   # Breaking changes (1.5.4 → 2.0.0)
```

**Development:**
```bash
npm run build          # Build ESM/CJS versions
npm run test:coverage  # Run tests with detailed coverage
```


## Pre-Commit and Release Workflow

### CRITICAL: Always Run Pre-Commit Validation

**Before ANY commit or release, ALWAYS run these commands in order:**

```bash
npm run lint          # Fix linting issues
npm run format        # Format code consistently
npm test              # Ensure all tests pass
```

**If any of these commands fail, you MUST fix the issues before proceeding with commits or
releases.**

### Common Development Commands

```bash
# Build the plugin (required before testing)
npm run build

# Run tests for both ESM and CommonJS
npm test

# Run tests with coverage
npm run test:coverage

# Run linting and auto-fix issues
npm run lint

# Format code
npm run format

# Check formatting without making changes
npm run format:check
```

### Release Commands

Only after successful pre-commit validation:

```bash
npm run release:patch  # For bug fixes (0.0.X)
npm run release:minor  # For new features (0.X.0)
npm run release:major  # For breaking changes (X.0.0)
```

## Key Learnings from Development

### 1. The Markdown-First Mistake (v0.1.0)

**Initial Reasoning (FLAWED)**:

> "Content starts as markdown → gets merged into templates → becomes HTML → extract content back
> out"

**Why This Was Wrong**:

1. **Templates add searchable content**: Navigation, footers, template-generated text
2. **Markdown ≠ Final content**: Misses all template context and composition
3. **"Chrome-free" is a bug, not a feature**: Users search for things in nav/footer/header
4. **Component-based assumption**: Over-engineered for specific architecture patterns
5. **More complex**: Required dual logic paths (component vs traditional)

### 2. HTML-First Architecture (v0.2.0) - The Right Approach

**Critical Discovery from Maintainer Feedback**:

> "The plugin would be much simpler if it was purely HTML-content-based and came after
> layouts/in-place."

**Benefits of HTML-First**:

- ✅ **Simpler**: Single HTML parsing path with Cheerio
- ✅ **Accurate**: Indexes what users actually see
- ✅ **Faster**: Cheerio parsing vs expensive RegExp operations
- ✅ **Universal**: Works with any content architecture (component-based, traditional, slots)
- ✅ **Maintainable**: No assumptions about frontmatter structure

```javascript
// HTML-first: Simple and accurate
import * as cheerio from 'cheerio';

const $ = cheerio.load(html);
$('script, style, nav, header, footer').remove(); // Optional
const text = $.text(); // Done.
```

### 3. Pipeline Positioning - After Layouts

**CRITICAL**: Plugin must run **AFTER** layouts/templates:

```javascript
// Correct pipeline position
Metalsmith(__dirname)
  .use(layouts()) // HTML generation FIRST
  .use(
    search({
      // Search indexing AFTER layouts
      pattern: '**/*.html',
      excludeSelectors: ['nav', 'header', 'footer'], // Optional
    })
  );
```

**Why This Matters**:

- Indexes final rendered content
- Access to all template-generated text
- No guessing about content structure
- Works with @metalsmith/slots and any architecture

### 4. Performance: Cheerio vs RegExp

**Maintainer Feedback**:

> "The html-stripper contains a lot of very expensive RegExp, TBH this would probably be much easier
> / exact to do with cheerio .text()"

**Reality Check**:

```javascript
// ❌ BAD: Multiple expensive RegExp passes
text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
// ... many more RegExp operations

// ✅ GOOD: Single Cheerio parse
const $ = cheerio.load(html);
$('script, style').remove();
return $.text();
```

**Result**: Faster, more accurate, less code

### 5. Removed Premature Optimizations

**Maintainer Feedback**:

> "I'm suspicious about the need for a batchSize option, did you encounter significant slowness?"

**Removed No-Ops and Premature Optimizations**:

- ❌ `async` - Not implemented properly
- ❌ `batchSize` - No measured performance issue
- ❌ `lazyLoad` - Not implemented
- ❌ `processMarkdownFields` - No longer relevant

**Lesson**: Measure first, optimize later

### 6. Trust the Pattern Option

**Maintainer Feedback**:

> "Why not simply let the pattern option decide this instead of running all kinds of expensive logic
> to auto-detect 'searchable' files?"

**Removed Complexity**:

- ❌ `isBinaryFile()` - SVG is not binary, logic incomplete
- ❌ File priority calculation - Arbitrary and unnecessary
- ❌ Frontmatter delimiter detection - Already stripped by Metalsmith
- ❌ Auto-detection of section types - Over-engineered

**Result**: Simpler, faster, trusts user configuration

## Development Architecture

### Dual Module Support

This plugin supports both ESM and CommonJS:

- **Source**: Write in ESM in `src/index.js`
- **Build**: Creates both `lib/index.js` (ESM) and `lib/index.cjs` (CommonJS)
- **Testing**: Tests run against built files for both formats

### File Organization

```
/
├── src/
│   ├── index.js                    # Main plugin entry point
│   ├── processors/
│   │   ├── content-extractor.js   # HTML parsing with Cheerio
│   │   ├── file-processor.js      # File processing logic
│   │   └── search-indexer.js      # Fuse.js index generation
│   └── utils/
│       ├── config.js              # Configuration and defaults
│       ├── html-stripper.js       # Cheerio-based HTML stripping
│       ├── index-helpers.js       # Index creation helpers
│       └── plugin-helpers.js      # Plugin utility functions
├── test/
│   ├── index.js                   # ESM tests
│   ├── cjs.test.cjs               # CommonJS tests
│   ├── search-quality.test.js     # Search quality metrics
│   └── fixtures/                  # HTML test content
├── lib/                           # Built files (auto-generated)
└── README.md                      # User documentation
```

### Plugin Features

This plugin includes these features:

- **HTML-First Indexing**: Processes final rendered HTML for accuracy
- **Cheerio Parsing**: Fast, reliable HTML parsing
- **Multi-Level Indexing**: Page and section-level search entries
- **Configurable Exclusion**: Optional removal of nav/header/footer
- **Frontmatter Integration**: Index custom frontmatter fields
- **Heading-Based Sections**: Extract content by h2/h3 hierarchy
- **Pipeline Optimized**: Runs after layouts for complete content access

## Testing Strategy

### Test Structure

- **ESM Tests**: `test/index.js` - Tests the built ESM version
- **CommonJS Tests**: `test/cjs.test.cjs` - Tests the built CommonJS version
- **Fixtures**: `test/fixtures/` - Sample files for testing transformations

### Running Tests

```bash
# Build first (required!)
npm run build

# Run all tests
npm test

# Run specific test format
npm run test:esm
npm run test:cjs

# Coverage reporting
npm run test:coverage
```

### Important: Build Before Testing

**Always run `npm run build` before running tests** - the tests execute against the built files in
`lib/`, not the source files in `src/`.

## Code Quality Standards

### ESLint Configuration

- Uses ESLint 9.x flat configuration (`eslint.config.js`)
- Automatically fixes common issues with `npm run lint`
- Modern JavaScript patterns enforced

### Formatting

- Prettier configuration for consistent code style
- Auto-format with `npm run format`
- Check formatting with `npm run format:check`

### Documentation

- JSDoc comments for all public functions
- README with comprehensive usage examples
- Type definitions in `types/` directory

### Modern Search Plugin Pattern

```javascript
/**
 * Modern Metalsmith search plugin with Fuse.js
 * @param {Object} options - Plugin configuration
 * @returns {Function} Metalsmith plugin function
 */
function search(options = {}) {
  const config = deepMerge(defaults, options);

  return async function (files, metalsmith, done) {
    const debug = metalsmith.debug('metalsmith-search');

    try {
      // Multi-level content extraction
      const allSearchEntries = [];

      // Batch processing for performance
      for (let i = 0; i < filesToProcess.length; i += config.batchSize) {
        const batch = filesToProcess.slice(i, i + config.batchSize);
        // Process batch...
      }

      // Generate Fuse.js compatible index
      const searchIndex = await createSearchIndex(allSearchEntries, config);

      // Add to Metalsmith files
      files[config.indexPath] = {
        contents: Buffer.from(JSON.stringify(searchIndex, null, 2)),
      };

      done();
    } catch (error) {
      done(error);
    }
  };
}

export default search;
```

### Multi-Level Content Extraction Pattern

```javascript
// Extract searchable content from multiple levels
async function extractSearchableContent(file, filename, options, metalsmith) {
  const entries = [];

  // Page-level extraction
  if (options.indexLevels.includes('page')) {
    entries.push(await extractPageLevel(file, filename, options));
  }

  // Section-level extraction (component-based)
  if (options.indexLevels.includes('section') && file.sections) {
    for (const section of file.sections) {
      entries.push(await extractSectionLevel(section, filename, options));
    }
  }

  // Traditional content chunking
  if (file.contents && !file.sections) {
    const chunks = await chunkContent(file.contents, options);
    entries.push(...chunks);
  }

  return entries;
}
```

### Async Processing Pattern

```javascript
function (options = {}) {
  return async function(files, metalsmith) {
    const batchSize = options.batchSize || 10;
    const fileList = Object.keys(files);

    for (let i = 0; i < fileList.length; i += batchSize) {
      const batch = fileList.slice(i, i + batchSize);
      await processBatch(batch, files, options);
    }
  };
}
```

## Release Process

### Automated Release Process

The release process uses an improved release notes system that generates clean, version-specific
GitHub releases:

**Key Features:**

- ✅ Clean, professional release notes
- ✅ Only current version changes (no "Unreleased" sections)
- ✅ Automatic commit filtering (excludes chore, ci, dev commits)
- ✅ Proper GitHub markdown formatting with commit links

**Release Commands:**

```bash
npm run release:patch  # Bug fixes (1.2.3 → 1.2.4)
npm run release:minor  # New features (1.2.3 → 1.3.0)
npm run release:major  # Breaking changes (1.2.3 → 2.0.0)
```

The release notes are automatically generated using `scripts/release-notes.sh` which:

1. Gets commits since the previous tag
2. Filters out merge commits and maintenance commits
3. Formats with proper GitHub links
4. Includes full changelog link

### Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- All tests passing
- Code properly linted and formatted

This automatically:

- Updates version in package.json
- Generates changelog
- Creates git tag
- Pushes to GitHub
- Creates GitHub release with clean, professional notes

## Common Development Tasks

### Adding New Features

1. Write feature in `src/index.js`
2. Add comprehensive tests in `test/`
3. Update JSDoc documentation
4. Run pre-commit validation
5. Test with real Metalsmith projects

### Debugging

```javascript
// Add debug logging
import { debuglog } from 'util';
const debug = debuglog('metalsmith-search');

function search(options = {}) {
  return function (files, metalsmith, callback) {
    debug('Processing %d files', Object.keys(files).length);
    // ... plugin logic
  };
}
```

### Performance Optimization

- Use `metalsmith.match()` for file filtering
- Avoid unnecessary file system operations
- Process files in batches for large sites
- Cache expensive computations

## Integration Testing

Test your plugin with real Metalsmith projects:

```javascript
import Metalsmith from 'metalsmith';
import search from 'metalsmith-search';

const metalsmith = Metalsmith(__dirname)
  .source('src')
  .destination('dist')
  .use(
    search({
      // your options
    })
  )
  .build((err) => {
    if (err) throw err;
    console.log('Build complete!');
  });
```

## Communication Style

### When Working on This Plugin

- **Be specific** - Include exact error messages and file paths
- **Test thoroughly** - Both ESM and CommonJS formats
- **Follow patterns** - Use existing utilities and conventions
- **Document changes** - Update JSDoc and README as needed

## Development Lessons Summary

### v0.2.0 Refactor: HTML-First Architecture

**Trigger**: Maintainer feedback identified fundamental flaws in markdown-first approach

**Key Changes**:

1. **Dependency**: Added Cheerio for HTML parsing
2. **Pattern**: `**/*.md` → `**/*.html`
3. **Pipeline**: Before layouts → After layouts
4. **Simplified**: 17 options → 8 options
5. **Removed**: file-filter.js, async.js (no-ops and premature optimizations)
6. **Performance**: RegExp-based HTML stripping → Cheerio `.text()`

**Result**: Simpler, faster, more accurate, maintainable codebase

### Critical Lessons Learned

1. **Question AI Suggestions**: Initial markdown-first approach sounded reasonable but was
   fundamentally flawed
2. **Domain Expertise Matters**: Maintainer immediately spotted issues AI development missed
3. **Simplicity > Cleverness**: HTML-first is simpler than dual markdown/component extraction
4. **Measure, Don't Assume**: Batch processing, async options added without measuring need
5. **Trust User Configuration**: Pattern option sufficient, no need for auto-detection
6. **Dependencies Are OK**: Cheerio is battle-tested and more reliable than custom RegExp

### Technical Achievements

1. **HTML-First Processing**: Accurate indexing of final rendered content
2. **Cheerio Integration**: Fast, reliable HTML parsing
3. **Standards Compliance**: Full ESM/CommonJS support
4. **Fuse.js Integration**: Modern fuzzy search replacing legacy Lunr.js

### Philosophical Insights

1. **Web Standards First**: Metalsmith's strength is generating real HTML/CSS/JavaScript
2. **Index Reality**: Process what users see, not intermediate formats
3. **Progressive Enhancement**: Search works with any architecture (or no architecture)
4. **Maintainer Feedback Is Gold**: Expert domain knowledge catches what general programming misses

### Best Practices Established

1. **MCP Server Integration**: Use official templates and validation tools
2. **Multi-Level Testing**: Test both ESM and CommonJS builds
3. **Listen to Feedback**: Maintainer feedback led to complete architectural improvement
4. **Breaking Changes Pre-1.0**: Use pre-1.0 phase to fix fundamental issues

## Search Quality Testing

### Integrated Quality Assurance

The plugin includes an integrated search quality test suite (`test/search-quality.test.js`) that
validates the effectiveness of generated search indexes. This was adapted from the
universal-search-tester toolkit and provides automated quality metrics.

### Test Categories

**Valid Terms (~10 terms)**

- Common words that should return results: content, page, test, search, metalsmith
- Tests that the search index properly captures real content

**Invalid Terms (~10 terms)**

- Nonsense that shouldn't return results: asdf, qwerty, xyz, zzz
- Tests that the search doesn't produce false positives

**Edge Cases (~11 terms)**

- Special scenarios: empty strings, single characters, case variations
- Tests robustness and error handling

### Quality Metrics

The test suite calculates a comprehensive quality score:

- **Valid Terms Score**: % of valid terms that return results (target: ≥60%)
- **Invalid Terms Score**: % of invalid terms correctly rejected (target: ≥70%)
- **Edge Cases Score**: % of edge cases handled without errors (target: ≥90%)
- **Overall Quality Score**: Weighted average (target: ≥65%)

Current performance: **100% overall quality score**

### Running Search Quality Tests

```bash
# Run as part of full test suite
npm test

# Run search quality test specifically
npx mocha test/search-quality.test.js

# View detailed metrics in test output
# 📊 Search Quality Metrics:
#    Valid Terms Score: 100.0%
#    Invalid Terms Score: 80.0%
#    Edge Cases Score: 100.0%
#    Overall Quality: 94%
```

### Integration Benefits

1. **Automated Validation**: Quality checks run with every test suite execution
2. **No External Dependencies**: Uses lightweight built-in search implementation
3. **Measurable Metrics**: Provides concrete quality scores for search effectiveness
4. **CI/CD Ready**: Fails tests if quality drops below thresholds
5. **Private Testing**: Not exposed to npm users, internal quality assurance only

### Quality Thresholds

The test suite enforces minimum quality standards:

- Valid terms must have ≥60% success rate
- Invalid terms must have ≥70% rejection rate
- Edge cases must have ≥90% handling rate
- Overall quality must be ≥65%

These thresholds ensure the search index maintains professional quality standards while allowing for
the inherent fuzziness of search algorithms.

This plugin follows the enhanced standards from `metalsmith-plugin-mcp-server` and represents modern
Metalsmith development workflows with lessons learned from real-world implementation and user
feedback.

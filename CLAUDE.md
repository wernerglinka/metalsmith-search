# metalsmith-search - Development Context

## Project Overview

This is a **modern Metalsmith search plugin** that represents a quantum leap beyond legacy solutions
like metalsmith-lunr. Built from the ground up using enhanced standards from
`metalsmith-plugin-mcp-server`, it combines cutting-edge search technology (Fuse.js) with deep
understanding of modern Metalsmith architectures.

**Version**: 0.0.1 (Initial Release) **Technology**: Fuse.js-powered fuzzy search with
component-based indexing **Architecture**: Dual ESM/CommonJS support with comprehensive testing

## MCP Server Integration (CRITICAL)

**IMPORTANT**: This plugin was created with `metalsmith-plugin-mcp-server`. When working on this
plugin, AI assistants (Claude) MUST use the MCP server tools rather than creating their own
implementations.

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

### 1. Component-Based vs Traditional Content Architecture

**Discovery**: Modern Metalsmith sites (2025 pattern) use component-based architecture with sections
arrays, while traditional sites use long-form markdown content. The plugin needed to support both
paradigms seamlessly.

**Solution**:

- **Component-based processing**: Extracts content from frontmatter sections arrays
- **Traditional processing**: Intelligent chunking of long markdown content
- **Unified indexing**: Both approaches feed into the same Fuse.js search index

```javascript
// Component-based extraction (modern)
sections: [
  {
    sectionType: 'hero',
    text: { title: 'Title', prose: 'Content...' }
  }
]

// Traditional extraction (legacy support)
# Long Article Title
Content that gets intelligently chunked...
```

### 2. Pipeline Positioning Strategy

**Critical Discovery**: Plugin must run **late in the Metalsmith pipeline** after content processing
but still have access to original frontmatter.

**Rationale**:

- ✅ Access to processed HTML content from layouts/templates
- ✅ Access to original frontmatter metadata
- ✅ All content transformations are complete
- ✅ Perfect for production builds only

```javascript
// Optimal pipeline position
Metalsmith(__dirname)
  .use(layouts()) // Content processing
  .use(collections()) // Metadata organization
  .use(
    search({
      // Search indexing (LATE STAGE)
      pattern: '**/*.html', // Process final HTML
      indexLevels: ['page', 'section'],
    })
  );
```

### 3. Metalsmith Philosophy: Real Web Technologies

**Key Insight**: User feedback emphasized "Metalsmith builds pages with real HTML, CSS and plain
JavaScript" - not React or other frameworks.

**Implementation Impact**:

- Removed React examples from documentation
- Focused on vanilla JavaScript client-side integration
- Emphasized progressive enhancement approach
- Generated search indexes work with any JavaScript framework or no framework

### 4. Frontmatter Markdown Processing

**Challenge**: Any frontmatter field might contain markdown that needs processing for search.

**Solution**:

```javascript
// Process markdown in frontmatter fields
processMarkdownFields: true,
frontmatterFields: ['summary', 'intro', 'leadIn', 'subTitle', 'abstract']
```

This ensures rich metadata is properly indexed regardless of where it appears in the content
structure.

### 5. Performance Optimization Insights

**Batch Processing**: Large sites need efficient processing

```javascript
batchSize: 10, // Process files in batches
async: false   // Enable for very large sites
```

**Content Chunking**: Long articles need intelligent splitting

```javascript
maxSectionLength: 2000, // Split long sections
chunkSize: 1500,        // Target chunk size
minSectionLength: 50    // Skip tiny sections
```

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
│   │   ├── async.js               # Async processing utilities
│   │   ├── content-extractor.js   # Multi-level content extraction
│   │   └── search-indexer.js      # Fuse.js index generation
│   └── utils/
│       ├── anchor-generator.js    # URL-safe anchor creation
│       ├── config.js              # Configuration utilities
│       └── html-stripper.js       # Semantic HTML processing
├── test/
│   ├── index.test.js              # ESM tests
│   ├── cjs.test.cjs               # CommonJS tests
│   └── fixtures/                  # Component-based and traditional test content
├── lib/                           # Built files (auto-generated)
└── README.md                      # Comprehensive docs with Theory of Operation
```

### Plugin Features

This plugin includes these enhanced features:

- **Multi-Level Indexing**: Page, section, and component-level search entries
- **Dual Content Architecture**: Supports both modern component-based sites and traditional
  long-form content
- **Intelligent Content Chunking**: Automatic splitting of long articles with heading-based
  navigation
- **Frontmatter Markdown Processing**: Processes markdown in any frontmatter field
- **Async Processing**: Batch processing with configurable batch sizes and progress tracking
- **Semantic HTML Stripping**: Preserves readability while removing markup
- **Pipeline Optimization**: Positioned for late-stage processing with full content access

## Testing Strategy

### Test Structure

- **ESM Tests**: `test/index.test.js` - Tests the built ESM version
- **CommonJS Tests**: `test/index.test.cjs` - Tests the built CommonJS version
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
const debug = debuglog('');

function (options = {}) {
  return function(files, metalsmith, callback) {
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
import  from '';

const metalsmith = Metalsmith(__dirname)
  .source('src')
  .destination('dist')
  .use(({
    // your options
  }))
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

### Technical Achievements

1. **Dual Architecture Support**: Seamlessly handles both modern component-based and traditional
   markdown content
2. **Pipeline Optimization**: Strategic late-stage positioning for optimal content access
3. **Performance Engineering**: Intelligent batching and content chunking for large sites
4. **Standards Compliance**: Full ESM/CommonJS support with comprehensive testing
5. **Fuse.js Integration**: Modern fuzzy search replacing legacy Lunr.js solutions

### Philosophical Insights

1. **Web Standards First**: Metalsmith's strength is generating real HTML/CSS/JavaScript
2. **Progressive Enhancement**: Search works with or without JavaScript frameworks
3. **Content Flexibility**: Support both cutting-edge and traditional content patterns
4. **Production Focus**: Late pipeline positioning enables production-only search indexing

### Best Practices Established

1. **MCP Server Integration**: Always use official templates and validation tools
2. **Multi-Level Testing**: Test both ESM and CommonJS builds with realistic content
3. **Comprehensive Documentation**: Include Theory of Operation for complex plugins
4. **User-Centered Design**: Listen to real-world feedback and adapt accordingly

### Critical Development Fixes Applied

1. **Build Error Resolution**: Created missing `src/processors/async.js` file
2. **Test Pattern Alignment**: Updated package.json scripts to match actual test filenames
3. **Fixture Structure**: Organized test content in proper Metalsmith src/ directory structure
4. **Documentation Refinement**: Removed framework-specific examples per user feedback

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

Current performance: **94% overall quality score**

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

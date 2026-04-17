/**
 * Edge Case Tests for Branch Coverage
 * Tests specific edge cases using fixture files
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Metalsmith from 'metalsmith';
import search from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, 'fixtures', 'basic');

describe('Edge Cases for Branch Coverage', () => {
  it('should handle empty heading titles', (_t, done) => {
    const ms = Metalsmith(fixtures)
      .source('src')
      .destination('build')
      .clean(false)
      .use(
        search({
          pattern: '**/empty-headings.html'
        })
      );

    ms.build((err, files) => {
      if (err) {
        return done(err);
      }

      try {
        const indexContent = files['search-index.json'].contents.toString();
        const searchIndex = JSON.parse(indexContent);

        const entry = searchIndex.entries[0];
        assert(entry, 'Should have an entry');
        // Should only have the valid heading, not the empty ones
        assert.strictEqual(entry.headings.length, 1, 'Should skip empty headings');
        assert.strictEqual(entry.headings[0].title, 'Valid Heading');
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  it('should generate unique IDs for duplicate heading titles', (_t, done) => {
    const ms = Metalsmith(fixtures)
      .source('src')
      .destination('build')
      .clean(false)
      .use(
        search({
          pattern: '**/duplicate-headings.html'
        })
      );

    ms.build((err, files) => {
      if (err) {
        return done(err);
      }

      try {
        const indexContent = files['search-index.json'].contents.toString();
        const searchIndex = JSON.parse(indexContent);

        const entry = searchIndex.entries[0];
        assert(entry, 'Should have an entry');
        assert.strictEqual(entry.headings.length, 3, 'Should have 3 headings');

        // All IDs should be unique
        const ids = entry.headings.map((h) => h.id);
        const uniqueIds = new Set(ids);
        assert.strictEqual(ids.length, uniqueIds.size, 'All heading IDs should be unique');

        // Should have introduction, introduction-1, introduction-2
        assert(ids.includes('introduction'), 'Should have base ID');
        assert(ids.includes('introduction-1'), 'Should have numbered ID -1');
        assert(ids.includes('introduction-2'), 'Should have numbered ID -2');

        done();
      } catch (error) {
        done(error);
      }
    });
  });

  it('should use fallback title when no title or h1 exists', (_t, done) => {
    const ms = Metalsmith(fixtures)
      .source('src')
      .destination('build')
      .clean(false)
      .use(
        search({
          pattern: '**/no-title.html'
        })
      );

    ms.build((err, files) => {
      if (err) {
        return done(err);
      }

      try {
        const indexContent = files['search-index.json'].contents.toString();
        const searchIndex = JSON.parse(indexContent);

        const entry = searchIndex.entries[0];
        assert(entry, 'Should have an entry');
        assert.strictEqual(entry.title, 'Untitled', 'Should use "Untitled" as fallback');
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  it('should skip files with only whitespace content', (_t, done) => {
    const ms = Metalsmith(fixtures)
      .source('src')
      .destination('build')
      .clean(false)
      .use(
        search({
          pattern: '**/whitespace-only.html'
        })
      );

    ms.build((err, files) => {
      if (err) {
        return done(err);
      }

      try {
        const indexContent = files['search-index.json'].contents.toString();
        const searchIndex = JSON.parse(indexContent);

        // Should skip whitespace-only file
        assert.strictEqual(searchIndex.entries.length, 0, 'Should skip whitespace-only files');
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  it('should handle short content without truncation', (_t, done) => {
    const ms = Metalsmith(fixtures)
      .source('src')
      .destination('build')
      .clean(false)
      .use(
        search({
          pattern: '**/sample.html' // Small file
        })
      );

    ms.build((err, files) => {
      if (err) {
        return done(err);
      }

      try {
        const indexContent = files['search-index.json'].contents.toString();
        const searchIndex = JSON.parse(indexContent);

        const entry = searchIndex.entries[0];
        assert(entry, 'Should have an entry');

        // If content is short (<= 250 chars), excerpt should equal content
        if (entry.content.length <= 250) {
          assert.strictEqual(entry.excerpt, entry.content, 'Short excerpt should equal content');
          assert(!entry.excerpt.endsWith('...'), 'Short content should not have ellipsis');
        }
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  it('should truncate long content with ellipsis', (_t, done) => {
    const ms = Metalsmith(fixtures)
      .source('src')
      .destination('build')
      .clean(false)
      .use(
        search({
          pattern: '**/traditional-long-article.html' // Large file
        })
      );

    ms.build((err, files) => {
      if (err) {
        return done(err);
      }

      try {
        const indexContent = files['search-index.json'].contents.toString();
        const searchIndex = JSON.parse(indexContent);

        const entry = searchIndex.entries[0];
        assert(entry, 'Should have an entry');

        // Long content should be truncated
        assert(entry.content.length > 300, 'Test file should have long content');
        assert(entry.excerpt.endsWith('...'), 'Long content should have ellipsis');
        assert(entry.excerpt.length < entry.content.length, 'Excerpt should be shorter');
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  it('should normalize index.html URLs correctly', (_t, done) => {
    const ms = Metalsmith(fixtures)
      .source('src')
      .destination('build')
      .clean(false)
      .use(
        search({
          pattern: 'index.html' // Exact match for root index.html only
        })
      );

    ms.build((err, files) => {
      if (err) {
        return done(err);
      }

      try {
        const indexContent = files['search-index.json'].contents.toString();
        const searchIndex = JSON.parse(indexContent);

        const entry = searchIndex.entries[0];
        assert(entry, 'Should have an entry');
        assert.strictEqual(entry.url, '/', 'Root index.html should normalize to /');
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  it('should handle empty excludeSelectors array', (_t, done) => {
    const ms = Metalsmith(fixtures)
      .source('src')
      .destination('build')
      .clean(false)
      .use(
        search({
          pattern: '**/sample.html',
          excludeSelectors: [] // Empty array - include everything
        })
      );

    ms.build((err, files) => {
      if (err) {
        return done(err);
      }

      try {
        const indexContent = files['search-index.json'].contents.toString();
        const searchIndex = JSON.parse(indexContent);

        assert(searchIndex.entries.length > 0, 'Should create entries with empty excludeSelectors');
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  it('should skip files whose contents is not a Buffer', (_t, done) => {
    const ms = Metalsmith(fixtures)
      .source('src')
      .destination('build')
      .clean(false)
      .use((files, _metalsmith, next) => {
        files['injected-bad.html'] = { contents: 'not-a-buffer-string' };
        files['injected-null.html'] = { contents: null };
        next();
      })
      .use(
        search({
          pattern: ['injected-bad.html', 'injected-null.html']
        })
      )
      .use((files, _metalsmith, next) => {
        delete files['injected-bad.html'];
        delete files['injected-null.html'];
        next();
      });

    ms.build((err, files) => {
      if (err) {
        return done(err);
      }

      try {
        const indexContent = files['search-index.json'].contents.toString();
        const searchIndex = JSON.parse(indexContent);

        const injectedEntries = searchIndex.entries.filter(
          (e) => e.url === '/injected-bad' || e.url === '/injected-null'
        );
        assert.strictEqual(injectedEntries.length, 0, 'Should skip files with non-Buffer contents');
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  it('should skip files with all content excluded', (_t, done) => {
    const ms = Metalsmith(fixtures)
      .source('src')
      .destination('build')
      .clean(false)
      .use(
        search({
          pattern: '**/page-with-chrome.html',
          excludeSelectors: ['nav', 'header', 'footer', 'main'] // Exclude everything
        })
      );

    ms.build((err, files) => {
      if (err) {
        return done(err);
      }

      try {
        const indexContent = files['search-index.json'].contents.toString();
        const searchIndex = JSON.parse(indexContent);

        // When all content is excluded, should have no entries
        assert.strictEqual(searchIndex.entries.length, 0, 'Should skip files with all content excluded');
        done();
      } catch (error) {
        done(error);
      }
    });
  });
});

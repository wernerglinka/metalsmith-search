/**
 * Real-world HTML test
 * Tests the plugin with actual production HTML
 */
import assert from 'assert';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Metalsmith from 'metalsmith';
import search from '../lib/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, 'fixtures', 'basic');

describe('Real-World HTML Processing', function () {
  this.timeout(10000);

  it('should extract content and headings from real-world blog post HTML', function (done) {
    const ms = Metalsmith(fixtures)
      .source('src')
      .destination('build')
      .clean(false)
      .use(
        search({
          pattern: '**/real-world.html',
          excludeSelectors: ['header', 'footer', 'nav', 'script', 'style'],
        })
      );

    ms.build(function (err, files) {
      if (err) {
        return done(err);
      }

      assert(files['search-index.json'], 'Search index should be created');

      const indexContent = files['search-index.json'].contents.toString();
      const searchIndex = JSON.parse(indexContent);

      // Verify index structure
      assert(searchIndex.entries, 'Should have entries array');
      assert(Array.isArray(searchIndex.entries), 'Entries should be an array');
      assert(searchIndex.entries.length > 0, 'Should have at least one entry');

      // Should have single page entry (not sections)
      const pageEntry = searchIndex.entries.find((e) => e.type === 'page');
      assert(pageEntry, 'Should have a page-level entry');
      assert(pageEntry.title, 'Page entry should have a title');
      assert(pageEntry.content, 'Page entry should have content');
      assert(pageEntry.url, 'Page entry should have a URL');

      // Verify that excluded elements are not in content
      assert(!pageEntry.content.includes('Last site build'), 'Should not include footer content');

      // Verify headings array exists
      assert(pageEntry.headings, 'Page entry should have headings array');
      assert(Array.isArray(pageEntry.headings), 'Headings should be an array');
      assert(pageEntry.headings.length > 0, 'Should have at least one heading');

      // Verify heading structure
      const firstHeading = pageEntry.headings[0];
      assert(firstHeading.level, 'Heading should have level property');
      assert(firstHeading.id, 'Heading should have id property');
      assert(firstHeading.title, 'Heading should have title property');
      assert(/^h[1-6]$/.test(firstHeading.level), 'Level should be h1-h6');

      // Verify headings have IDs (either existing or generated)
      pageEntry.headings.forEach((heading) => {
        assert(heading.id, 'All headings should have IDs');
        assert(heading.id.length > 0, 'Heading ID should not be empty');
      });

      done();
    });
  });

  it('should include navigation when excludeSelectors is empty', function (done) {
    const ms = Metalsmith(fixtures)
      .source('src')
      .destination('build')
      .clean(false)
      .use(
        search({
          pattern: '**/real-world.html',
          excludeSelectors: [], // Include everything
        })
      );

    ms.build(function (err, files) {
      if (err) {
        return done(err);
      }

      const indexContent = files['search-index.json'].contents.toString();
      const searchIndex = JSON.parse(indexContent);

      const pageEntry = searchIndex.entries.find((e) => e.type === 'page');
      assert(pageEntry, 'Should have a page-level entry');

      // When not excluding nav, we should have more content
      assert(pageEntry.content.length > 0, 'Should have content with nav included');

      done();
    });
  });

  it('should extract all heading levels (h1-h6)', function (done) {
    const ms = Metalsmith(fixtures)
      .source('src')
      .destination('build')
      .clean(false)
      .use(
        search({
          pattern: '**/real-world.html',
          excludeSelectors: ['header', 'footer', 'nav'],
        })
      );

    ms.build(function (err, files) {
      if (err) {
        return done(err);
      }

      const indexContent = files['search-index.json'].contents.toString();
      const searchIndex = JSON.parse(indexContent);

      const pageEntry = searchIndex.entries[0];
      assert(pageEntry, 'Should have a page entry');
      assert(pageEntry.headings, 'Should have headings array');

      // Verify all headings have required properties
      pageEntry.headings.forEach((heading) => {
        assert(heading.level, 'Heading should have level');
        assert(heading.id, 'Heading should have id');
        assert(heading.title, 'Heading should have title');
        assert(
          /^h[1-6]$/.test(heading.level),
          `Heading level should be h1-h6, got: ${heading.level}`
        );
      });

      // Verify different heading levels are captured
      const levels = new Set(pageEntry.headings.map((h) => h.level));
      assert(levels.size > 0, 'Should capture at least one heading level');

      done();
    });
  });

  it('should handle duplicate heading titles by generating unique IDs', function (done) {
    const ms = Metalsmith(fixtures)
      .source('src')
      .destination('build')
      .clean(false)
      .use(
        search({
          pattern: '**/traditional-long-article.html',
          excludeSelectors: [],
        })
      );

    ms.build(function (err, files) {
      if (err) {
        return done(err);
      }

      const indexContent = files['search-index.json'].contents.toString();
      const searchIndex = JSON.parse(indexContent);

      const pageEntry = searchIndex.entries[0];
      assert(pageEntry, 'Should have a page entry');
      assert(pageEntry.headings, 'Should have headings array');

      // Collect all IDs
      const ids = pageEntry.headings.map((h) => h.id);
      const uniqueIds = new Set(ids);

      // All IDs should be unique
      assert.strictEqual(ids.length, uniqueIds.size, 'All heading IDs should be unique');

      done();
    });
  });

  it('should handle malformed HTML gracefully', function (done) {
    const ms = Metalsmith(fixtures)
      .source('src')
      .destination('build')
      .clean(false)
      .use(
        search({
          pattern: '**/component-page.html',
          excludeSelectors: [],
        })
      );

    ms.build(function (err, files) {
      // Should not error even with unusual HTML
      if (err) {
        return done(err);
      }

      const indexContent = files['search-index.json'].contents.toString();
      const searchIndex = JSON.parse(indexContent);

      assert(searchIndex.entries, 'Should have entries array');
      assert(Array.isArray(searchIndex.entries), 'Entries should be an array');

      done();
    });
  });
});

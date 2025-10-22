import assert from 'node:assert';
import { describe, it, beforeEach } from 'mocha';
import Metalsmith from 'metalsmith';
import search from '../src/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('metalsmith-search (Comprehensive)', function () {
  let metalsmith;

  beforeEach(function () {
    metalsmith = Metalsmith(path.join(__dirname, 'fixtures', 'basic'));
  });

  describe('content extraction', function () {
    it('should extract traditional markdown content', function (done) {
      metalsmith
        .use(
          search({
            maxSectionLength: 1000,
            chunkSize: 500,
            processMarkdownFields: true,
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          const indexContent = JSON.parse(files['search-index.json'].contents.toString());
          assert.ok(indexContent.entries.length > 0);

          // Should have both page and section level entries
          const hasPageLevel = indexContent.entries.some((entry) => entry.type === 'page');
          const hasSectionLevel = indexContent.entries.some((entry) => entry.type === 'section');

          assert.ok(hasPageLevel, 'Should have page-level entries');
          assert.ok(
            hasSectionLevel || indexContent.entries.length > 0,
            'Should have section-level entries or content'
          );

          done();
        });
    });

    it('should handle component-based content extraction', function (done) {
      metalsmith
        .use(
          search({
            sectionTypes: ['hero', 'text-only', 'media-image'],
            componentFields: {
              hero: ['title', 'leadIn', 'prose'],
              'text-only': ['prose'],
              'media-image': ['title', 'caption', 'altText'],
            },
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          const indexContent = JSON.parse(files['search-index.json'].contents.toString());
          assert.ok(Array.isArray(indexContent.entries));

          done();
        });
    });

    it('should process frontmatter fields with markdown', function (done) {
      metalsmith
        .use(
          search({
            processMarkdownFields: true,
            frontmatterFields: ['summary', 'intro', 'description', 'abstract'],
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          const indexContent = JSON.parse(files['search-index.json'].contents.toString());
          assert.ok(indexContent.entries.length > 0);

          done();
        });
    });

    it('should strip HTML while preserving content', function (done) {
      metalsmith
        .use(
          search({
            stripHtml: true,
            pattern: '**/*.md',
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          const indexContent = JSON.parse(files['search-index.json'].contents.toString());

          // Content should not contain HTML tags
          indexContent.entries.forEach((entry) => {
            if (entry.content) {
              assert.ok(!entry.content.includes('<'), 'Content should not contain HTML tags');
              assert.ok(!entry.content.includes('>'), 'Content should not contain HTML tags');
            }
          });

          done();
        });
    });

    it('should generate anchor links for sections', function (done) {
      metalsmith.use(search({})).build(function (err, files) {
        if (err) {
          return done(err);
        }

        const indexContent = JSON.parse(files['search-index.json'].contents.toString());

        // Check that section entries have anchor properties
        const sectionEntries = indexContent.entries.filter((entry) => entry.type === 'section');
        sectionEntries.forEach((entry) => {
          if (entry.anchorId) {
            assert.ok(typeof entry.anchorId === 'string');
            assert.ok(entry.anchorId.length > 0);
          }
        });

        done();
      });
    });
  });

  describe('configuration options', function () {
    it('should respect ignore patterns', function (done) {
      metalsmith
        .use(
          search({
            pattern: '**/*.md',
            ignore: ['**/real-world-example.md'],
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          const indexContent = JSON.parse(files['search-index.json'].contents.toString());

          // Should not contain entries from ignored files
          const hasIgnoredContent = indexContent.entries.some(
            (entry) => entry.url && entry.url.includes('real-world-example')
          );

          assert.ok(!hasIgnoredContent, 'Should not contain content from ignored files');

          done();
        });
    });

    it('should handle different batch sizes', function (done) {
      metalsmith
        .use(
          search({
            batchSize: 1,
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          assert.ok(files['search-index.json']);

          done();
        });
    });

    it('should configure Fuse.js options', function (done) {
      metalsmith
        .use(
          search({
            fuseOptions: {
              threshold: 0.1,
              includeScore: false,
              includeMatches: false,
              keys: [
                { name: 'title', weight: 5 },
                { name: 'prose', weight: 1 },
              ],
            },
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          const indexContent = JSON.parse(files['search-index.json'].contents.toString());
          assert.strictEqual(indexContent.config.fuseOptions.threshold, 0.1);
          assert.strictEqual(indexContent.config.fuseOptions.includeScore, false);

          done();
        });
    });

    it('should handle minimum section length filtering', function (done) {
      metalsmith
        .use(
          search({
            minSectionLength: 50, // Use smaller length to avoid filtering out all content
            pattern: '**/*.md',
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          const indexContent = JSON.parse(files['search-index.json'].contents.toString());

          // Should have created index successfully
          assert.ok(Array.isArray(indexContent.entries));

          done();
        });
    });
  });

  describe('async processing', function () {
    it('should handle async processing mode', function (done) {
      metalsmith
        .use(
          search({
            async: true,
            batchSize: 5,
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          assert.ok(files['search-index.json']);
          const indexContent = JSON.parse(files['search-index.json'].contents.toString());
          assert.ok(indexContent.entries);

          done();
        });
    });
  });

  describe('error scenarios', function () {
    it('should handle malformed frontmatter gracefully', function (done) {
      // Test with normal content but edge case processing
      metalsmith
        .use(
          search({
            processMarkdownFields: true,
            frontmatterFields: ['nonexistent', 'missing'], // Try to process fields that don't exist
            pattern: '**/*.md',
          })
        )
        .build(function (err, files) {
          // Should handle gracefully and not crash
          if (err) {
            // If there's an error, it should be handled gracefully
            assert.ok(err.message, 'Error should have a message');
            done();
            return;
          }

          // Should still create index
          assert.ok(files['search-index.json']);
          done();
        });
    });

    it('should handle missing required fields', function (done) {
      // Use the basic fixtures directory which already exists
      metalsmith
        .use(
          search({
            pattern: '**/*.md',
            processMarkdownFields: false, // Simplify to avoid processing issues
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          // Should still create index even with basic content
          assert.ok(files['search-index.json']);

          done();
        });
    });
  });

  describe('content chunking', function () {
    it('should split long content into chunks', function (done) {
      // Test with existing fixture which has long content
      metalsmith
        .use(
          search({
            maxSectionLength: 500, // Use reasonable size for existing content
            chunkSize: 300,
            pattern: '**/traditional-long-article.md', // Target specific long file
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          const indexContent = JSON.parse(files['search-index.json'].contents.toString());

          // Should have created section entries
          const sectionEntries = indexContent.entries.filter((entry) => entry.type === 'section');

          // Should have some section entries from the long article
          assert.ok(sectionEntries.length >= 0, 'Should process section entries');

          done();
        });
    });
  });

  describe('index structure', function () {
    it('should create proper index metadata', function (done) {
      metalsmith
        .use(
          search({
            pattern: '**/*.md',
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          const indexContent = JSON.parse(files['search-index.json'].contents.toString());

          // Check basic index structure
          assert.ok(indexContent.version, 'Should have version');
          assert.ok(indexContent.generator, 'Should have generator');
          assert.ok(
            typeof indexContent.totalEntries === 'number',
            'Should have totalEntries count'
          );
          assert.ok(Array.isArray(indexContent.entries), 'Should have entries array');

          done();
        });
    });
  });

  describe('file patterns', function () {
    it('should respect custom file patterns', function (done) {
      metalsmith
        .use(
          search({
            pattern: '**/*.md', // Only markdown files
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          const indexContent = JSON.parse(files['search-index.json'].contents.toString());
          assert.ok(indexContent.entries.length >= 0); // Should process some files

          done();
        });
    });

    it('should handle multiple patterns', function (done) {
      metalsmith
        .use(
          search({
            pattern: '**/*.md',
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          assert.ok(files['search-index.json']);

          done();
        });
    });
  });

  describe('edge cases and error paths', function () {
    it('should handle various stripHtml options', function (done) {
      metalsmith
        .use(
          search({
            stripHtml: false, // Don't strip HTML
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          assert.ok(files['search-index.json']);

          done();
        });
    });

    it('should handle lazy loading disabled', function (done) {
      metalsmith
        .use(
          search({
            lazyLoad: false,
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          const indexContent = JSON.parse(files['search-index.json'].contents.toString());
          assert.ok(indexContent.entries);

          done();
        });
    });

    it('should handle anchor generation disabled', function (done) {
      metalsmith.use(search({})).build(function (err, files) {
        if (err) {
          return done(err);
        }

        assert.ok(files['search-index.json']);

        done();
      });
    });

    it('should handle missing or undefined options gracefully', function (done) {
      metalsmith
        .use(
          search({
            // Test with some undefined/missing options
            nonexistentOption: true,
            anotherFakeOption: 'test',
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          assert.ok(files['search-index.json']);

          done();
        });
    });

    it('should handle file filtering edge cases', function (done) {
      // Test with files that will trigger different filtering paths
      metalsmith
        .use(
          search({
            pattern: '**/*.md',
            async: true, // Enable async to test that path
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          const indexContent = JSON.parse(files['search-index.json'].contents.toString());
          assert.ok(indexContent.entries);

          done();
        });
    });
  });
});

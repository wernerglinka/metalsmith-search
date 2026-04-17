import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Metalsmith from 'metalsmith';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import search from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('metalsmith-search (Comprehensive)', () => {
  let metalsmith;

  beforeEach(() => {
    metalsmith = Metalsmith(path.join(__dirname, 'fixtures', 'basic'));
  });

  describe('configuration options', () => {
    it('should respect ignore patterns', (_t, done) => {
      metalsmith
        .use(
          search({
            pattern: '**/*.html',
            ignore: ['**/real-world.html']
          })
        )
        .build((err, files) => {
          if (err) {
            return done(err);
          }

          try {
            const indexContent = JSON.parse(files['search-index.json'].contents.toString());
            const hasIgnoredContent = indexContent.entries.some(
              (entry) => entry.url && entry.url.includes('real-world')
            );
            assert.ok(!hasIgnoredContent, 'Should not contain content from ignored files');
            done();
          } catch (error) {
            done(error);
          }
        });
    });

    it('should configure Fuse.js options', (_t, done) => {
      metalsmith
        .use(
          search({
            fuseOptions: {
              threshold: 0.1,
              includeScore: false,
              includeMatches: false,
              keys: [
                { name: 'title', weight: 5 },
                { name: 'content', weight: 1 }
              ]
            }
          })
        )
        .build((err, files) => {
          if (err) {
            return done(err);
          }

          try {
            const indexContent = JSON.parse(files['search-index.json'].contents.toString());
            assert.strictEqual(indexContent.config.fuseOptions.threshold, 0.1);
            assert.strictEqual(indexContent.config.fuseOptions.includeScore, false);
            done();
          } catch (error) {
            done(error);
          }
        });
    });

    it('should handle unknown options gracefully', (_t, done) => {
      metalsmith
        .use(
          search({
            nonexistentOption: true,
            anotherFakeOption: 'test'
          })
        )
        .build((err, files) => {
          if (err) {
            return done(err);
          }
          assert.ok(files['search-index.json']);
          done();
        });
    });
  });

  describe('index structure', () => {
    it('should create proper index metadata', (_t, done) => {
      metalsmith.use(search({ pattern: '**/*.html' })).build((err, files) => {
        if (err) {
          return done(err);
        }

        try {
          const indexContent = JSON.parse(files['search-index.json'].contents.toString());
          assert.ok(indexContent.version, 'Should have version');
          assert.ok(indexContent.generator, 'Should have generator');
          assert.ok(typeof indexContent.totalEntries === 'number', 'Should have totalEntries count');
          assert.ok(Array.isArray(indexContent.entries), 'Should have entries array');
          done();
        } catch (error) {
          done(error);
        }
      });
    });
  });
});

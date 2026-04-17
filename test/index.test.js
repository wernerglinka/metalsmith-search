import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Metalsmith from 'metalsmith';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import search from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('metalsmith-search', () => {
  let metalsmith;

  beforeEach(() => {
    metalsmith = Metalsmith(path.join(__dirname, 'fixtures', 'basic'));
  });

  it('should export a function', () => {
    assert.equal(typeof search, 'function');
  });

  it('should return a metalsmith plugin', () => {
    const plugin = search();
    assert.equal(typeof plugin, 'function');
    assert.equal(plugin.length, 3);
  });

  describe('basic functionality', () => {
    it('should process files with minimal options', (_t, done) => {
      metalsmith.use(search({})).build((err, files) => {
        if (err) {
          return done(err);
        }

        assert.equal(typeof files, 'object');
        assert.ok(files['search-index.json']);

        done();
      });
    });

    it('should create search index file', (_t, done) => {
      metalsmith.use(search({})).build((err, files) => {
        if (err) {
          return done(err);
        }

        assert.ok(files['search-index.json']);
        assert.ok(files['search-index.json'].contents);

        const indexContent = JSON.parse(files['search-index.json'].contents.toString());
        assert.ok(indexContent.version);
        assert.ok(indexContent.entries);
        assert.ok(Array.isArray(indexContent.entries));

        done();
      });
    });
  });

  describe('options', () => {
    it('should accept custom indexPath', (_t, done) => {
      metalsmith
        .use(
          search({
            indexPath: 'custom-search.json'
          })
        )
        .build((err, files) => {
          if (err) {
            return done(err);
          }

          assert.ok(files['custom-search.json']);
          assert.ok(!files['search-index.json']);

          done();
        });
    });
  });

  describe('error handling', () => {
    it('should handle empty file set', (_t, done) => {
      const emptyMetalsmith = Metalsmith(path.join(__dirname, 'fixtures', 'empty'));

      emptyMetalsmith.use(search({})).build((err, files) => {
        if (err) {
          return done(err);
        }

        assert.equal(typeof files, 'object');
        assert.ok(files['search-index.json']);

        const indexContent = JSON.parse(files['search-index.json'].contents.toString());
        assert.equal(indexContent.totalEntries, 0);
        assert.equal(indexContent.entries.length, 0);

        done();
      });
    });
  });
});

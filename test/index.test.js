import assert from 'node:assert';
import { describe, it, beforeEach } from 'mocha';
import Metalsmith from 'metalsmith';
import search from '../src/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('metalsmith-search (ESM)', function () {
  let metalsmith;

  beforeEach(function () {
    metalsmith = Metalsmith(path.join(__dirname, 'fixtures', 'basic'));
  });

  it('should export a function', function () {
    assert.strictEqual(typeof search, 'function');
  });

  it('should return a metalsmith plugin', function () {
    const plugin = search();
    assert.strictEqual(typeof plugin, 'function');
    assert.strictEqual(plugin.length, 3);
  });

  describe('basic functionality', function () {
    it('should process files with minimal options', function (done) {
      metalsmith.use(search({})).build(function (err, files) {
        if (err) {
          return done(err);
        }

        assert.strictEqual(typeof files, 'object');
        assert.ok(files['search-index.json']);

        done();
      });
    });

    it('should create search index file', function (done) {
      metalsmith.use(search({})).build(function (err, files) {
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

  describe('options', function () {
    it('should accept custom indexPath', function (done) {
      metalsmith
        .use(
          search({
            indexPath: 'custom-search.json',
          })
        )
        .build(function (err, files) {
          if (err) {
            return done(err);
          }

          assert.ok(files['custom-search.json']);
          assert.ok(!files['search-index.json']);

          done();
        });
    });
  });

  describe('error handling', function () {
    it('should handle empty file set', function (done) {
      const emptyMetalsmith = Metalsmith(path.join(__dirname, 'fixtures', 'empty'));

      emptyMetalsmith.use(search({})).build(function (err, files) {
        if (err) {
          return done(err);
        }

        assert.strictEqual(typeof files, 'object');
        assert.ok(files['search-index.json']);

        const indexContent = JSON.parse(files['search-index.json'].contents.toString());
        assert.strictEqual(indexContent.totalEntries, 0);
        assert.strictEqual(indexContent.entries.length, 0);

        done();
      });
    });
  });
});

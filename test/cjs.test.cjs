const { describe, it } = require('mocha');
const assert = require('node:assert');
const search = require('../lib/index.cjs');

describe('metalsmith-search (CommonJS)', function() {
  it('should be a function', function() {
    assert.strictEqual(typeof search, 'function');
  });
  
  it('should return a function', function() {
    const plugin = search();
    assert.strictEqual(typeof plugin, 'function');
    assert.strictEqual(plugin.length, 3); // files, metalsmith, done
  });

  it('should work with default options', function() {
    const plugin = search();
    assert.ok(plugin);
  });

  it('should accept options', function() {
    const plugin = search({ pattern: '*.md' });
    assert.ok(plugin);
  });
});
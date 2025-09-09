const { describe, it, beforeEach } = require('mocha');
const assert = require('node:assert');
const Metalsmith = require('metalsmith');
const search = require('../lib/index.cjs');
const path = require('path');

describe('metalsmith-search (CommonJS)', function() {
  let metalsmith;

  beforeEach(function() {
    metalsmith = Metalsmith(path.join(__dirname, 'fixtures', 'basic'));
  });

  it('should be a function', function() {
    assert.strictEqual(typeof search, 'function');
  });
  
  it('should return a metalsmith plugin function', function() {
    const plugin = search();
    assert.strictEqual(typeof plugin, 'function');
    assert.strictEqual(plugin.length, 3); // files, metalsmith, done
  });

  it('should work with default options', function() {
    const plugin = search();
    assert.ok(plugin);
  });

  it('should accept configuration options', function() {
    const plugin = search({ 
      pattern: '*.md',
      indexPath: 'test-index.json'
    });
    assert.ok(plugin);
  });

  it('should process files and create search index', function(done) {
    metalsmith
      .use(search())
      .build(function(err, files) {
        if (err) {return done(err);}
        
        assert.strictEqual(typeof files, 'object');
        assert.ok(files['search-index.json']);
        
        const indexContent = JSON.parse(files['search-index.json'].contents.toString());
        assert.ok(indexContent.version);
        assert.strictEqual(indexContent.generator, 'metalsmith-search');
        assert.ok(indexContent.entries);
        assert.ok(Array.isArray(indexContent.entries));
        
        done();
      });
  });

  it('should handle component-based indexing', function(done) {
    metalsmith
      .use(search({
        indexLevels: ['page', 'section']
      }))
      .build(function(err, files) {
        if (err) {return done(err);}
        
        const indexContent = JSON.parse(files['search-index.json'].contents.toString());
        assert.ok(Array.isArray(indexContent.entries));
        
        done();
      });
  });

  it('should respect custom index path', function(done) {
    metalsmith
      .use(search({
        indexPath: 'custom-search.json'
      }))
      .build(function(err, files) {
        if (err) {return done(err);}
        
        assert.ok(files['custom-search.json']);
        assert.ok(!files['search-index.json']);
        
        done();
      });
  });
});
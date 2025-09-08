import { expect } from 'chai';
import Metalsmith from 'metalsmith';
import search from '../src/index.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('metalsmith-search', function () {
  let metalsmith;

  beforeEach(function () {
    metalsmith = Metalsmith(path.join(__dirname, 'fixtures', 'basic'));
  });

  it('should export a function', function () {
    expect(search).to.be.a('function');
  });

  it('should return a metalsmith plugin', function () {
    const plugin = search();
    expect(plugin).to.be.a('function');
    expect(plugin).to.have.length(3);
  });

  describe('basic functionality', function () {
    it('should process files with default options', function (done) {
      metalsmith
        .use(search())
        .build(function (err, files) {
          if (err) return done(err);
          
          expect(files).to.be.an('object');
          expect(Object.keys(files)).to.have.length.above(0);
          done();
        });
    });

    it('should handle empty file set', function (done) {
      metalsmith = Metalsmith(path.join(__dirname, 'fixtures', 'empty'));
      
      metalsmith
        .use(search())
        .build(function (err, files) {
          if (err) return done(err);
          
          expect(files).to.be.an('object');
          done();
        });
    });
  });

  describe('options', function () {
    it('should accept pattern option', function (done) {
      metalsmith
        .use(search({
          pattern: '**/*.html'
        }))
        .build(function (err, files) {
          if (err) return done(err);
          
          const htmlFiles = Object.keys(files).filter(f => f.endsWith('.html'));
          expect(htmlFiles).to.have.length.above(0);
          done();
        });
    });

    it('should accept ignore option', function (done) {
      metalsmith
        .use(search({
          ignore: ['**/ignore/**']
        }))
        .build(function (err, files) {
          if (err) return done(err);
          
          const ignoredFiles = Object.keys(files).filter(f => f.includes('ignore/'));
          expect(ignoredFiles).to.have.length(0);
          done();
        });
    });

    it('should accept array patterns', function (done) {
      metalsmith
        .use(search({
          pattern: ['**/*.html', '**/*.md']
        }))
        .build(function (err, files) {
          if (err) return done(err);
          
          const matchedFiles = Object.keys(files).filter(f => 
            f.endsWith('.html') || f.endsWith('.md')
          );
          expect(matchedFiles).to.have.length.above(0);
          done();
        });
    });
  });




  describe('error handling', function () {
    it('should handle invalid options gracefully', function (done) {
      metalsmith
        .use(search({
          pattern: null
        }))
        .build(function (err) {
          expect(err).to.be.an('error');
          done();
        });
    });

    it('should handle file processing errors', function (done) {
      // TODO: Add test for file processing errors
      done();
    });
  });

  describe('integration', function () {
    it('should work with other metalsmith plugins', function (done) {
      metalsmith
        .use(function (files, ms, done) {
          // Simulate another plugin
          Object.keys(files).forEach(file => {
            files[file].processed = true;
          });
          done();
        })
        .use(search())
        .build(function (err, files) {
          if (err) return done(err);
          
          const processedFiles = Object.values(files).filter(f => f.processed);
          expect(processedFiles).to.have.length.above(0);
          done();
        });
    });
  });
});
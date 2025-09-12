/**
 * Search Quality Test Suite
 * Integrated from universal-search-tester for validating search index quality
 */

import assert from 'assert';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Metalsmith from 'metalsmith';
import search from '../lib/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, 'fixtures');

/**
 * Test terms for search quality validation
 */
const testTerms = {
  // Valid terms that should return results
  validTerms: [
    'content',
    'page',
    'test',
    'search',
    'metalsmith',
    'component',
    'section',
    'data',
    'build',
    'plugin',
  ],

  // Invalid terms that should return few/no results
  invalidTerms: ['asdf', 'qwerty', 'xyz', 'zzz', 'qpzm', 'wxyz', 'mnbv', 'zxcv', 'hjkl', 'plkj'],

  // Edge cases to test robustness
  edgeCases: ['', ' ', '  ', '\t', '\n', 'a', 'i', 'ab', 'it', 'TEST', 'Test'],
};

/**
 * Simple Fuse.js-like search implementation for testing
 */
class SimpleSearch {
  constructor(data, options = {}) {
    this.data = data;
    this.options = {
      keys: options.keys || ['title', 'content'],
      threshold: options.threshold || 0.3,
      minMatchCharLength: options.minMatchCharLength || 2,
      ...options,
    };
  }

  search(query) {
    if (!query || query.length < this.options.minMatchCharLength) {
      return [];
    }

    const results = [];
    const queryLower = query.toLowerCase();

    this.data.forEach((item) => {
      let hasMatch = false;
      let bestScore = 1;

      this.options.keys.forEach((key) => {
        const value = this.getNestedValue(item, key);
        if (!value) {
          return;
        }

        const valueLower = String(value).toLowerCase();

        // Simple scoring: exact match = 0.0, substring = 0.2, partial = 0.5+
        let score = 1;
        if (valueLower === queryLower) {
          score = 0.0;
        } else if (valueLower.includes(queryLower)) {
          score = 0.2;
        } else if (this.fuzzyMatch(queryLower, valueLower)) {
          score = 0.5;
        }

        if (score < this.options.threshold) {
          hasMatch = true;
          bestScore = Math.min(bestScore, score);
        }
      });

      if (hasMatch) {
        results.push({ item, score: bestScore });
      }
    });

    return results.sort((a, b) => a.score - b.score);
  }

  getNestedValue(obj, path) {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) {
        return null;
      }
    }
    return value;
  }

  fuzzyMatch(query, text) {
    // Simple fuzzy matching - checks if all query chars appear in order
    let queryIndex = 0;
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === query.length;
  }
}

/**
 * Calculate search quality metrics
 */
function calculateQualityScore(results) {
  const metrics = {
    validTermsScore: 0,
    invalidTermsScore: 0,
    edgeCasesScore: 0,
    overallScore: 0,
  };

  // Valid terms should return results
  const validSuccesses = results.validTerms.filter((r) => r.resultCount > 0).length;
  metrics.validTermsScore = (validSuccesses / results.validTerms.length) * 100;

  // Invalid terms should NOT return results
  const invalidSuccesses = results.invalidTerms.filter((r) => r.resultCount === 0).length;
  metrics.invalidTermsScore = (invalidSuccesses / results.invalidTerms.length) * 100;

  // Edge cases should handle gracefully (no errors)
  const edgeSuccesses = results.edgeCases.filter((r) => !r.error).length;
  metrics.edgeCasesScore = (edgeSuccesses / results.edgeCases.length) * 100;

  // Overall score (weighted average)
  metrics.overallScore = Math.round(
    metrics.validTermsScore * 0.5 + metrics.invalidTermsScore * 0.3 + metrics.edgeCasesScore * 0.2
  );

  return metrics;
}

/**
 * Test search functionality with quality metrics
 */
function testSearchQuality(searchIndex, options = {}) {
  const searcher = new SimpleSearch(searchIndex.entries || searchIndex, {
    keys: ['title', 'content', 'pageName', 'leadIn', 'prose'],
    threshold: options.threshold || 0.6,
    minMatchCharLength: 1,
  });

  const results = {
    validTerms: [],
    invalidTerms: [],
    edgeCases: [],
  };

  // Test valid terms
  testTerms.validTerms.forEach((term) => {
    try {
      const searchResults = searcher.search(term);
      results.validTerms.push({
        term,
        resultCount: searchResults.length,
        topScore: searchResults[0]?.score || null,
      });
    } catch (error) {
      results.validTerms.push({
        term,
        resultCount: 0,
        error: error.message,
      });
    }
  });

  // Test invalid terms
  testTerms.invalidTerms.forEach((term) => {
    try {
      const searchResults = searcher.search(term);
      results.invalidTerms.push({
        term,
        resultCount: searchResults.length,
        topScore: searchResults[0]?.score || null,
      });
    } catch (error) {
      results.invalidTerms.push({
        term,
        resultCount: 0,
        error: error.message,
      });
    }
  });

  // Test edge cases
  testTerms.edgeCases.forEach((term) => {
    try {
      const searchResults = searcher.search(term);
      results.edgeCases.push({
        term: term === '' ? '(empty)' : term === ' ' ? '(space)' : term,
        resultCount: searchResults.length,
        error: null,
      });
    } catch (error) {
      results.edgeCases.push({
        term: term === '' ? '(empty)' : term === ' ' ? '(space)' : term,
        resultCount: 0,
        error: error.message,
      });
    }
  });

  return {
    results,
    metrics: calculateQualityScore(results),
  };
}

describe('Search Quality Tests', function () {
  this.timeout(15000);

  it('should generate a high-quality search index', function (done) {
    const ms = Metalsmith(join(fixtures, 'basic'))
      .source('src')
      .destination('build')
      .clean(true)
      .use(
        search({
          pattern: '**/*.html',
          indexPath: 'search-index.json',
          indexLevels: ['page', 'section'],
          processSections: true,
          processMarkdownFields: true,
          stripHtml: true,
          maxSectionLength: 2000,
          minSectionLength: 50,
        })
      );

    ms.build(function (err, files) {
      if (err) {
        return done(err);
      }

      // Check that search index was created
      assert(files['search-index.json'], 'Search index should be created');

      // Parse the search index
      const indexContent = files['search-index.json'].contents.toString();
      const searchIndex = JSON.parse(indexContent);

      // Run quality tests
      const qualityTest = testSearchQuality(searchIndex);

      // Test results are included in assertions below

      // Quality assertions
      assert(
        qualityTest.metrics.validTermsScore >= 60,
        `Valid terms should have at least 60% success rate (got ${qualityTest.metrics.validTermsScore.toFixed(1)}%)`
      );

      assert(
        qualityTest.metrics.invalidTermsScore >= 70,
        `Invalid terms should have at least 70% rejection rate (got ${qualityTest.metrics.invalidTermsScore.toFixed(1)}%)`
      );

      assert(
        qualityTest.metrics.edgeCasesScore >= 90,
        `Edge cases should have at least 90% success rate (got ${qualityTest.metrics.edgeCasesScore.toFixed(1)}%)`
      );

      assert(
        qualityTest.metrics.overallScore >= 65,
        `Overall quality should be at least 65% (got ${qualityTest.metrics.overallScore}%)`
      );

      // Store debug info for potential troubleshooting
      const failedValid = qualityTest.results.validTerms.filter((r) => r.resultCount === 0);
      const falsePositives = qualityTest.results.invalidTerms.filter((r) => r.resultCount > 0);

      // These variables are available for debugging but not logged to avoid console noise
      void failedValid;
      void falsePositives;

      done();
    });
  });

  it('should handle component-based content effectively', function (done) {
    const ms = Metalsmith(join(fixtures, 'basic'))
      .source('src')
      .destination('build')
      .clean(true)
      .use(
        search({
          pattern: '**/component-*.html',
          indexPath: 'component-search.json',
          indexLevels: ['page', 'section'],
          processSections: true,
        })
      );

    ms.build(function (err, files) {
      if (err) {
        return done(err);
      }

      const indexContent = files['component-search.json']?.contents?.toString();
      if (!indexContent) {
        // Skip if no component files
        return done();
      }

      const searchIndex = JSON.parse(indexContent);
      const qualityTest = testSearchQuality(searchIndex, { threshold: 0.5 });

      assert(
        qualityTest.metrics.overallScore >= 50,
        `Component search quality should be at least 50% (got ${qualityTest.metrics.overallScore}%)`
      );

      done();
    });
  });

  it('should handle traditional markdown content effectively', function (done) {
    const ms = Metalsmith(join(fixtures, 'basic'))
      .source('src')
      .destination('build')
      .clean(true)
      .use(
        search({
          pattern: '**/traditional-*.html',
          indexPath: 'traditional-search.json',
          indexLevels: ['page'],
          chunkContent: true,
          chunkSize: 1500,
        })
      );

    ms.build(function (err, files) {
      if (err) {
        return done(err);
      }

      const indexContent = files['traditional-search.json']?.contents?.toString();
      if (!indexContent) {
        // Skip if no traditional files
        return done();
      }

      const searchIndex = JSON.parse(indexContent);
      const qualityTest = testSearchQuality(searchIndex, { threshold: 0.5 });

      assert(
        qualityTest.metrics.overallScore >= 50,
        `Traditional content search quality should be at least 50% (got ${qualityTest.metrics.overallScore}%)`
      );

      done();
    });
  });
});

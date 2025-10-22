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
    keys: ['title', 'content', 'excerpt'],
    threshold: options.threshold || 0.3, // Match Fuse.js default threshold
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
  this.timeout(10000);

  it('should generate a high-quality search index from HTML content', function (done) {
    const ms = Metalsmith(join(fixtures, 'basic'))
      .source('src')
      .destination('build')
      .clean(true)
      .use(
        search({
          pattern: '**/*.html',
          indexPath: 'search-index.json',
          excludeSelectors: [], // Index all content for quality testing
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

      // Verify we have entries
      assert(searchIndex.entries, 'Search index should have entries array');
      assert(searchIndex.entries.length > 0, 'Search index should have at least one entry');

      // Run quality tests with stricter threshold
      const qualityTest = testSearchQuality(searchIndex, { threshold: 0.3 });

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

      // Log summary for visibility
      console.log(`\n📊 Search Quality Metrics:`);
      console.log(`   Valid Terms Score: ${qualityTest.metrics.validTermsScore.toFixed(1)}%`);
      console.log(`   Invalid Terms Score: ${qualityTest.metrics.invalidTermsScore.toFixed(1)}%`);
      console.log(`   Edge Cases Score: ${qualityTest.metrics.edgeCasesScore.toFixed(1)}%`);
      console.log(`   Overall Quality: ${qualityTest.metrics.overallScore}%\n`);

      done();
    });
  });
});

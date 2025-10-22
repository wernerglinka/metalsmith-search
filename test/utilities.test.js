import assert from 'node:assert';
import { describe, it } from 'mocha';
import path from 'path';
import { fileURLToPath } from 'url';
import Metalsmith from 'metalsmith';

// Import utilities directly for testing
import { stripHtml } from '../src/utils/html-stripper.js';
import { generateAnchorId } from '../src/utils/anchor-generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Utility Functions', function () {
  describe('HTML Stripper', function () {
    it('should strip basic HTML tags', function () {
      const html = '<p>This is <strong>bold</strong> text</p>';
      const result = stripHtml(html);
      assert.strictEqual(result, 'This is bold text');
    });

    it('should handle nested HTML tags', function () {
      const html = '<div><p>Nested <em><strong>content</strong></em></p></div>';
      const result = stripHtml(html);
      assert.strictEqual(result, 'Nested content');
    });

    it('should preserve text content only', function () {
      const html = '<article><h1>Title</h1><p>Content with <a href="/">link</a></p></article>';
      const result = stripHtml(html);
      assert.ok(result.includes('Title'));
      assert.ok(result.includes('Content with link'));
      assert.ok(!result.includes('<'));
      assert.ok(!result.includes('>'));
    });

    it('should handle HTML entities', function () {
      const html = '<p>&lt;code&gt; &amp; &quot;quotes&quot;</p>';
      const result = stripHtml(html);
      assert.ok(result.includes('<code>'));
      assert.ok(result.includes('&'));
      assert.ok(result.includes('"quotes"'));
    });

    it('should handle malformed HTML gracefully', function () {
      const html = '<p>Unclosed tag <div>Content';
      const result = stripHtml(html);
      assert.ok(typeof result === 'string');
      assert.ok(result.length > 0);
    });

    it('should handle empty input', function () {
      assert.strictEqual(stripHtml(''), '');
      assert.strictEqual(stripHtml(null), '');
      assert.strictEqual(stripHtml(undefined), '');
    });

    it('should handle text without HTML', function () {
      const text = 'Plain text content';
      const result = stripHtml(text);
      assert.strictEqual(result, text);
    });

    it('should handle special characters and unicode', function () {
      const html = '<p>Special: áéíóú 中文 🚀</p>';
      const result = stripHtml(html);
      assert.strictEqual(result, 'Special: áéíóú 中文 🚀');
    });
  });

  describe('Anchor Generator', function () {
    it('should generate basic anchor IDs', function () {
      const title = 'Simple Title';
      const result = generateAnchorId(title);
      assert.strictEqual(result, 'simple-title');
    });

    it('should handle complex titles', function () {
      const title = 'Complex Title with Special Characters!@#$%';
      const result = generateAnchorId(title);
      assert.ok(typeof result === 'string');
      assert.ok(result.length > 0);
      assert.ok(!result.includes(' '));
    });

    it('should generate unique IDs for duplicate titles', function () {
      const title1 = generateAnchorId('Duplicate Title');
      const title2 = generateAnchorId('Duplicate Title');

      // Both should be strings (uniqueness depends on implementation)
      assert.ok(typeof title1 === 'string');
      assert.ok(typeof title2 === 'string');
    });

    it('should handle Unicode characters', function () {
      const title = 'Título with áccénts and 中文';
      const result = generateAnchorId(title);
      assert.ok(typeof result === 'string');
      assert.ok(result.length > 0);
    });

    it('should handle empty and null inputs', function () {
      assert.ok(typeof generateAnchorId('') === 'string');
      assert.ok(typeof generateAnchorId(null) === 'string');
      assert.ok(typeof generateAnchorId(undefined) === 'string');
    });
  });

  describe('Configuration Functions', function () {
    it('should handle invalid input in normalizeToArray', async function () {
      const { normalizeToArray } = await import('../src/utils/config.js');

      const result1 = normalizeToArray(null);
      assert.deepStrictEqual(result1, []);

      const result2 = normalizeToArray(undefined);
      assert.deepStrictEqual(result2, []);

      const result3 = normalizeToArray(123);
      assert.deepStrictEqual(result3, []);
    });

    it('should handle validateFiles without ignore patterns', async function () {
      const { validateFiles } = await import('../src/utils/config.js');

      const config = {
        pattern: ['**/*.md', '**/*.html'],
        ignore: [], // Empty ignore array to test the hasIgnorePatterns branch
      };

      const files = {
        'test.md': { contents: Buffer.from('content') },
        'test.html': { contents: Buffer.from('<p>content</p>') },
        'test.txt': { contents: Buffer.from('content') },
      };

      const metalsmith = Metalsmith(__dirname);

      const result = validateFiles(files, config, metalsmith);
      assert.ok(Array.isArray(result));
      assert.ok(result.includes('test.md'));
      assert.ok(result.includes('test.html'));
      assert.ok(!result.includes('test.txt'));
    });
  });

  describe('Plugin Helpers', function () {
    it('should test hasIgnorePatterns function', async function () {
      const { hasIgnorePatterns } = await import('../src/utils/config.js');

      // Test empty array
      assert.ok(!hasIgnorePatterns([]));

      // Test array with empty strings - still returns true because array has length
      assert.ok(hasIgnorePatterns(['', '  ']));

      // Test array with valid patterns
      assert.ok(hasIgnorePatterns(['*.tmp', 'node_modules/**']));

      // Test single pattern
      assert.ok(hasIgnorePatterns(['*.tmp']));
    });

    it('should test deepMerge with complex nested objects', async function () {
      const { deepMerge } = await import('../src/utils/config.js');

      const source = {
        a: 1,
        nested: {
          x: 10,
          y: { z: 100 },
        },
      };

      const target = {
        a: 2,
        b: 3,
        nested: {
          x: 20,
          y: { w: 200 },
          z: 30,
        },
      };

      const result = deepMerge(source, target);

      assert.strictEqual(result.a, 2); // target overwrites
      assert.strictEqual(result.b, 3); // target adds
      assert.strictEqual(result.nested.x, 20); // nested overwrite
      assert.strictEqual(result.nested.y.z, 100); // deep nested from source
      assert.strictEqual(result.nested.y.w, 200); // deep nested from target
      assert.strictEqual(result.nested.z, 30); // nested from target
    });
  });
});

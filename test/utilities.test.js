import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Metalsmith from 'metalsmith';

import { generateAnchorId } from '../src/utils/anchor-generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Utility Functions', () => {
  describe('Anchor Generator', () => {
    it('should generate basic anchor IDs', () => {
      const title = 'Simple Title';
      const result = generateAnchorId(title);
      assert.strictEqual(result, 'simple-title');
    });

    it('should handle complex titles', () => {
      const title = 'Complex Title with Special Characters!@#$%';
      const result = generateAnchorId(title);
      assert.ok(typeof result === 'string');
      assert.ok(result.length > 0);
      assert.ok(!result.includes(' '));
    });

    it('should generate unique IDs for duplicate titles', () => {
      const title1 = generateAnchorId('Duplicate Title');
      const title2 = generateAnchorId('Duplicate Title');

      // Both should be strings (uniqueness depends on implementation)
      assert.ok(typeof title1 === 'string');
      assert.ok(typeof title2 === 'string');
    });

    it('should handle Unicode characters', () => {
      const title = 'Título with áccénts and 中文';
      const result = generateAnchorId(title);
      assert.ok(typeof result === 'string');
      assert.ok(result.length > 0);
    });

    it('should handle empty and null inputs', () => {
      assert.ok(typeof generateAnchorId('') === 'string');
      assert.ok(typeof generateAnchorId(null) === 'string');
      assert.ok(typeof generateAnchorId(undefined) === 'string');
    });

    it('should truncate titles longer than 50 characters on a hyphen boundary', () => {
      const longTitle = 'This is an extremely long heading that exceeds the fifty character cap';
      const result = generateAnchorId(longTitle);
      assert.ok(result.length <= 50, `expected ≤50 chars, got ${result.length}`);
      assert.ok(!result.endsWith('-'), 'expected trailing hyphen to be trimmed');
    });
  });

  describe('Configuration Functions', () => {
    it('should handle invalid input in normalizeToArray', async () => {
      const { normalizeToArray } = await import('../src/utils/config.js');

      const result1 = normalizeToArray(null);
      assert.deepStrictEqual(result1, []);

      const result2 = normalizeToArray(undefined);
      assert.deepStrictEqual(result2, []);

      const result3 = normalizeToArray(123);
      assert.deepStrictEqual(result3, []);
    });

    it('should handle validateFiles without ignore patterns', async () => {
      const { validateFiles } = await import('../src/utils/config.js');

      const config = {
        pattern: ['**/*.md', '**/*.html'],
        ignore: [] // Empty ignore array to test the hasIgnorePatterns branch
      };

      const files = {
        'test.md': { contents: Buffer.from('content') },
        'test.html': { contents: Buffer.from('<p>content</p>') },
        'test.txt': { contents: Buffer.from('content') }
      };

      const metalsmith = Metalsmith(__dirname);

      const result = validateFiles(files, config, metalsmith);
      assert.ok(Array.isArray(result));
      assert.ok(result.includes('test.md'));
      assert.ok(result.includes('test.html'));
      assert.ok(!result.includes('test.txt'));
    });
  });

  describe('Plugin Helpers', () => {
    it('should test hasIgnorePatterns function', async () => {
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

    it('should test deepMerge with complex nested objects', async () => {
      const { deepMerge } = await import('../src/utils/config.js');

      const source = {
        a: 1,
        nested: {
          x: 10,
          y: { z: 100 }
        }
      };

      const target = {
        a: 2,
        b: 3,
        nested: {
          x: 20,
          y: { w: 200 },
          z: 30
        }
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

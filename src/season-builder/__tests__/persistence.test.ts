/**
 * Unit tests for persistence layer
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  readJSONFile,
  writeJSONFile,
  readJSONFiles,
  fileExists,
  deleteFile
} from '../core/persistence';

// Test directory in temp
const TEST_DIR = path.join(__dirname, '__test_files__');

beforeEach(() => {
  // Create test directory
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
});

afterEach(() => {
  // Clean up test directory
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('readJSONFile', () => {
  it('reads valid JSON file', () => {
    const testFile = path.join(TEST_DIR, 'valid.json');
    const testData = { name: 'Test Season', blocks: [] };

    fs.writeFileSync(testFile, JSON.stringify(testData), 'utf-8');

    const result = readJSONFile(testFile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(testData);
    }
  });

  it('returns error for missing file', () => {
    const testFile = path.join(TEST_DIR, 'missing.json');

    const result = readJSONFile(testFile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('File not found');
      expect(result.filePath).toBe(testFile);
    }
  });

  it('returns error for invalid JSON', () => {
    const testFile = path.join(TEST_DIR, 'invalid.json');

    fs.writeFileSync(testFile, '{ invalid json }', 'utf-8');

    const result = readJSONFile(testFile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid JSON syntax');
    }
  });

  it('reads empty JSON object', () => {
    const testFile = path.join(TEST_DIR, 'empty.json');
    fs.writeFileSync(testFile, '{}', 'utf-8');

    const result = readJSONFile(testFile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it('reads JSON array', () => {
    const testFile = path.join(TEST_DIR, 'array.json');
    const testData = [1, 2, 3];
    fs.writeFileSync(testFile, JSON.stringify(testData), 'utf-8');

    const result = readJSONFile<number[]>(testFile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(testData);
    }
  });
});

describe('writeJSONFile', () => {
  it('writes JSON file successfully', () => {
    const testFile = path.join(TEST_DIR, 'output.json');
    const testData = { name: 'Test', value: 42 };

    const result = writeJSONFile(testFile, testData);
    expect(result.success).toBe(true);

    // Verify file was written
    expect(fs.existsSync(testFile)).toBe(true);

    // Verify content
    const content = fs.readFileSync(testFile, 'utf-8');
    expect(JSON.parse(content)).toEqual(testData);
  });

  it('creates directory if it does not exist', () => {
    const nestedDir = path.join(TEST_DIR, 'nested', 'dir');
    const testFile = path.join(nestedDir, 'output.json');
    const testData = { test: true };

    const result = writeJSONFile(testFile, testData);
    expect(result.success).toBe(true);
    expect(fs.existsSync(testFile)).toBe(true);
  });

  it('pretty-prints JSON with 2-space indent', () => {
    const testFile = path.join(TEST_DIR, 'pretty.json');
    const testData = { name: 'Test', nested: { value: 42 } };

    writeJSONFile(testFile, testData);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toContain('  '); // Should have 2-space indentation
    expect(content).toContain('\n'); // Should be multi-line
  });

  it('overwrites existing file', () => {
    const testFile = path.join(TEST_DIR, 'overwrite.json');

    writeJSONFile(testFile, { version: 1 });
    writeJSONFile(testFile, { version: 2 });

    const result = readJSONFile<{ version: number }>(testFile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(2);
    }
  });
});

describe('readJSONFiles', () => {
  it('reads multiple files successfully', () => {
    const file1 = path.join(TEST_DIR, 'file1.json');
    const file2 = path.join(TEST_DIR, 'file2.json');

    fs.writeFileSync(file1, JSON.stringify({ id: 1 }), 'utf-8');
    fs.writeFileSync(file2, JSON.stringify({ id: 2 }), 'utf-8');

    const result = readJSONFiles([file1, file2]);

    expect(result.successCount).toBe(2);
    expect(result.errorCount).toBe(0);

    const result1 = result.results.get(file1);
    expect(result1?.success).toBe(true);

    const result2 = result.results.get(file2);
    expect(result2?.success).toBe(true);
  });

  it('continues on error and reports failures', () => {
    const file1 = path.join(TEST_DIR, 'exists.json');
    const file2 = path.join(TEST_DIR, 'missing.json');
    const file3 = path.join(TEST_DIR, 'invalid.json');

    fs.writeFileSync(file1, JSON.stringify({ valid: true }), 'utf-8');
    fs.writeFileSync(file3, '{ invalid }', 'utf-8');

    const result = readJSONFiles([file1, file2, file3]);

    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(2);

    const result1 = result.results.get(file1);
    expect(result1?.success).toBe(true);

    const result2 = result.results.get(file2);
    expect(result2?.success).toBe(false);

    const result3 = result.results.get(file3);
    expect(result3?.success).toBe(false);
  });

  it('handles empty array', () => {
    const result = readJSONFiles([]);

    expect(result.successCount).toBe(0);
    expect(result.errorCount).toBe(0);
    expect(result.results.size).toBe(0);
  });
});

describe('fileExists', () => {
  it('returns true for existing file', () => {
    const testFile = path.join(TEST_DIR, 'exists.json');
    fs.writeFileSync(testFile, '{}', 'utf-8');

    expect(fileExists(testFile)).toBe(true);
  });

  it('returns false for missing file', () => {
    const testFile = path.join(TEST_DIR, 'missing.json');
    expect(fileExists(testFile)).toBe(false);
  });
});

describe('deleteFile', () => {
  it('deletes existing file', () => {
    const testFile = path.join(TEST_DIR, 'to-delete.json');
    fs.writeFileSync(testFile, '{}', 'utf-8');

    expect(fileExists(testFile)).toBe(true);

    const result = deleteFile(testFile);
    expect(result.success).toBe(true);
    expect(fileExists(testFile)).toBe(false);
  });

  it('returns error for missing file', () => {
    const testFile = path.join(TEST_DIR, 'missing.json');

    const result = deleteFile(testFile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('File not found');
    }
  });
});

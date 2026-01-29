/**
 * Persistence Layer - Basic File I/O
 *
 * RULES (from governance):
 * - Read entire file, parse, validate JSON syntax
 * - Write entire file (no partial writes)
 * - No caching across operations
 * - No data mutation during read/write
 *
 * NOTE: Atomic writes with temp files will be added in Phase D (Day 4)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ReadResult<T> {
  success: true;
  data: T;
}

export interface ReadError {
  success: false;
  error: string;
  filePath: string;
}

export type ReadFileResult<T> = ReadResult<T> | ReadError;

export interface WriteResult {
  success: true;
}

export interface WriteError {
  success: false;
  error: string;
  filePath: string;
}

export type WriteFileResult = WriteResult | WriteError;

/**
 * Read and parse JSON file
 *
 * - Reads entire file
 * - Parses JSON (strict mode)
 * - Returns parse errors if invalid
 * - No caching
 */
export function readJSONFile<T>(filePath: string): ReadFileResult<T> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: `File not found: ${filePath}`,
        filePath
      };
    }

    // Read entire file
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Parse JSON (strict)
    let parsed: T;
    try {
      parsed = JSON.parse(fileContent);
    } catch (parseError) {
      return {
        success: false,
        error: `Invalid JSON syntax: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        filePath
      };
    }

    return {
      success: true,
      data: parsed
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      filePath
    };
  }
}

/**
 * Write JSON file
 *
 * - Serializes to JSON (pretty-printed, 2-space indent)
 * - Writes entire file
 * - Returns write errors if failed
 *
 * NOTE: This is a simple write. Atomic writes with temp files
 * will be implemented in Phase D (Day 4).
 */
export function writeJSONFile(filePath: string, data: any): WriteFileResult {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Serialize to JSON (pretty-printed)
    const jsonContent = JSON.stringify(data, null, 2);

    // Write to file
    fs.writeFileSync(filePath, jsonContent, 'utf-8');

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
      filePath
    };
  }
}

/**
 * Read multiple JSON files
 *
 * - Loads multiple files
 * - Reports which files failed
 * - Continues on error (collect all failures)
 * - Returns map of filename → data or error
 */
export interface BatchReadResult<T> {
  results: Map<string, ReadFileResult<T>>;
  successCount: number;
  errorCount: number;
}

export function readJSONFiles<T>(filePaths: string[]): BatchReadResult<T> {
  const results = new Map<string, ReadFileResult<T>>();
  let successCount = 0;
  let errorCount = 0;

  for (const filePath of filePaths) {
    const result = readJSONFile<T>(filePath);
    results.set(filePath, result);

    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  return {
    results,
    successCount,
    errorCount
  };
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Get file modification time
 */
export function getFileModifiedTime(filePath: string): Date | null {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime;
  } catch {
    return null;
  }
}

/**
 * Delete file
 */
export function deleteFile(filePath: string): WriteFileResult {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: `File not found: ${filePath}`,
        filePath
      };
    }

    fs.unlinkSync(filePath);

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`,
      filePath
    };
  }
}

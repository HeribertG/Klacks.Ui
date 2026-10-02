// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Collects every non-empty string reachable from arbitrary values (objects, arrays, strings).
 * @param values - Root values to scan; nesting is bounded by MAX_SOURCE_DEPTH and cycles are skipped
 */

const MAX_SOURCE_DEPTH = 8;

export function collectStrings(values: readonly unknown[]): string[] {
  const result: string[] = [];
  const visited = new Set<object>();

  const visit = (value: unknown, depth: number): void => {
    if (typeof value === 'string') {
      if (value) {
        result.push(value);
      }
      return;
    }
    if (value === null || typeof value !== 'object' || depth > MAX_SOURCE_DEPTH || visited.has(value)) {
      return;
    }
    visited.add(value);
    const children = Array.isArray(value) ? value : Object.values(value);
    for (const child of children) {
      visit(child, depth + 1);
    }
  };

  for (const value of values) {
    visit(value, 0);
  }
  return result;
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared directory walker for the guard and translation specs that scan the Ui sources.
 * Symlinked or junctioned folders are not followed, so a scanned tree must not rely on them.
 * @param directory - Absolute folder to walk recursively
 * @param isWanted - Decides per absolute file path whether the file is returned
 * @param skippedFolders - Folder names (compared case-insensitively) that are not entered
 */
import { readdirSync } from 'fs';
import { join } from 'path';

export const BUILD_OUTPUT_FOLDERS: readonly string[] = ['node_modules', 'dist', '.angular'];

export function collectFiles(
  directory: string,
  isWanted: (path: string) => boolean,
  skippedFolders: readonly string[] = [],
): string[] {
  const skipped = new Set(skippedFolders.map((folder) => folder.toLowerCase()));
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        if (!skipped.has(entry.name.toLowerCase())) walk(path);
      } else if (isWanted(path)) {
        found.push(path);
      }
    }
  };
  walk(directory);
  return found;
}

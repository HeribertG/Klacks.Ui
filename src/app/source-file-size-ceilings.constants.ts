// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shrink-only ceilings for the production .ts and .html files that exceed the 800-line limit, keyed by path relative to
 * Klacks.Ui with the line count they had when the size guard was introduced (2026-10-23). source-file-size.guard.spec.ts
 * fails when a listed file grows, when a listed file is back at or under the limit, and when a ceiling is higher than the
 * current size of its file - so an entry must be deleted or lowered in the same change that shrinks the file. Never add an
 * entry and never raise a ceiling: split the file instead. MAX_CEILING_ENTRIES caps the list size, so a new entry would
 * need a second, visible change; lower it whenever entries are deleted. The target state is an empty list.
 */
export const MAX_CEILING_ENTRIES = 0;

export const FILE_SIZE_CEILINGS: Readonly<Record<string, number>> = {
};

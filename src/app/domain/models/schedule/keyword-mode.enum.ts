// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Keyword mode a wizard run planned in (wire value of the backend enum).
 * Hard: the restricting schedule commands (FREE, EARLY / LATE / NIGHT, -EARLY / -LATE / -NIGHT) are kept strictly.
 * Soft: they rank as wishes and may be broken to fill more shifts.
 */
export enum KeywordMode {
  Hard = 0,
  Soft = 1,
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Global harmony of a plan (second instance of the harmonizer), each value 0..1.
 * @param total - Weighted sum of rhythm and fairness
 * @param rhythm - How well the rows are shifted copies of one common pattern (canon)
 * @param fairness - How evenly early, late, night and weekend work is shared
 */
export interface GlobalHarmony {
  total: number;
  rhythm: number;
  fairness: number;
}

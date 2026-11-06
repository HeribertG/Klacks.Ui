// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One missed schedule-command wish prepared for display.
 * @param clientName - Display name of the employee
 * @param date - Calendar date wire value of the day
 * @param keyword - Backend keyword name (Free, NotFree, OnlyEarly, NoEarly, ...)
 * @param outcome - How the wish was missed (BrokenFree, BrokenOnly, BrokenNo, Unfulfilled)
 */
export interface KeywordWishRow {
  clientName: string;
  date: string;
  keyword: string;
  outcome: string;
}

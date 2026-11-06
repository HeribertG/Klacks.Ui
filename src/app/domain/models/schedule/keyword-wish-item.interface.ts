// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One missed schedule-command wish of a plan, as the backend reports it.
 * @param clientId - The employee
 * @param clientName - Display name of the employee; the client id as text when the server could not read it, absent in
 *   evaluations stored before the field existed
 * @param date - Calendar date wire value of the day
 * @param keyword - Backend keyword name (Free, NotFree, OnlyEarly, NoEarly, ...)
 * @param outcome - How the wish was missed (BrokenFree, BrokenOnly, BrokenNo, Unfulfilled)
 */
export interface KeywordWishItem {
  clientId: string;
  clientName?: string | null;
  date: string;
  keyword: string;
  outcome: string;
}

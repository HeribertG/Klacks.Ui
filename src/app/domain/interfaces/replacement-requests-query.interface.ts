// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Query for GET Recovery/Requests: the stored replacement requests of one absent employee.
 * @param fromDate - First calendar day "yyyy-MM-dd"
 * @param untilDate - Last calendar day "yyyy-MM-dd"
 * @param analyseToken - Restricts the list to one scenario
 */
export interface IReplacementRequestsQuery {
  absentClientId: string;
  fromDate?: string | null;
  untilDate?: string | null;
  analyseToken?: string | null;
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Query of a plugin for the scheduled works of a date range.
 * @param startDate - First calendar day (yyyy-MM-dd)
 * @param endDate - Last calendar day (yyyy-MM-dd)
 * @param showEmployees - Include employees
 * @param showExtern - Include external staff
 * @param rowCount - Maximum number of schedule rows
 */

export interface IPluginWorkScheduleQuery {
  startDate: string;
  endDate: string;
  showEmployees: boolean;
  showExtern: boolean;
  rowCount: number;
}

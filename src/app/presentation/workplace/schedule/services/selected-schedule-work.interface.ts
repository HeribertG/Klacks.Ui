// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The Work the planner has selected in the schedule grid.
 * @param clientId - Employee the selected Work belongs to
 * @param date - Day of the selected cell
 */
export interface ISelectedScheduleWork {
  clientId: string;
  date: Date;
}

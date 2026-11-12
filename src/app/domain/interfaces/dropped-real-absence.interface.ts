// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * A real absence an accept would delete because the scenario carries no absence of the same type for that person on
 * that day.
 * @param clientId - The absent person
 * @param clientName - Display name of the absent person
 * @param date - Day of the absence (yyyy-MM-dd)
 * @param absenceId - Absence type of the real entry
 */
export interface IDroppedRealAbsence {
  clientId: string;
  clientName: string;
  date: string;
  absenceId: string;
}

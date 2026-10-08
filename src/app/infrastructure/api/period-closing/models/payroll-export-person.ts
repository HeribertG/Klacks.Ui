// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * A person whose payroll content is new or changed since the last export of the period and format.
 * previousRevision is null when the person is new.
 */
export interface PayrollExportPerson {
  clientId: string;
  clientName: string;
  idNumber: number;
  isNew: boolean;
  previousRevision: number | null;
}

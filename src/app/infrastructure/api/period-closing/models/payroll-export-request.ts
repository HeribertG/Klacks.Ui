// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Body of a payroll export. clientIds restricts the export to a selection of persons; omitted exports every new or changed person.
 */
export interface PayrollExportRequest {
  fromDate: string;
  untilDate: string;
  language: string;
  format: string;
  clientIds?: string[];
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Why a person or day blocks a payroll export; serialized by the backend as the enum name.
 */
export enum PayrollExportBlockReason {
  EntryNotClosed = 'EntryNotClosed',
  DayNotLocked = 'DayNotLocked',
  OverlappingExport = 'OverlappingExport',
}

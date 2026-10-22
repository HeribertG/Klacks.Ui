// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface GanttBreakBar {
  from?: string | Date;
  until?: string | Date;
  absenceId?: string;
  absence?: { color?: string };
}

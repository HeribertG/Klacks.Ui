// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IRecoveryDialogPreset {
  /** The employee that fell out; empty means the planner picks one in the dialog. */
  clientId?: string;
  /** First day of the absence; empty means the dialog derives a default from the visible period. */
  date?: Date;
  /** Last day of the absence; empty means a single day. */
  untilDate?: Date;
}

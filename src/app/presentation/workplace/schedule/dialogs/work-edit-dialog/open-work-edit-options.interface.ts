// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IOpenWorkEditOptions {
  workId: string;
  clientId: string;
  shiftId: string;
  currentDate: Date;
  workStartTime: string;
  workEndTime: string;
  information: string | null;
  lockLevel: number;
  surcharges: number;
}

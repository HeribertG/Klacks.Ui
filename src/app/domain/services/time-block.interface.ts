// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ITimeBlock {
  id: string;
  fixedStartTime?: string;
  fixedEndTime?: string;
  durationMinutes: number;
  isMovable: boolean;
}

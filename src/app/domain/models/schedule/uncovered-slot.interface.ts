// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IUncoveredSlot {
  shiftId: string;
  date: string;
  reason: string;
  /** The cloned work in the scenario that stayed open; absent on older backends. */
  workId?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ICoverRelocation {
  shiftId: string;
  /** Workday of the work that is handed on; it can differ from the day of the covered slot. */
  date: string;
  fromClientId: string;
  fromName: string;
  toClientId: string;
  toName: string;
  startTime: string;
  endTime: string;
  /** Same label identifiers as ICoveredSlot.tier. */
  tier: number;
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure helper that tells which employees carry at least one Work entry in the loaded schedule entries.
 * Breaks, work changes and expenses do not count: only a Work can be covered by a stand-in.
 * @param entries - Loaded schedule entries (any entry type) of the shown group and period
 */
import { IScheduleCell, WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';

type WorkEntryProbe = Pick<IScheduleCell, 'clientId' | 'entryType'>;

export function collectClientIdsWithWork(entries: readonly WorkEntryProbe[]): Set<string> {
  const clientIds = new Set<string>();
  for (const entry of entries) {
    if (entry.entryType === WorkScheduleEntryType.Work) {
      clientIds.add(entry.clientId);
    }
  }
  return clientIds;
}

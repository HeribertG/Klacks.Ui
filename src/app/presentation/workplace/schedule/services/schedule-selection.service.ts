// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Publishes the Work the planner has selected in the schedule grid (table cell or timeline block) so
 * components outside the grid, like the toolbar, can offer actions that need a selected Work. Root-scoped
 * because the grid services live below the schedule section while the toolbar sits above it.
 * @param selectedWork - The selected Work (employee and day), null while the selection is empty or not a Work
 */

import { Injectable, signal } from '@angular/core';
import { ISelectedScheduleWork } from './selected-schedule-work.interface';

@Injectable({ providedIn: 'root' })
export class ScheduleSelectionService {
  private readonly _selectedWork = signal<ISelectedScheduleWork | null>(null);

  readonly selectedWork = this._selectedWork.asReadonly();

  select(work: ISelectedScheduleWork | null): void {
    const current = this._selectedWork();
    if (current === null && work === null) {
      return;
    }
    if (current && work && current.clientId === work.clientId && current.date.getTime() === work.date.getTime()) {
      return;
    }
    this._selectedWork.set(work);
  }

  clear(): void {
    this.select(null);
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Holds the currently selected timeline block (Work / WorkChange / Break).
 * Cleared automatically when the user leaves the timeline view. The selection
 * survives data refreshes; callers must clear it explicitly when the underlying
 * entry becomes stale (e.g. after a CRUD operation that removes the entry).
 * @param selectedBlock - Signal with the active selection or null when nothing is selected
 */
import { Injectable, Injector, effect, inject, runInInjectionContext, signal } from '@angular/core';
import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { ScheduleViewModeService } from '../../../services/schedule-view-mode.service';

export interface SelectedTimelineBlock {
  row: number;
  col: number;
  entry: IScheduleCell;
}

@Injectable()
export class TimelineSelectionService {
  private viewModeService = inject(ScheduleViewModeService);
  private injector = inject(Injector);

  public readonly selectedBlock = signal<SelectedTimelineBlock | null>(null);

  constructor() {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        if (!this.viewModeService.isTimelineMode()) {
          this.clearBlock();
        }
      });
    });
  }

  public selectBlock(ref: SelectedTimelineBlock): void {
    const current = this.selectedBlock();
    if (
      current &&
      current.row === ref.row &&
      current.col === ref.col &&
      current.entry.id === ref.entry.id
    ) {
      return;
    }
    this.selectedBlock.set(ref);
  }

  public clearBlock(): void {
    if (this.selectedBlock() !== null) {
      this.selectedBlock.set(null);
    }
  }
}

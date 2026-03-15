// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service handling navigation within the schedule grid.
 * Scrolls to specific schedule entries and triggers navigation
 * to the shift section when requested via context menu.
 *
 * @relations
 * - Used by: ScheduleSectionComponent
 * - Uses: ShowInShiftService to navigate to shift section
 * - Uses: ScrollService for scroll position control
 */
import { inject, Injectable } from '@angular/core';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ShowInShiftService } from '../../services/show-in-shift.service';
import { ScheduleDataService } from './schedule-data.service';

export interface ScrollbarState {
  value: number;
  maxValue: number;
  visibleValue: number;
}

@Injectable()
export class ScheduleNavigationService {
  private cellManipulation = inject(BaseCellManipulationService);
  private settings = inject(BaseSettingsService);
  private showInShiftService = inject(ShowInShiftService);

  showSelectedShiftInShiftSection(dataService: ScheduleDataService): void {
    const pos = this.cellManipulation.Position;
    if (pos.isEmpty()) return;

    const entry = dataService.getWorkScheduleEntryForCell(pos.row, pos.column);
    if (!entry) return;

    this.showInShiftService.showShift(entry.entryId, pos.column);
  }

  scrollToScheduleEntry(
    shiftId: string,
    column: number,
    dataService: ScheduleDataService,
    drawScheduleHeight: number,
    vScrollbar: ScrollbarState,
    moveGridCallback: () => void
  ): void {
    const rowIndex = dataService.findFirstRowByShiftIdAndColumn(shiftId, column);

    if (rowIndex >= 0) {
      const visibleRows = Math.floor(
        (drawScheduleHeight - this.settings.cellHeaderHeight) /
          this.settings.cellHeight
      );
      const targetScroll = Math.max(0, rowIndex - Math.floor(visibleRows / 2));

      vScrollbar.maxValue = dataService.rows;
      vScrollbar.value = targetScroll;
      dataService.setScrollPosition(targetScroll);

      this.cellManipulation.PositionCollection.clear();
      this.cellManipulation.Position = new MyPosition(rowIndex, column);

      moveGridCallback();
    }
  }

  scrollToClient(
    clientId: string,
    date: string,
    dataService: ScheduleDataService,
    drawScheduleHeight: number,
    vScrollbar: ScrollbarState,
    moveGridCallback: () => void
  ): void {
    const rowIndex = dataService.findRowByClientId(clientId);
    const column = dataService.getColumnForDate(date);

    if (rowIndex >= 0 && column >= 0) {
      const visibleRows = Math.floor(
        (drawScheduleHeight - this.settings.cellHeaderHeight) /
          this.settings.cellHeight
      );
      const targetScroll = Math.max(0, rowIndex - Math.floor(visibleRows / 2));

      vScrollbar.maxValue = dataService.rows;
      vScrollbar.value = targetScroll;
      dataService.setScrollPosition(targetScroll);

      this.cellManipulation.PositionCollection.clear();
      this.cellManipulation.Position = new MyPosition(rowIndex, column);

      moveGridCallback();
    }
  }
}

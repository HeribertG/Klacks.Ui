// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service handling navigation within the shift grid.
 * Scrolls to specific shift rows when navigating from schedule section.
 * Centers the target row in the visible viewport.
 *
 * @relations
 * - Used by: ShiftSectionComponent
 * - Responds to: ShowInShiftService requests
 * - Uses: ScrollService for scroll position control
 */
import { inject, Injectable } from '@angular/core';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ShiftDataService } from './shift-data.service';

export interface ScrollbarState {
  value: number;
  maxValue: number;
  visibleValue: number;
}

@Injectable()
export class ShiftNavigationService {
  private scrollService = inject(ScrollService);
  private settings = inject(BaseSettingsService);

  scrollToShift(
    shiftId: string,
    column: number,
    dataService: ShiftDataService,
    drawScheduleHeight: number,
    vScrollbar: ScrollbarState,
    moveGridCallback: () => void
  ): void {
    const rowIndex = dataService.findRowByShiftIdAndColumn(shiftId, column);

    if (rowIndex >= 0) {
      const visibleRows = Math.floor(
        (drawScheduleHeight - this.settings.cellHeaderHeight) /
          this.settings.cellHeight
      );
      const targetScroll = Math.max(0, rowIndex - Math.floor(visibleRows / 2));

      vScrollbar.value = targetScroll;
      this.scrollService.verticalScrollPosition = targetScroll;
      moveGridCallback();
    }
  }
}

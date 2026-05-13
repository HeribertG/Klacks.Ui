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
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { ShiftDataService } from './shift-data.service';
import { ScrollbarState } from '../../services/scrollbar-state.interface';

@Injectable()
export class ShiftNavigationService {
  private cellManipulation = inject(BaseCellManipulationService);
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

      vScrollbar.maxValue = dataService.rows;
      vScrollbar.value = targetScroll;
      dataService.setScrollPosition(targetScroll);

      this.cellManipulation.PositionCollection.clear();
      this.cellManipulation.Position = new MyPosition(rowIndex, column);

      moveGridCallback();
    }
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service building context menus for the shift grid.
 * Provides "Show in Schedule" option when shift has engaged employees.
 * Triggers navigation to corresponding entries in schedule section.
 *
 * @relations
 * - Used by: ShiftSectionComponent
 * - Uses: ShowInScheduleService for navigation
 * - Uses: MenuDataTemplate for menu item templates
 */
import { inject, Injectable } from '@angular/core';
import { Menu } from 'src/app/presentation/shared/context-menu/context-menu-class';
import { MenuDataTemplate } from 'src/app/presentation/helpers/context-menu-data-template';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { ShowInScheduleService } from '../../services/show-in-schedule.service';
import { ShiftDataService } from './shift-data.service';

@Injectable()
export class ShiftContextMenuService {
  private cellManipulation = inject(BaseCellManipulationService);
  private showInScheduleService = inject(ShowInScheduleService);

  createContextMenu(row: number, column: number, dataService: ShiftDataService): Menu {
    const menuData = new Menu();
    const engagedCount = dataService.getEngagedCount(row, column);

    if (engagedCount > 0) {
      menuData.list.push(...MenuDataTemplate.showInSchedule());
    }

    return menuData;
  }

  showSelectedShiftInScheduleSection(dataService: ShiftDataService): void {
    const pos = this.cellManipulation.Position;
    if (pos.isEmpty()) return;

    const shiftId = dataService.getShiftId(pos.row);
    if (!shiftId) return;

    this.showInScheduleService.showSchedule(shiftId, pos.column);
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service handling tooltip display for schedule and shift grids.
 * Shows tooltips for header cells (available/overbooked shifts) and
 * body cells (holiday names). Supports multi-language content.
 *
 * @relations
 * - Used by: ScheduleSectionComponent, ShiftSectionComponent
 * - Uses: DataManagementScheduleService for shift availability data
 * - Uses: TranslateService for localization
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Language } from 'src/app/application/helpers/sharedItems';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { HoveredCellInfo } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { GridSurfaceTemplateComponent } from 'src/app/presentation/shared/grid/body/grid-surface-template/grid-surface-template.component';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';

export interface TooltipState {
  lastHeaderColumn: number;
}

@Injectable({
  providedIn: 'root',
})
export class ScheduleTooltipService {
  private translateService = inject(TranslateService);
  private dataManagement = inject(DataManagementScheduleService);

  private currentLang: Language = DomainMessages.DEFAULT_LANG;

  initLanguage(): void {
    this.currentLang = this.translateService.currentLang as Language;
  }

  handleHoveredCell(
    hoveredCell: HoveredCellInfo | null,
    dataService: BaseDataService,
    surface: GridSurfaceTemplateComponent,
    state: TooltipState,
    showHeaderTooltips: boolean
  ): number {
    if (!hoveredCell) {
      state.lastHeaderColumn = -1;
      surface.destroyToolTip();
      return -1;
    }

    if (hoveredCell.isHeader && showHeaderTooltips) {
      return this.handleHeaderTooltip(hoveredCell, surface, state);
    }

    state.lastHeaderColumn = -1;

    if (hoveredCell.isEmpty) {
      const holiday = dataService.holidayInfo(hoveredCell.column);
      if (holiday?.currentName) {
        const holidayName = this.getTranslatedText(holiday.currentName);
        if (holidayName) {
          surface.showToolTip({
            value: holidayName,
            event: {
              clientX: hoveredCell.clientX,
              clientY: hoveredCell.clientY,
            } as MouseEvent,
          });
          return state.lastHeaderColumn;
        }
      }
    } else {
      const cell = dataService.getCell(hoveredCell.row, hoveredCell.column);
      if (cell?.tooltip) {
        surface.showToolTip({
          value: this.translateService.instant(cell.tooltip),
          event: {
            clientX: hoveredCell.clientX,
            clientY: hoveredCell.clientY,
          } as MouseEvent,
        });
        return state.lastHeaderColumn;
      }
    }

    surface.destroyToolTip();
    return state.lastHeaderColumn;
  }

  private handleHeaderTooltip(
    hoveredCell: HoveredCellInfo,
    surface: GridSurfaceTemplateComponent,
    state: TooltipState
  ): number {
    const columnChanged = state.lastHeaderColumn !== hoveredCell.column;
    state.lastHeaderColumn = hoveredCell.column;

    const column = hoveredCell.column;
    const availableShifts = this.dataManagement.availableShiftsByDay;
    const overbookedShifts = this.dataManagement.overbookedShiftsByDay;

    const available = availableShifts?.[column] ?? [];
    const overbooked = overbookedShifts?.[column] ?? [];

    if (available.length === 0 && overbooked.length === 0) {
      surface.destroyToolTip();
      return state.lastHeaderColumn;
    }

    if (columnChanged) {
      surface.destroyToolTip();
    }

    const tooltipText = this.buildHeaderTooltipText(overbooked, available);
    surface.showToolTip({
      value: tooltipText,
      event: {
        clientX: hoveredCell.clientX,
        clientY: hoveredCell.clientY,
      } as MouseEvent,
    });

    return state.lastHeaderColumn;
  }

  private buildHeaderTooltipText(
    overbooked: readonly string[],
    available: readonly string[]
  ): string {
    const MAX_ITEMS = 15;
    const lines: string[] = [];

    if (overbooked.length > 0) {
      const label = this.translateService.instant('schedule.tooltip.overbooked');
      const display = overbooked.slice(0, MAX_ITEMS);
      const remaining = overbooked.length - MAX_ITEMS;
      let text = display.join(', ');
      if (remaining > 0) {
        text += ` (+${remaining})`;
      }
      lines.push(`${label}:\n${text}`);
    }

    if (available.length > 0) {
      const label = this.translateService.instant('schedule.tooltip.available');
      const display = available.slice(0, MAX_ITEMS);
      const remaining = available.length - MAX_ITEMS;
      let text = display.join(', ');
      if (remaining > 0) {
        text += ` (+${remaining})`;
      }
      lines.push(`${label}:\n${text}`);
    }

    return lines.join('\n\n');
  }

  private getTranslatedText(multiLanguage: MultiLanguage): string {
    return getLocalizedValue(multiLanguage, this.currentLang);
  }
}

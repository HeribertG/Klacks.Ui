import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MultiLanguage } from 'src/app/domain/models/multi-language-class';
import { Language } from 'src/app/application/helpers/sharedItems';
import { MessageLibrary } from 'src/app/domain/constants/message-library';
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

  private currentLang: Language = MessageLibrary.DEFAULT_LANG;

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
    const lines: string[] = [];

    if (overbooked.length > 0) {
      const label = this.translateService.instant('schedule.tooltip.overbooked');
      lines.push(`${label}:<br>${overbooked.join(', ')}`);
    }

    if (overbooked.length > 0 && available.length > 0) {
      lines.push('<br>');
    }

    if (available.length > 0) {
      const label = this.translateService.instant('schedule.tooltip.available');
      lines.push(`${label}:<br>${available.join(', ')}`);
    }

    return lines.join('');
  }

  private getTranslatedText(multiLanguage: MultiLanguage): string {
    return multiLanguage[this.currentLang] || multiLanguage.de || '';
  }
}

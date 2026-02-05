/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Formatter for work schedule entry cells. Displays shift abbreviation,
 * time range, and applies appropriate styling including work change indicators.
 *
 * @relations
 * - Implements: ICellFormatter
 * - Uses: EmptyCellFormatterService for empty entries
 * - Used by: ScheduleDataService
 */
import { inject, Injectable } from '@angular/core';
import { IScheduleCell } from 'src/app/domain/models/work-schedule-class';
import { WorkLockLevelService } from 'src/app/domain/services/schedule/work-lock-level.service';
import { formatTime } from 'src/app/shared/helpers/time-format.helper';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import { CellIcon } from 'src/app/presentation/shared/grid/classes/cell-icon';
import { CellTypeEnum, IconCornerEnum } from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { ICellFormatter } from './cell-formatter.interface';
import { EmptyCellFormatterService } from './empty-cell-formatter.service';

@Injectable()
export class WorkCellFormatterService implements ICellFormatter {
  private emptyFormatter = inject(EmptyCellFormatterService);
  private lockLevelService = inject(WorkLockLevelService);

  formatCell(entry: IScheduleCell | undefined): GridCell {
    if (!entry) {
      return this.emptyFormatter.formatCell(entry);
    }

    const cell = new GridCell();
    cell.cellType = CellTypeEnum.Standard;
    cell.mainText = entry.abbreviation || '';
    cell.firstSubText = this.formatWorkTime(entry.changeTime);
    cell.secondSubText =
      formatTime(entry.startTime) + ' - ' + formatTime(entry.endTime);

    const lockIcon = this.lockLevelService.getLockIcon(entry.lockLevel);
    if (lockIcon) {
      cell.icons = [new CellIcon(lockIcon, IconCornerEnum.TopRight, 12)];
    }

    const tooltip = this.lockLevelService.getLockTooltip(entry.lockLevel, entry.isGroupRestricted);
    if (tooltip) {
      cell.tooltip = tooltip;
    }

    cell.sealed = entry.lockLevel > 0 || entry.isGroupRestricted;

    return cell;
  }

  protected formatWorkTime(hours: number | null): string {
    if (hours === null || hours === 0) return '';
    const wholeHours = Math.floor(Math.abs(hours));
    const mins = Math.round((Math.abs(hours) - wholeHours) * 60);
    const sign = hours < 0 ? '-' : '';
    if (wholeHours === 0) return `${sign}${mins}m`;
    if (mins === 0) return `${sign}${wholeHours}h`;
    return `${sign}${wholeHours}h ${mins}m`;
  }
}

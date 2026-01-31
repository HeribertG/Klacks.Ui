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
import { formatTime } from 'src/app/shared/helpers/time-format.helper';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import { CellTypeEnum } from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { ICellFormatter } from './cell-formatter.interface';
import { EmptyCellFormatterService } from './empty-cell-formatter.service';

@Injectable()
export class WorkCellFormatterService implements ICellFormatter {
  private emptyFormatter = inject(EmptyCellFormatterService);

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

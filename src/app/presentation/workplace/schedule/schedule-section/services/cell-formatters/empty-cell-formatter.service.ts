/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Formatter for empty schedule cells. Returns a GridCell with empty type
 * and no content. Used as fallback by other formatters.
 *
 * @relations
 * - Implements: ICellFormatter
 * - Used by: WorkCellFormatterService, BreakCellFormatterService (as fallback)
 * - Used by: ScheduleDataService
 */
import { Injectable } from '@angular/core';
import { IScheduleCell } from 'src/app/domain/models/work-schedule-class';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import { CellTypeEnum } from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { ICellFormatter } from './cell-formatter.interface';

@Injectable()
export class EmptyCellFormatterService implements ICellFormatter {
  formatCell(_entry: IScheduleCell | undefined): GridCell {
    const cell = new GridCell();
    cell.cellType = CellTypeEnum.Empty;
    cell.mainText = '';
    cell.firstSubText = '';
    cell.secondSubText = '';
    return cell;
  }
}

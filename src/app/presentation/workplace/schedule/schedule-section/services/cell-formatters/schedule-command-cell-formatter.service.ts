// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Formats schedule command entries for grid cell display in purple.
 * @param entry - The schedule cell data to format
 */
import { Injectable } from '@angular/core';
import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';
import { ICellFormatter } from './cell-formatter.interface';
import { CellTypeEnum, TextAlignmentEnum } from 'src/app/presentation/shared/grid/enums/cell-settings.enum';

@Injectable()
export class ScheduleCommandCellFormatterService implements ICellFormatter {

  formatCell(entry: IScheduleCell | undefined): GridCell {
    const cell = new GridCell();
    if (!entry) return cell;

    cell.cellType = CellTypeEnum.Standard;
    cell.mainText = entry.description?.de || entry.description?.en || '';
    cell.mainTextAlignment = TextAlignmentEnum.Left;
    cell.fontColor = '#9B59B6';

    return cell;
  }
}

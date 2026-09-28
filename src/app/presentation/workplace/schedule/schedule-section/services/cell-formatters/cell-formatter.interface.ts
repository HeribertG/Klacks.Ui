// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * @copyright 2025 Heribert Gasparoli
 *
 * @description
 * Interface defining the contract for cell formatters.
 * Cell formatters transform schedule entry data into displayable GridCell objects.
 *
 * @relations
 * - Implemented by: EmptyCellFormatterService, WorkCellFormatterService, BreakCellFormatterService
 * - Used by: ScheduleDataService
 */
import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';

export interface ICellFormatter {
  formatCell(entry: IScheduleCell | undefined): GridCell;
}

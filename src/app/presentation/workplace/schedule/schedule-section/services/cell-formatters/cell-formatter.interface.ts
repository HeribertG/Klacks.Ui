import { IScheduleCell } from 'src/app/domain/models/work-schedule-class';
import { GridCell } from 'src/app/presentation/shared/grid/classes/grid-cell';

export interface ICellFormatter {
  formatCell(entry: IScheduleCell | undefined): GridCell;
}

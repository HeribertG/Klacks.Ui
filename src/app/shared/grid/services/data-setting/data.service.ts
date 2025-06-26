/* eslint-disable @typescript-eslint/no-explicit-any */

import { inject, Injectable, signal } from '@angular/core';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { GridCell } from '../../classes/grid-cell';
import { HolidayDate } from 'src/app/core/calendar-rule-class';
import { WeekDaysEnum } from '../../enums/divers';
import { HolidayCollectionService } from '../holiday-collection.service';

@Injectable()
export abstract class BaseDataService {
  protected gridScroll = inject(ScrollService);
  public refreshSignal = signal<boolean>(false);
  public holidayCollection = inject(HolidayCollectionService);

  abstract rowGroupIndex: number[];
  abstract indexGroupRow: number[];

  abstract startDate: Date | undefined;
  abstract getGroupIndex(index: number): any;
  abstract initializeDateAndColumns(): void;
  abstract setMetrics(): void;
  abstract getCell(row: number, col: number): GridCell;
  abstract getWeekday(column: number): WeekDaysEnum;
  abstract weekdayName(column: number): string;
  abstract holidayInfo(column: number): HolidayDate | undefined;
  abstract isLastGroupRow(row: number): boolean;
  abstract getItemMainText(row: number, col: number): string;
  abstract get rows(): number;
  abstract get columns(): number;
  abstract get indexes(): number;
}

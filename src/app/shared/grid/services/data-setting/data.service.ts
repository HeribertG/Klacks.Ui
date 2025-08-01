/* eslint-disable @typescript-eslint/no-explicit-any */

import { inject, Injectable, signal } from '@angular/core';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { GridCell } from '../../classes/grid-cell';
import { HolidayDate } from 'src/app/core/calendar-rule-class';
import { WeekDaysEnum } from '../../enums/divers';
import { HolidayCollectionService } from '../holiday-collection.service';
import { HeaderCellTypeEnum } from '../../enums/cell-settings.enum';

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
  abstract isOverlayDay(column: number): boolean;
  abstract isColumnSealed(column: number): boolean;
  abstract holidayInfo(column: number): HolidayDate | undefined;
  abstract isLastGroupRow(row: number): boolean;
  abstract getItemMainText(row: number, col: number): string;
  abstract get rows(): number;
  abstract get columns(): number;
  abstract get indexes(): number;
  abstract getInfo1(index: number): string;
  abstract getInfo2(index: number): string;
  abstract getInfo3(index: number): string;
  abstract columnStatus(column: number): HeaderCellTypeEnum;
}

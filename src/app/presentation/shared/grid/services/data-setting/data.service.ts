/* eslint-disable @typescript-eslint/no-explicit-any */

import { inject, Injectable, signal } from '@angular/core';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { GridCell } from '../../classes/grid-cell';
import { HolidayDate } from 'src/app/domain/models/calendar-rule-class';
import { WeekDaysEnum } from '../../enums/divers';
import { HolidayCollectionService } from '../holiday-collection.service';
import { HeaderCellTypeEnum } from '../../enums/cell-settings.enum';

@Injectable()
export abstract class BaseDataService {
  protected gridScroll = inject(ScrollService);
  public refreshSignal = signal<boolean>(false);
  public rebuildSignal = signal<boolean>(false);
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
  // Row header info slots - displayed in the right side of each row header
  // Slot 1: Top position (e.g., scheduled hours in schedule, shift name in shifts)
  // Slot 2: Middle position (e.g., worked hours)
  // Slot 3: Bottom position (e.g., additional hours)
  abstract getRowHeaderSlot1Text(index: number): string;
  abstract getRowHeaderSlot2Text(index: number): string;
  abstract getRowHeaderSlot3Text(index: number): string;
  abstract columnStatus(column: number): HeaderCellTypeEnum;

  getHeaderFontColor(_column: number): string | null {
    return null;
  }

  isCellActive(row: number, col: number): boolean {
    try {
      const cell = this.getCell(row, col);
      return cell?.mainText !== undefined && cell.mainText !== '';
    } catch {
      return false;
    }
  }

  isRowHighlighted(_row: number): boolean {
    return false;
  }

  isCellHighlighted(row: number, _col: number): boolean {
    return this.isRowHighlighted(row);
  }

  isCellEditable(_row: number, _col: number): boolean {
    return true;
  }
}

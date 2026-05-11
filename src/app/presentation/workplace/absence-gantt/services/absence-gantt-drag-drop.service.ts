// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import {
  addDays,
  daysBetweenDates,
  equalDate,
} from 'src/app/shared/helpers/date.helper';
import { CalendarSettingService } from 'src/app/presentation/workplace/absence-gantt/services/calendar-setting.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';
import { BreakPlaceholder } from 'src/app/domain/models/break/break-class';
import { EntrySource } from 'src/app/domain/enums/entry-source.enum';
import { CursorEnum } from 'src/app/presentation/shared/grid/enums/cursor_enums';
import { DrawCalendarGanttService } from 'src/app/presentation/workplace/absence-gantt/services/draw-calendar-gantt.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { SelectedArea } from 'src/app/presentation/shared/grid/enums/breaks_enums';
import { GanttCoordinateService } from './gantt-coordinate.service';

@Injectable()
export class AbsenceGanttDragDropService {
  private calendarSetting = inject(CalendarSettingService);
  private dataManagementBreak = inject(DataManagementBreakPlaceholderService);
  private dataManagementAbsence = inject(DataManagementAbsenceGanttService);
  private drawCalendarGantt = inject(DrawCalendarGanttService);
  private scroll = inject(ScrollService);
  private coord = inject(GanttCoordinateService);

  selectedArea: SelectedArea = SelectedArea.None;

  private mouseToBarAlpha: { x: number; y: number } | undefined;
  private originalBreakPosition:
    | { startColumn: number; endColumn: number }
    | undefined;
  private dragStartMouseX: number | undefined;

  private set currentCursor(cursor: CursorEnum) {
    document.body.style.cursor = cursor;
  }

  private get currentCursor(): CursorEnum {
    return document.body.style.cursor as CursorEnum;
  }

  onMouseDown(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    if (this.drawCalendarGantt.selectedBreak?.entrySource === EntrySource.Schedule) {
      return;
    }

    const x = event.offsetX;
    const y = event.offsetY;

    if (this.selectedArea !== SelectedArea.None) {
      this.currentCursor = CursorEnum.wResize;
      if (!this.mouseToBarAlpha && this.drawCalendarGantt.selectedBreakRec) {
        this.mouseToBarAlpha = {
          x: x - this.drawCalendarGantt.selectedBreakRec.left,
          y: y - this.drawCalendarGantt.selectedBreakRec.top,
        };
      }

      if (
        this.selectedArea === SelectedArea.AbsenceBar &&
        this.drawCalendarGantt.selectedBreak
      ) {
        this.dragStartMouseX = x;
        this.originalBreakPosition = {
          startColumn: Math.floor(
            daysBetweenDates(
              this.drawCalendarGantt.startDate,
              this.drawCalendarGantt.selectedBreak.from as Date
            )
          ),
          endColumn: Math.floor(
            daysBetweenDates(
              this.drawCalendarGantt.startDate,
              this.drawCalendarGantt.selectedBreak.until as Date
            )
          ),
        };
      }
    }
  }

  onMouseUp(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    this.currentCursor = CursorEnum.default;
    this.mouseToBarAlpha = undefined;
    this.originalBreakPosition = undefined;
    this.dragStartMouseX = undefined;
    this.updateSelectedBreakIfNecessary();
  }

  onMouseMove(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    const x = event.offsetX;

    if (this.selectedArea !== SelectedArea.None) {
      if (
        this.drawCalendarGantt.selectedBreakRec &&
        !this.drawCalendarGantt.selectedBreakRec.isEmpty()
      ) {
        switch (this.selectedArea) {
          case SelectedArea.LeftAnchor: {
            const leftDiffDay = this.drawCalendarGantt.calcX2Column(x);

            if (this.drawCalendarGantt.selectedBreak) {
              this.drawCalendarGantt.selectedBreak.from = addDays(
                this.drawCalendarGantt.startDate,
                leftDiffDay
              );

              if (
                equalDate(
                  this.drawCalendarGantt.selectedBreak.from!,
                  this.drawCalendarGantt.selectedBreak.until!
                ) > 0
              ) {
                this.drawCalendarGantt.selectedBreak.until =
                  this.drawCalendarGantt.selectedBreak.from!;
              }

            }
            break;
          }

          case SelectedArea.RightAnchor: {
            const rightDiffDay = this.drawCalendarGantt.calcX2Column(x);

            if (this.drawCalendarGantt.selectedBreak) {
              this.drawCalendarGantt.selectedBreak.until = addDays(
                this.drawCalendarGantt.startDate,
                rightDiffDay
              );

              if (
                equalDate(
                  this.drawCalendarGantt.selectedBreak.until!,
                  this.drawCalendarGantt.selectedBreak.from!
                ) < 0
              ) {
                this.drawCalendarGantt.selectedBreak.from =
                  this.drawCalendarGantt.selectedBreak.until!;
              }
            }
            break;
          }

          case SelectedArea.AbsenceBar:
            if (
              this.originalBreakPosition &&
              this.dragStartMouseX !== undefined &&
              this.drawCalendarGantt.selectedBreak
            ) {
              const pixelDelta = x - this.dragStartMouseX;
              const columnDelta = this.coord.pixelDeltaToColumnDelta(pixelDelta);

              const newStartColumn =
                this.originalBreakPosition.startColumn + columnDelta;
              const newEndColumn =
                this.originalBreakPosition.endColumn + columnDelta;

              this.drawCalendarGantt.selectedBreak.from = addDays(
                this.drawCalendarGantt.startDate,
                newStartColumn
              );
              this.drawCalendarGantt.selectedBreak.until = addDays(
                this.drawCalendarGantt.startDate,
                newEndColumn
              );
            }
            break;
        }

        this.redrawSelectedRow();
      }
    }
  }

  isMouseOverSelectedBreak(event: MouseEvent): boolean {
    let isSelected = false;

    this.existActiveSelection(event);
    if (this.selectedArea === SelectedArea.AbsenceBar) {
      isSelected = true;
    }

    return isSelected;
  }

  existActiveSelection(event: MouseEvent): void {
    if (this.drawCalendarGantt.selectedBreak?.entrySource === EntrySource.Schedule) {
      this.selectedArea = SelectedArea.None;
      return;
    }

    const x = event.offsetX;
    const y = event.offsetY;

    if (
      this.drawCalendarGantt.selectedBreakRec &&
      this.drawCalendarGantt.selectedBreakRec!.pointInRect(x, y)
    ) {
      this.selectedArea = SelectedArea.AbsenceBar;
      return;
    }
    if (
      this.drawCalendarGantt.selectedBreakRec &&
      !this.drawCalendarGantt.selectedBreakRec.isEmpty()
    ) {
      const left = this.drawCalendarGantt.calcLeftAnchorRectangle(
        this.drawCalendarGantt.selectedBreakRec!
      );
      if (left.pointInRect(x, y)) {
        this.selectedArea = SelectedArea.LeftAnchor;
        return;
      }

      const right = this.drawCalendarGantt.calcRightAnchorRectangle(
        this.drawCalendarGantt.selectedBreakRec!
      );
      if (right.pointInRect(x, y)) {
        this.selectedArea = SelectedArea.RightAnchor;
        return;
      }
    }
    this.selectedArea = SelectedArea.None;
  }

  createBreakSelection(selectedRow: number, x: number): void {
    const _width = this.calendarSetting.cellWidth;

    if (x >= 0) {
      const tmpCol = this.coord.mouseToColumn(x);

      const date = new Date(this.drawCalendarGantt.startDate);
      date.setDate(date.getDate() + tmpCol);

      if (tmpCol === this.drawCalendarGantt.selectedBreakIndex) {
        return;
      }

      this.drawCalendarGantt.selectedBreakIndex = -1;
      this.selectedArea = SelectedArea.None;

      const allBreaks = this.dataManagementBreak.readData(selectedRow);

      let index = 0;
      if (allBreaks) {
        allBreaks.forEach((abs) => {
          const diff = Math.floor(
            daysBetweenDates(abs.from as Date, abs.until as Date)
          );
          const col1 = Math.floor(
            daysBetweenDates(this.drawCalendarGantt.startDate, abs.from as Date)
          );
          const col2 = col1 + diff;

          if (tmpCol >= col1 && tmpCol <= col2) {
            this.drawCalendarGantt.selectedBreakIndex = index;
            this.selectedArea = SelectedArea.AbsenceBar;
            return;
          }

          index++;
        });
      }
    }
  }

  redrawSelectedRow(): void {
    if (this.drawCalendarGantt.selectedRow >= 0) {
      this.drawCalendarGantt.drawRowIntern(this.drawCalendarGantt.selectedRow);

      this.drawCalendarGantt.drawSelectionRow();
      this.drawCalendarGantt.drawSelectedBreak();
    }
  }

  async updateSelectedBreakIfNecessary(): Promise<void> {
    const isDirty = this.drawCalendarGantt.isSelectedBreak_Dirty;

    if (isDirty) {
      await this.dataManagementBreak.updateBreak(
        this.drawCalendarGantt.selectedRow,
        this.drawCalendarGantt.selectedBreak!
      );
    }
  }

  dragOver(event: DragEvent): void {
    event.stopPropagation();
    event.preventDefault();

    if (event.dataTransfer) {
      const position = this.calcDroppedCell(event.offsetX, event.offsetY);
      if (this.drawCalendarGantt.dragRow !== position[1]) {
        this.drawCalendarGantt.unDrawDragRow();
        this.drawCalendarGantt.dragRow = position[1];
        this.drawCalendarGantt.drawDragRow();
        this.drawCalendarGantt.unDrawSelectionRow();
        this.drawCalendarGantt.drawSelectionRow();
      }
    }
  }

  drop(event: DragEvent): void {
    event.stopPropagation();
    event.preventDefault();
    if (event.dataTransfer) {
      const absenceId = event.dataTransfer.getData('text/plain');
      const position = this.calcDroppedCell(event.offsetX, event.offsetY);

      this.drawCalendarGantt.unDrawDragRow();
      this.drawCalendarGantt.selectedRow = position[1];

      this.addBreak(position, absenceId);
    }
  }

  private calcDroppedCell(offsetX: number, offsetY: number): number[] {
    if (this.drawCalendarGantt.isCanvasAvailable()) {
      const deltaX = this.coord.mouseToColumn(offsetX);
      let deltaY =
        Math.ceil(
          (offsetY - this.calendarSetting.cellHeaderHeight) /
            this.calendarSetting.cellHeight
        ) - 1;

      deltaY += this.scroll.verticalScrollPosition;

      return [deltaX, deltaY];
    }
    return [-1, -1];
  }

  private addBreak(position: number[], absenceId: string): void {
    const client = this.dataManagementBreak.clients[position[1]];
    const absence = this.dataManagementAbsence
      .absenceList()
      .find((x) => x.id === absenceId);
    const newBreak = new BreakPlaceholder();
    newBreak.clientId = client.id!;
    delete newBreak.client;
    delete newBreak.absence;
    delete newBreak.id;

    newBreak.absenceId = absenceId!;
    newBreak.from = addDays(this.drawCalendarGantt.startDate, position[0]);
    newBreak.until = addDays(
      newBreak.from,
      absence!.defaultLength! > 1 ? absence!.defaultLength - 1 : 0
    );
    const validationPassed = this.dataManagementBreak.addBreak(
      position[1],
      newBreak
    );
    if (validationPassed !== false) {
      this.drawCalendarGantt.selectedRow = position[1];
      this.drawCalendarGantt.selectedBreakIndex =
        this.dataManagementBreak.indexOfBreak(newBreak);
    } else {
      this.drawCalendarGantt.drawRowIntern(position[1]);
    }
  }
}

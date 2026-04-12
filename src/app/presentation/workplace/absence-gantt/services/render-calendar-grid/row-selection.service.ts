// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GanttCanvasManagerService } from '../gantt-canvas-manager.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { ScrollService } from '../../../../shared/scrollbar/scroll.service';
import { CalendarSettingService } from '../calendar-setting.service';
import { IBreakPlaceholder, BreakPlaceholder } from 'src/app/domain/models/break/break-class';
import { DataManagementAbsenceGanttService } from 'src/app/domain/services/absence/data-management-absence-gantt.service';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';
import { EntrySource } from 'src/app/domain/enums/entry-source.enum';
import { CalendarCalculationService } from './calendar-calculation.service';
import { BreakRenderingService } from './break-rendering.service';
import { GanttCoordinateService } from '../gantt-coordinate.service';

@Injectable()
export class RowSelectionService {
  private ganttCanvasManager = inject(GanttCanvasManagerService);
  private gridColors = inject(GridColorService);
  private dataManagementBreak = inject(DataManagementBreakPlaceholderService);
  private dataManagementAbsence = inject(DataManagementAbsenceGanttService);
  private scroll = inject(ScrollService);
  private calendarSetting = inject(CalendarSettingService);
  private calculationService = inject(CalendarCalculationService);
  private breakRenderingService = inject(BreakRenderingService);
  private coord = inject(GanttCoordinateService);

  private _selectedRow = -1;
  private _selectedBreakIndex = -1;

  public selectedBreakRec: Rectangle | undefined;
  public selectedBreak_dummy: IBreakPlaceholder | undefined;

  public get selectedBreak(): IBreakPlaceholder | undefined {
    if (
      this.selectedRow > -1 &&
      this.selectedRow < this.dataManagementBreak.rows
    ) {
      const data = this.dataManagementBreak.readData(this.selectedRow);
      if (!data || this._selectedBreakIndex < 0 || this._selectedBreakIndex >= data.length) {
        return undefined;
      }
      return data[this._selectedBreakIndex];
    }
    return undefined;
  }

  public set selectedRow(value: number) {
    if (value === this._selectedRow) {
      return;
    }

    this._selectedBreakIndex = -1;
    this._selectedRow = -1;
    this.selectedBreak_dummy = undefined;

    if (value < 0) {
      this._selectedRow = 0;
    } else if (value > this.dataManagementBreak.rows) {
      this._selectedRow = this.dataManagementBreak.rows;
    } else {
      this._selectedRow = value;
    }
  }

  public get selectedRow(): number {
    return this._selectedRow;
  }

  public set selectedBreakIndex(value: number) {
    if (value === this._selectedBreakIndex) {
      return;
    }
    this._selectedBreakIndex = value;
    this.captureSelectedBreakDummy();
  }

  public refreshSelectedBreakDummy(): void {
    this.captureSelectedBreakDummy();
  }

  private captureSelectedBreakDummy(): void {
    this.selectedBreak_dummy = undefined;
    if (
      this._selectedRow < 0 ||
      this._selectedRow >= this.dataManagementBreak.rows
    ) {
      return;
    }
    const data = this.dataManagementBreak.readData(this._selectedRow);
    if (
      !data ||
      this._selectedBreakIndex < 0 ||
      this._selectedBreakIndex >= data.length
    ) {
      return;
    }
    const br = data[this._selectedBreakIndex];
    if (br) {
      this.selectedBreak_dummy = cloneObject<BreakPlaceholder>(
        br as BreakPlaceholder
      );
    }
  }

  public get selectedBreakIndex() {
    return this._selectedBreakIndex;
  }

  public drawSelectionRow(): void {
    if (
      this.selectedRow !== -1 &&
      this.selectedRow < this.dataManagementBreak.rows
    ) {
      this.ganttCanvasManager.ctx!.save();

      const dy = this.selectedRow - this.scroll.verticalScrollPosition;
      const height = this.calendarSetting.cellHeight;
      const top =
        Math.floor(dy * height) + this.calendarSetting.cellHeaderHeight;

      const calculatedWidth =
        (this.calculationService.lastVisibleColumn() - this.calculationService.firstVisibleColumn()) *
        this.calendarSetting.cellWidth;

      const width =
        calculatedWidth > 0 ? calculatedWidth : this.ganttCanvasManager.width;

      this.ganttCanvasManager.ctx!.beginPath();
      this.ganttCanvasManager.ctx!.rect(
        0,
        this.calendarSetting.cellHeaderHeight,
        this.ganttCanvasManager.width,
        this.ganttCanvasManager.height - this.calendarSetting.cellHeaderHeight
      );
      this.ganttCanvasManager.ctx!.clip();

      this.ganttCanvasManager.ctx!.globalAlpha = 0.2;
      this.ganttCanvasManager.ctx!.fillStyle = this.gridColors.focusBorderColor;
      this.ganttCanvasManager.ctx!.fillRect(0, top, width, height);

      this.drawSelectedBreak();
      this.ganttCanvasManager.ctx!.restore();
    }
  }

  public drawSelectedBreak(): void {
    if (this.selectedBreakIndex !== -1 && this.isSelectedRowVisible()) {
      this.drawBreaksIntern();
    }
  }

  public isSelectedRowVisible(): boolean {
    if (
      this.selectedRow >= this.calculationService.firstVisibleRow &&
      this.selectedRow < this.calculationService.firstVisibleRow + this.calculationService.visibleRow() &&
      this.selectedRow < this.dataManagementBreak.rows
    ) {
      return true;
    }

    return false;
  }

  public drawBreaksIntern(): void {
    if (
      this.selectedRow > -1 &&
      this.selectedRow < this.dataManagementBreak.rows
    ) {
      const data = this.dataManagementBreak.readData(this.selectedRow);
      if (!data || this.selectedBreakIndex < 0 || this.selectedBreakIndex >= data.length) {
        return;
      }
      const dy =
        this.calendarSetting.cellHeaderHeight +
        (this.selectedRow - this.scroll.verticalScrollPosition) *
          this.calendarSetting.cellHeight;
      const dx = this.coord.scrollDx;
      const tmpBreak = data[this.selectedBreakIndex];

      if (tmpBreak) {
        const tmpRec = this.calculationService.calcDateRectangle(
          tmpBreak.from as Date,
          tmpBreak.until as Date
        );
        const rec = tmpRec.translate(dx, dy);
        this.selectedBreakRec = rec.setBounds(
          rec.left - 1,
          rec.top - 1,
          rec.right + 1,
          rec.bottom + 1
        );
        const abs = this.dataManagementAbsence
          .absenceList()
          .find((as) => as.id === tmpBreak.absenceId);
        if (abs) {
          this.breakRenderingService.drawBreakIntern(rec, abs.color!, tmpBreak.entrySource);
          this.breakRenderingService.drawBreakSelectBorderIntern(this.selectedBreakRec);
          if (tmpBreak.entrySource !== EntrySource.Schedule) {
            this.breakRenderingService.drawBreakSelectBorderInternAnchor(this.selectedBreakRec);
          }
        }
      }
    }
  }

  public checkSelectedRowVisibility(): void {
    if (this.selectedRow > this.dataManagementBreak.rows) {
      this.selectedRow = -1;
    }
  }

  public isSelectedBreak_Dirty(): boolean {
    if (this._selectedRow < 0 || this._selectedRow >= this.dataManagementBreak.rows) {
      return false;
    }
    const data = this.dataManagementBreak.readData(this._selectedRow);
    if (!data || this._selectedBreakIndex < 0 || this._selectedBreakIndex >= data.length) {
      return false;
    }
    const currentBreak = data[this._selectedBreakIndex] as BreakPlaceholder;
    if (!currentBreak && !this.selectedBreak_dummy) {
      return false;
    }
    if (!currentBreak || !this.selectedBreak_dummy) {
      return true;
    }
    return !compareComplexObjects(currentBreak, this.selectedBreak_dummy);
  }
}

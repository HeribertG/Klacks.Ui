// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { ScrollService } from '../../../shared/scrollbar/scroll.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { CalendarSettingService } from './calendar-setting.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { SharedRowHeaderCanvasManagerService } from 'src/app/presentation/shared/grid/row-header/row-header-canvas-manager.service';
import { CanvasAvailable } from 'src/app/domain/services/canvasAvailable.decorator';
import { SharedRenderRowHeaderCellService } from 'src/app/presentation/shared/grid/row-header/render-row-header-cell.service';
import { SharedRenderRowHeaderService } from 'src/app/presentation/shared/grid/row-header/render-row-header.service';
import { DrawImageHelper } from 'src/app/presentation/helpers/draw-image-helper';
import { IProgressLoader } from 'src/app/presentation/shared/grid/services/progress-bar-animation.service';

@Injectable()
export class DrawRowHeaderService {
  scroll = inject(ScrollService);
  gridColorService = inject(GridColorService);
  gridFontsService = inject(GridFontsService);
  calendarSetting = inject(CalendarSettingService);
  dataManagementBreak = inject(DataManagementBreakPlaceholderService);
  rowHeaderCanvasManager = inject(SharedRowHeaderCanvasManagerService);
  private drawRowHeaderCell = inject(SharedRenderRowHeaderCellService);
  private renderRowHeaderService = inject(SharedRenderRowHeaderService);

  public readonly iconSize = 24;

  public isBusy = false;
  public isShift = false;
  public isCtrl = false;

  private _selectedRow = -1;

  public set filterImage(image: HTMLImageElement | HTMLCanvasElement | undefined) {
    this.renderRowHeaderService.filterImage = image;
  }

  public get recFilterIcon(): Rectangle {
    return this.renderRowHeaderService.recFilterIcon;
  }

  @CanvasAvailable()
  public createRuler(): void {
    this.renderRowHeaderService.createRuler();
  }

  @CanvasAvailable()
  public renderRowHeader(): void {
    this.renderRowHeaderService.renderRowHeader();
  }

  @CanvasAvailable()
  public drawCalendar(): void {
    this.DrawHeader();
    this.DrawBody();
    this.drawSelectionRow();
  }

  @CanvasAvailable()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  moveRow(directionY: number): void {
    this.renderRowHeader();
    this.drawCalendar();
  }

  public deleteCanvas(): void {
    this.rowHeaderCanvasManager.deleteCanvas();
  }

  public createCanvas(): void {
    this.rowHeaderCanvasManager.createCanvas('absence-row-header-canvas');
  }

  public isCanvasAvailable(): boolean {
    return this.rowHeaderCanvasManager.isCanvasAvailable();
  }

  public set selectedRow(value: number) {
    if (value === this._selectedRow) {
      return;
    }

    this.unDrawSelectionRow();
    if (value < 0) {
      this._selectedRow = 0;
    } else if (value > this.dataManagementBreak.rows) {
      this._selectedRow = this.dataManagementBreak.rows;
    } else {
      this._selectedRow = value;
    }
    this.drawSelectionRow();
  }

  public get selectedRow(): number {
    return this._selectedRow;
  }

  public drawSelectionRow(): void {
    if (this.selectedRow > -1 && this.isSelectedRowVisible()) {
      this.rowHeaderCanvasManager.save();
      this.rowHeaderCanvasManager.setGlobalAlpha(0.2);
      this.rowHeaderCanvasManager.setFillStyle(
        this.gridColorService.focusBorderColor
      );
      const dy = this.selectedRow - this.scroll.verticalScrollPosition;
      const height = this.calendarSetting.cellHeight;
      const top =
        Math.floor(dy * height) + this.calendarSetting.cellHeaderHeight;

      this.rowHeaderCanvasManager.fillRect(
        0,
        top,
        this.rowHeaderCanvasManager.width,
        height
      );

      this.rowHeaderCanvasManager.restore();
    }
  }

  public set width(value: number) {
    this.rowHeaderCanvasManager.width = value;
    this.createRuler();
  }

  public get width(): number {
    return this.rowHeaderCanvasManager.width;
  }

  public set height(value: number) {
    this.rowHeaderCanvasManager.height = value;

    this.renderRowHeader();
  }

  public get height(): number {
    return this.rowHeaderCanvasManager.height;
  }

  @CanvasAvailable()
  public visibleRow(): number {
    return Math.ceil(this.height / this.calendarSetting.cellHeight);
  }

  public firstVisibleRow(): number {
    return this.scroll.verticalScrollPosition;
  }

  public lastVisibleRow(): number {
    return this.firstVisibleRow() + this.visibleRow();
  }

  public setProgressBarLoader(loader: IProgressLoader): void {
    this.renderRowHeaderService.setProgressBarLoader(loader);
  }

  public destroy(): void {
    this.renderRowHeaderService.destroy();
  }

  @CanvasAvailable()
  private unDrawSelectionRow(): void {
    if (this.selectedRow > -1 && this.isSelectedRowVisible()) {
      this.drawRowHeaderCell.drawImage(
        this.rowHeaderCanvasManager.renderCanvasCtx!,
        this.rowHeaderCanvasManager.renderCanvas!,
        0,
        this.calendarSetting.cellHeaderHeight
      );
    }
  }

  private isSelectedRowVisible(): boolean {
    return (
      this.selectedRow >= this.firstVisibleRow() &&
      this.selectedRow < this.firstVisibleRow() + this.visibleRow()
    );
  }

  private DrawHeader(): void {
    if (this.rowHeaderCanvasManager.headerCanvas) {
      DrawImageHelper.drawCanvasLogical(
        this.rowHeaderCanvasManager.ctx!,
        this.rowHeaderCanvasManager.headerCanvas,
        0,
        0
      );
    }
  }

  private DrawBody(): void {
    if (this.rowHeaderCanvasManager.renderCanvas) {
      DrawImageHelper.drawCanvasLogical(
        this.rowHeaderCanvasManager.ctx!,
        this.rowHeaderCanvasManager.renderCanvas,
        0,
        this.calendarSetting.cellHeaderHeight
      );
    }
  }
}

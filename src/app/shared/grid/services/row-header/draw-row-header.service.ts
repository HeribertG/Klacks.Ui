import { inject, Injectable } from '@angular/core';
import { Rectangle } from 'src/app/shared/grid/classes/geometry';
import { GridColorService } from 'src/app/shared/grid/services/grid-color.service';
import { GridSettingsService } from 'src/app/shared/grid/services/grid-settings.service';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { ScheduleScheduleRowHeaderComponent } from '../../../../workplace/schedule/schedule-schedule-row-header/schedule-schedule-row-header.component';
import { BaseCreateRowHeaderService } from './create-row-header.service';
import { BaseDataService } from '../data-setting/data.service';
import { BaseSettingsService } from '../data-setting/settings.service';
import { BaseCreateHeaderService } from '../body/create-header.service';
import { BaseCellManipulationService } from '../body/cell-manipulation.service';

@Injectable()
export class BaseDrawRowHeaderService {
  public cellManipulation = inject(BaseCellManipulationService);
  public gridData = inject(BaseDataService);
  public createRowHeader = inject(BaseCreateRowHeaderService);
  private gridColors = inject(GridColorService);
  private scroll = inject(ScrollService);
  private gridSettings = inject(GridSettingsService);
  private settings = inject(BaseSettingsService);
  private createHeader = inject(BaseCreateHeaderService);

  public ctx: CanvasRenderingContext2D | undefined;
  public canvas: HTMLCanvasElement | undefined;
  public headerCanvas: HTMLCanvasElement | undefined;
  public headerCtx: CanvasRenderingContext2D | undefined;
  public renderCanvasCtx: CanvasRenderingContext2D | undefined;
  public renderCanvas: HTMLCanvasElement | undefined;

  private lastSelection = -1;

  public rowHeader: ScheduleScheduleRowHeaderComponent | undefined;

  public recFilterIcon!: Rectangle;
  public filterImage: HTMLImageElement | undefined;
  public isFocused = true;
  public isBusy = false;

  public rows = 0;

  public pixelRatio = 1;

  public startDate: Date = new Date();

  private _height = 10;
  private _width = 10;

  /* #region initial/final */

  public createCanvas() {
    this.canvas = document.getElementById(
      'scheduleRowCanvas'
    ) as HTMLCanvasElement;
    this.ctx = DrawHelper.createHiDPICanvas(
      this.canvas,
      this.width,
      this.height,
      true
    );
    DrawHelper.setAntiAliasing(this.ctx);

    this.renderCanvas = document.createElement('canvas') as HTMLCanvasElement;
    this.renderCanvasCtx = DrawHelper.createHiDPICanvas(
      this.renderCanvas,
      this.width,
      this.height,
      true
    );
    DrawHelper.setAntiAliasing(this.renderCanvasCtx);

    this.headerCanvas = document.createElement('canvas') as HTMLCanvasElement;
    this.headerCtx = DrawHelper.createHiDPICanvas(
      this.headerCanvas,
      this.width,
      this.settings.cellHeaderHeight,
      true
    );
    DrawHelper.setAntiAliasing(this.renderCanvasCtx);

    this.headerCtx = DrawHelper.createHiDPICanvas(
      this.headerCanvas,
      this.width,
      this.settings.cellHeaderHeight,
      true
    );
    DrawHelper.setAntiAliasing(this.headerCtx);
  }

  public deleteCanvas() {
    this.renderCanvasCtx = undefined;
    this.renderCanvas = undefined;
    this.ctx = undefined;
    this.canvas = undefined;
    this.headerCanvas = undefined;
    this.headerCtx = undefined;
  }

  isCanvasAvailable(): boolean {
    if (!this.gridSettings) {
      return false;
    }
    if (!this.canvas) {
      return false;
    }
    if (!(this.height || this.width)) {
      return false;
    }
    return true;
  }

  /* #endregion initial/final */

  /* #region Environment changes */

  public rebuild() {
    this.createHeader.reset();
    this.createRowHeader.reset();
  }

  public redraw() {
    this.redrawGrid();
  }
  public refresh() {
    this.refreshGrid();
  }

  private setMetrics() {
    if (this.isCanvasAvailable()) {
      // const visibleRows: number = this.visibleRow() - 1;
      // const visibleCols: number = this.UpdateVisibleCol() - 1;
    }
  }

  /* #endregion Environment changes */

  /* #region draw Grid */

  private redrawGrid() {
    if (this.isCanvasAvailable()) {
      this.crateGridHeader();
      this.drawGrid();
      this.renderGrid();
    }
  }

  /* #endregion draw Grid */

  /* #region Environment changes */

  public set width(value: number) {
    this._width = value;
    this.setMetrics();
    this.resizeMainCanvas();
    this.resizeRenderCanvas();
  }
  public get width(): number {
    return this._width;
  }

  public set height(value: number) {
    this._height = value;
    this.setMetrics();
    this.resizeMainCanvas();
    this.resizeRenderCanvas();
  }
  public get height(): number {
    return this._height;
  }

  private resizeMainCanvas() {
    if (this.isCanvasAvailable()) {
      this.canvas!.style.width = `${this.width}px`;
      this.canvas!.style.height = `${this.height}px`;
      this.ctx!.canvas.height = this.height;
      this.ctx!.canvas!.width = this.width;
    }
  }

  private resizeRenderCanvas() {
    if (this.isCanvasAvailable()) {
      this.renderCanvas!.style.width = `${this.width}px`;
      this.renderCanvas!.style.height = `${this.height}px`;
      this.renderCanvasCtx!.canvas.height = this.height;
      this.renderCanvasCtx!.canvas!.width = this.width;
    }
  }

  /* #endregion Environment changes */

  refreshGrid(): void {
    if (this.isCanvasAvailable()) {
      const visibleRow: number = this.visibleRow();

      const height = visibleRow * this.settings.cellHeight;

      if (
        this.renderCanvas!.width <= this.width ||
        this.renderCanvas!.height <= height
      ) {
        this.crateGridHeader();
        this.drawGrid();
        this.renderGrid();
      } else {
        this.renderGrid();
      }
    }

    this.drawSelection();
  }

  crateGridHeader(): void {
    if (this.isCanvasAvailable()) {
      const width = Math.floor(this.width);

      this.createHeader.createRowHeaderHeader(
        this.headerCtx!,
        Math.floor(width)
      );
    }
  }

  drawGrid() {
    if (this.isCanvasAvailable()) {
      const width = Math.floor(this.width);
      const visibleRow: number = this.visibleRow();
      const height = Math.floor(this.canvas!.clientHeight);

      this.renderCanvas!.width = width;
      this.renderCanvas!.height = height;

      this.renderCanvasCtx = this.renderCanvas!.getContext('2d', {
        willReadFrequently: true,
      })!;
      DrawHelper.setAntiAliasing(this.renderCanvasCtx);

      this.renderCanvasCtx!.clearRect(
        0,
        0,
        this.renderCanvas!.width,
        this.renderCanvas!.height
      );

      for (let row = 0; row < visibleRow; row++) {
        let tmpRow: number = row + this.firstVisibleRow;

        if (tmpRow < 0) {
          tmpRow = 0;
        }
        const correctedRow = this.addCells(tmpRow, row);
        if (!correctedRow) {
          break;
        }

        row = correctedRow - this.firstVisibleRow;
      }
    }
  }

  private renderGrid(): void {
    if (!this.isCanvasAvailable()) return;

    const srcW = this.renderCanvas!.width;
    const srcH = this.renderCanvas!.height;
    const destX = 0;
    const destY = this.headerCanvas!.height;
    const destW = srcW;
    const destH = srcH;

    this.ctx!.drawImage(
      this.renderCanvas!,
      0,
      0,
      srcW,
      srcH,
      destX,
      destY,
      destW,
      destH
    );

    this.ctx!.drawImage(
      this.headerCanvas!,
      0,
      0,
      this.headerCanvas!.width,
      this.headerCanvas!.height
    );
  }

  private addCells(row: number, position: number): number | undefined {
    if (this.isCanvasAvailable() && this.existData) {
      if (row < this.gridData.rows) {
        const result = this.createRowHeader.createCell(row, this.width);
        if (result) {
          const diffRow: number = position + (result.firstRow - row);

          this.renderCanvasCtx!.drawImage(
            result.img,
            0,
            diffRow * this.settings.cellHeight * this.settings.zoom // Zoom berücksichtigen!
          );

          return result.lastRow;
        }
      }
    }
    return undefined;
  }

  drawRowHeaderSelection(redraw = false) {
    this.lastSelection;
    if (this.cellManipulation.Position === undefined) {
      return;
    }
    const width = Math.floor(this.canvas!.clientWidth);
    const tmpPos = this.cellManipulation.Position;
    const index: number = this.gridData.rowEmployeeIndex[tmpPos.row];
    const firstRow: number = this.gridData.indexEmployeeRow[index];
    let neededRows: number = this.gridData.getIndex(index).neededRows;
    if (redraw && firstRow === this.lastSelection) {
      return;
    }
    this.refreshGrid();
    this.lastSelection = firstRow;
    this.ctx!.save();
    let correction = 0;
    let top: number =
      this.settings.cellHeaderHeight +
      (this.firstVisibleRow * -1 + firstRow) * this.settings.cellHeight;
    if (top < this.settings.cellHeaderHeight) {
      correction = firstRow - this.firstVisibleRow;
      neededRows += correction;
      top = this.settings.cellHeaderHeight;
    }
    const height: number = this.settings.cellHeight * neededRows;
    if (height < this.settings.cellHeaderHeight) {
      return;
    }

    this.ctx!.globalAlpha = 0.2;
    this.ctx!.fillStyle = this.gridColors.focusBorderColor;
    this.ctx!.fillRect(0, top, width, height + correction);
    this.ctx!.restore();
  }

  moveGrid(): void {
    if (!this.isCanvasAvailable()) {
      return;
    }
    const dy = this.scroll.verticalScrollPosition;
    const visibleRow: number = this.visibleRow();
    const tempCanvas: HTMLCanvasElement = document.createElement(
      'canvas'
    ) as HTMLCanvasElement;
    tempCanvas.height = this.renderCanvas!.height;
    tempCanvas.width = this.renderCanvas!.width;
    const ctx = tempCanvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(this.renderCanvas!, 0, 0);
    }

    this.renderCanvas!.height = visibleRow * this.settings.cellHeight;
    this.renderCanvasCtx!.clearRect(
      0,
      0,
      this.renderCanvas!.width,
      this.renderCanvas!.height
    );

    this.renderCanvasCtx!.drawImage(
      tempCanvas,
      0,
      this.settings.cellHeight * dy
    );

    // let firstRow = 0;
    // let lastRow = 0;

    // if (directionY > 0) {
    //   firstRow = visibleRow + directionY - 1;
    //   lastRow = visibleRow - directionY + 1;
    // } else {
    //   firstRow = -1;
    //   lastRow = directionY + 2;
    // }

    // for (let row = firstRow; row < lastRow; row++) {
    //   const tmpRow: number = row + this.firstVisibleRow;
    //   const correctedRow = this.addCells(tmpRow, row);
    //   if (correctedRow === undefined) {
    //     continue;
    //   }
    //   row = correctedRow - this.firstVisibleRow;
    // }

    this.refreshGrid();
  }

  /* #endregion draw Row Header */

  /* #region position and selection */

  private drawRange(
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number
  ): void {
    if (this.isCanvasAvailable()) {
      let col: number =
        (minCol - this.firstVisibleCol) * this.settings.cellWidth;
      let row: number =
        (minRow - this.firstVisibleRow) * this.settings.cellHeight +
        this.settings.cellHeaderHeight;
      if (col < 0) {
        col = 0;
      }
      if (row < this.settings.cellHeaderHeight) {
        row = this.settings.cellHeaderHeight;
      }

      let lastCol: number =
        (maxCol - this.firstVisibleCol) * this.settings.cellWidth;
      let lastRow: number =
        (maxRow - this.firstVisibleRow) * this.settings.cellHeight +
        this.settings.cellHeaderHeight;

      if (lastCol > this.canvas!.width) {
        lastCol = this.canvas!.width;
      }
      if (lastRow > this.canvas!.height) {
        lastRow = this.canvas!.height;
      }

      const width = lastCol - col;
      const height = lastRow - row;

      this.ctx!.fillRect(col, row, width, height);
    }
  }

  drawSelection() {
    if (this.isCanvasAvailable()) {
      this.ctx!.save();

      this.ctx!.rect(
        0,
        this.settings.cellHeaderHeight,
        this.canvas!.width,
        this.renderCanvas!.height - this.settings.cellHeaderHeight
      );

      this.ctx!.clip();

      this.ctx!.globalAlpha = 0.2;
      this.ctx!.fillStyle = this.gridColors.focusBorderColor;

      for (
        let i = 0;
        i < this.cellManipulation.PositionCollection.count();
        i++
      ) {
        // const pos = this.cellManipulation.PositionCollection.item(i);
        // this.drawSelectedCellBackground(pos.column, pos.row);
      }

      this.ctx!.restore();
    }
  }

  /* #endregion position and selection */

  private get existData(): boolean {
    if (!this.gridData) {
      return false;
    }

    if (!this.gridData.dataManagementSchedule) {
      return false;
    }

    if (
      !this.gridData.dataManagementSchedule.clients ||
      this.gridData.dataManagementSchedule.clients.length === 0
    ) {
      return false;
    }

    if (!this.gridData.rows || this.gridData.rows === 0) {
      return false;
    }

    return true;
  }

  private get firstVisibleRow(): number {
    return this.scroll.verticalScrollPosition;
  }
  private set firstVisibleRow(value: number) {
    this.scroll.verticalScrollPosition = value;
  }

  private get firstVisibleCol(): number {
    return this.scroll.horizontalScrollPosition;
  }

  private set firstVisibleCol(value: number) {
    this.scroll.horizontalScrollPosition = value;
  }
  private visibleRow(): number {
    return Math.ceil(this.height / this.settings.cellHeight);
  }

  private UpdateVisibleCol(): number {
    return Math.ceil(this.width / this.settings.cellWidth);
  }
}

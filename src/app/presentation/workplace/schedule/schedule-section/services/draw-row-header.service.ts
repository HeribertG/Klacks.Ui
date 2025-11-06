import { inject, Injectable } from '@angular/core';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridSettingsService } from 'src/app/presentation/shared/grid/services/grid-settings.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { ScheduleScheduleRowHeaderComponent } from '../schedule-schedule-row-header/schedule-schedule-row-header.component';
import { BaseCreateRowHeaderService } from './create-row-header.service';
import { BaseDataService } from '../../../../shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from '../../../../shared/grid/services/data-setting/settings.service';
import { BaseCreateHeaderService } from '../../../../shared/grid/services/body/create-header.service';
import { BaseCellManipulationService } from '../../../../shared/grid/services/body/cell-manipulation.service';

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
  private lastVerticalScrollPosition = 0;

  public rowHeader: ScheduleScheduleRowHeaderComponent | undefined;

  public recFilterIcon!: Rectangle;
  public filterImage: HTMLImageElement | undefined;
  public isFocused = true;
  public isBusy = false;

  public rows = 0;

  public pixelRatio = DrawHelper.pixelRatio();

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
    this.createRowHeader.reset();
  }

  public redraw() {
    this.redrawGrid();
    this.drawRowHeaderSelection();
  }
  public refresh() {
    this.refreshGrid();
    this.drawRowHeaderSelection();
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
    this.resizeMainCanvas();
    this.resizeRenderCanvas();
    this.resizeHeaderCanvas();
  }
  public get width(): number {
    return this._width;
  }

  public set height(value: number) {
    this._height = value;
    this.resizeMainCanvas();
    this.resizeRenderCanvas();
  }
  public get height(): number {
    return this._height;
  }

  private resizeMainCanvas() {
    if (this.isCanvasAvailable()) {
      this.ctx = DrawHelper.createHiDPICanvas(
        this.canvas!,
        this.width,
        this.height,
        true
      );
      DrawHelper.setAntiAliasing(this.ctx);
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

  private resizeHeaderCanvas() {
    if (this.isCanvasAvailable() && this.headerCanvas) {
      this.headerCtx = DrawHelper.createHiDPICanvas(
        this.headerCanvas,
        this.width,
        this.settings.cellHeaderHeight,
        true
      );
      DrawHelper.setAntiAliasing(this.headerCtx);
      this.crateGridHeader();
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

    this.drawRowHeaderSelection();
  }

  crateGridHeader(): void {
    if (this.isCanvasAvailable()) {
      const width = Math.floor(this.width);

      this.createRowHeader.createRowHeaderHeader(
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

      this.renderCanvasCtx = DrawHelper.createHiDPICanvas(
        this.renderCanvas!,
        width,
        height,
        true
      );
      DrawHelper.setAntiAliasing(this.renderCanvasCtx);

      this.renderCanvasCtx!.clearRect(0, 0, width, height);

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

  private drawEmptySpace(): void {
    if (!this.renderCanvasCtx || !this.renderCanvas) return;

    const pixelRatio = DrawHelper.pixelRatio();
    const canvasLogicalHeight = this.renderCanvas.height / pixelRatio;
    const visibleRow = canvasLogicalHeight / this.settings.cellHeight;

    const diff = this.gridData.rows - this.firstVisibleRow;

    let mustClearEmptySpace = false;

    if (diff < visibleRow) {
      mustClearEmptySpace = true;
    }

    if (mustClearEmptySpace) {
      const startY = diff * this.settings.cellHeight;

      this.renderCanvasCtx.save();

      this.renderCanvasCtx.fillStyle = this.gridColors.backGroundContainerColor;
      this.renderCanvasCtx.fillRect(
        0,
        startY,
        this.renderCanvas.width,
        this.renderCanvas.height - startY
      );

      this.renderCanvasCtx.restore();
    }
  }

  private renderGrid(): void {
    if (!this.isCanvasAvailable()) return;

    const pixelRatio = DrawHelper.pixelRatio();
    const srcW = this.renderCanvas!.width;
    const srcH = this.renderCanvas!.height;
    const destX = 0;
    const destY = this.settings.cellHeaderHeight;

    this.ctx!.drawImage(
      this.renderCanvas!,
      0,
      0,
      srcW,
      srcH,
      destX,
      destY,
      srcW / pixelRatio,
      srcH / pixelRatio
    );

    this.ctx!.drawImage(
      this.headerCanvas!,
      0,
      0,
      this.headerCanvas!.width,
      this.headerCanvas!.height,
      0,
      0,
      this.width,
      this.settings.cellHeaderHeight
    );
  }

  private addCells(row: number, position: number): number | undefined {
    if (this.isCanvasAvailable() && this.existData) {
      if (row < this.gridData.rows) {
        const result = this.createRowHeader.createCell(row, this.width);
        if (result) {
          const diffRow: number = position + (result.firstRow - row);

          const logicalWidth = this.width;

          const clientIndex = this.gridData.rowGroupIndex[row];
          const groupIndex = this.gridData.getGroupIndex(clientIndex);
          if (!groupIndex) {
            return undefined;
          }
          const neededRows: number = groupIndex.neededRows;
          const groupLineHeight: number =
            this.settings.getGroupLineHeight(neededRows);

          const yPosition = diffRow * this.settings.cellHeight;

          this.renderCanvasCtx!.drawImage(
            result.img,
            0,
            0,
            result.img.width,
            result.img.height,
            0,
            yPosition,
            logicalWidth,
            groupLineHeight
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

    // Add bounds checking
    if (tmpPos.row >= this.gridData.rows || tmpPos.row < 0) {
      return;
    }

    const index: number = this.gridData.rowGroupIndex[tmpPos.row];
    if (index === undefined || index < 0) {
      return;
    }

    const firstRow: number = this.gridData.indexGroupRow[index];
    const groupIndex = this.gridData.getGroupIndex(index);
    if (!groupIndex) {
      return;
    }

    let neededRows: number = groupIndex.neededRows;
    if (redraw && firstRow === this.lastSelection) {
      return;
    }
    this.renderGrid();
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

    // Calculate our own delta since Surface-Template resets it before we can use it
    const verticalPos = this.scroll.verticalScrollPosition;
    const verticalDiff = verticalPos - this.lastVerticalScrollPosition;
    this.lastVerticalScrollPosition = verticalPos;

    // If no delta change, just refresh normally
    if (verticalDiff === 0) {
      this.refreshGrid();
      return;
    }

    const visibleRow: number = this.visibleRow();

    // Create temp canvas with current content
    const tempCanvas: HTMLCanvasElement = document.createElement(
      'canvas'
    ) as HTMLCanvasElement;
    const tempCtx = DrawHelper.createHiDPICanvas(
      tempCanvas,
      this.width,
      this.height,
      true
    );

    if (tempCtx) {
      // Copy current render canvas content to temp canvas with correct scaling
      tempCtx.drawImage(
        this.renderCanvas!,
        0,
        0,
        this.renderCanvas!.width,
        this.renderCanvas!.height,
        0,
        0,
        this.width,
        this.height
      );
    }

    this.renderCanvasCtx!.clearRect(
      0,
      0,
      this.renderCanvas!.width,
      this.renderCanvas!.height
    );

    const scrollOffsetY = -this.settings.cellHeight * verticalDiff;

    // Draw shifted content back
    this.renderCanvasCtx!.drawImage(
      tempCanvas,
      0,
      0,
      tempCanvas.width,
      tempCanvas.height,
      0,
      scrollOffsetY,
      this.width,
      this.height
    );

    if (verticalDiff > 0) {
      // Scrolling down - add new rows at bottom
      for (let i = 0; i < verticalDiff; i++) {
        const row = visibleRow - verticalDiff + i;
        const tmpRow = row + this.firstVisibleRow;
        this.addCells(tmpRow, row);
      }
    } else if (verticalDiff < 0) {
      // Scrolling up - add new rows at top
      for (let i = 0; i < -verticalDiff; i++) {
        const row = i;
        const tmpRow = row + this.firstVisibleRow;
        this.addCells(tmpRow, row);
      }
    }

    this.drawEmptySpace();

    // Render the updated canvas to screen
    this.renderGrid();
    this.drawRowHeaderSelection();
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

  /* #endregion position and selection */

  private get existData(): boolean {
    if (!this.gridData) {
      return false;
    }

    if (!this.gridData.indexes) {
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
}

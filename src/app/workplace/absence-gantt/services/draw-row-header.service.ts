import { Injectable, NgZone } from '@angular/core';
import { ScrollService } from './scroll.service';
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { GridFontsService } from 'src/app/grid/services/grid-fonts.service';
import { CalendarSettingService } from './calendar-setting.service';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { Rectangle } from 'src/app/grid/classes/geometry';
import { Gradient3DBorderStyleEnum } from 'src/app/grid/enums/gradient-3d-border-style';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from 'src/app/grid/enums/cell-settings.enum';

@Injectable()
export class DrawRowHeaderService {
  public rowHeaderRenderCanvasCtx: CanvasRenderingContext2D | undefined;
  public rowHeaderRenderCanvas: HTMLCanvasElement | undefined;
  public rowHeaderCtx: CanvasRenderingContext2D | undefined;
  public rowHeaderCanvas: HTMLCanvasElement | undefined;

  public recFilterIcon!: Rectangle;
  public filterImage: HTMLImageElement | undefined;

  public readonly iconSize = 16;

  public isBusy = false;
  public isShift = false;
  public isCtrl = false;

  private _selectedRow = -1;

  private ctx: CanvasRenderingContext2D | undefined;
  private canvas: HTMLCanvasElement | undefined;

  private _height: number = 10;
  private _width: number = 10;

  constructor(
    public scroll: ScrollService,
    private zone: NgZone,
    public gridColorService: GridColorService,
    public gridFontsService: GridFontsService,
    public calendarSetting: CalendarSettingService,
    public dataManagementBreak: DataManagementBreakService,
    private gridColors: GridColorService,
    private gridFonts: GridFontsService
  ) {}

  private drawFilterIcon(ctx: CanvasRenderingContext2D) {
    const size = 16;
    const dy = this.rowHeaderCanvas!.height / 2 - this.iconSize / 2;
    const dx = this.rowHeaderCanvas!.width - (this.iconSize + 6);

    if (this.filterImage) {
      this.recFilterIcon = new Rectangle(
        dx,
        dy,
        dx + this.iconSize,
        dy + this.iconSize
      );
      DrawHelper.drawImage(ctx, this.filterImage, this.recFilterIcon, 0.5);
    }
    //ctx.fillStyle = '#A9A9A9';
  }

  /* #region   init */

  public createRuler(): void {
    if (!this.rowHeaderCanvas || !this.rowHeaderCtx) {
      throw new Error(
        "CanvasRenderingContext2D and Canvas are'nt initialized."
      );
    }
    this.rowHeaderCanvas.height = this.calendarSetting.cellHeaderHeight;

    this.rowHeaderCanvas.width = this.width;
    const rec = new Rectangle(0, 0, this.width, this.rowHeaderCanvas!.height);
    DrawHelper.fillRectangle(
      this.rowHeaderCtx!,
      this.gridColors.controlBackGroundColor,
      rec
    );
    // title
    DrawHelper.drawText(
      this.rowHeaderCtx!,
      `Name (` + this.dataManagementBreak.clients.length + ')',
      rec.left + 2,
      rec.top,
      rec.width - 2,
      rec.height,
      this.gridFonts.mainFontString,
      12,
      this.gridColors.foreGroundColor,
      TextAlignmentEnum.Left,
      BaselineAlignmentEnum.Center
    );

    DrawHelper.drawBorder(
      this.rowHeaderCtx,
      rec.left,
      rec.top,
      rec.width,
      rec.height,
      this.gridColors.controlBackGroundColor,
      2,
      Gradient3DBorderStyleEnum.Raised
    );

    this.drawFilterIcon(this.rowHeaderCtx);
  }

  /* #endregion   init */

  /* #region  render */

  public renderRowHeader(): void {
    if (!this.rowHeaderRenderCanvas || !this.rowHeaderRenderCanvasCtx) {
      return;
    }
    this.rowHeaderRenderCanvas.height = this.height;
    this.rowHeaderRenderCanvas.width = this.width;

    this.rowHeaderRenderCanvasCtx.clearRect(
      0,
      0,
      this.rowHeaderRenderCanvas.width,
      this.rowHeaderRenderCanvas.height
    );

    for (let i = 0; i < this.scroll.visibleRows + 1; i++) {
      this.drawName(i + this.scroll.verticalScrollPosition!, true);
    }
  }

  /* #endregion  render */

  /* #region   draw */

  drawCalendar() {
    //Title
    if (!DrawHelper.isCanvasReady(this.rowHeaderCanvas)) {
      return;
    }
    if (!DrawHelper.isCanvasReady(this.rowHeaderRenderCanvas)) {
      return;
    }

    this.ctx!.drawImage(this.rowHeaderCanvas!, 0, 0);
    this.ctx!.drawImage(
      this.rowHeaderRenderCanvas!,
      0,
      this.calendarSetting.cellHeaderHeight
    );

    this.drawSelectionRow();
  }
  moveRow(directionY: number): void {
    if (this.canvas && this.height) {
      const dirY = directionY;

      const visibleRow = Math.ceil(
        this.height / this.calendarSetting.cellHeight
      );

      this.zone.runOutsideAngular(() => {
        try {
          this.isBusy = true;

          // vertikale Verschiebung
          if (dirY !== 0) {
            // Nach Unten
            if (dirY > 0) {
              if (dirY < visibleRow / 2) {
                this.moveIt(dirY);

                return;
              } else {
                this.renderRowHeader();
                return;
              }
            }
            // Nach Oben
            if (dirY < 0) {
              if (dirY * -1 < visibleRow / 2) {
                this.moveIt(dirY);

                return;
              } else {
                this.renderRowHeader();
              }
            }
          }
        } finally {
          this.isBusy = false;
        }
      });

      this.drawCalendar();
    }
  }

  private moveIt(directionY: number): void {
    const visibleRow = this.scroll.visibleRows;

    if (directionY !== 0) {
      const diff = this.scroll.verticalScrollDelta;
      if (diff === 0) {
        return;
      }

      const tempCanvas: HTMLCanvasElement = document.createElement(
        'canvas'
      ) as HTMLCanvasElement;
      tempCanvas.height = this.height;
      tempCanvas.width = this.width;

      const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
      ctx!.drawImage(this.rowHeaderRenderCanvas!, 0, 0);

      this.rowHeaderRenderCanvasCtx!.clearRect(
        0,
        0,
        this.rowHeaderRenderCanvas!.width,
        this.rowHeaderRenderCanvas!.height
      );

      this.rowHeaderRenderCanvasCtx!.drawImage(
        tempCanvas,
        0,
        this.calendarSetting.cellHeight * diff
      );

      let firstRow = 0;
      let lastRow = 0;
      const directionDown = directionY > 0;

      if (directionY > 0) {
        firstRow = visibleRow + this.scroll.verticalScrollPosition;
        lastRow = firstRow + diff * -1 + 1;
      } else {
        firstRow = this.scroll.verticalScrollPosition;
        lastRow = firstRow + diff + 1;
      }

      for (let row = firstRow; row < lastRow; row++) {
        this.drawName(row, directionDown);
      }
    }

    this.drawCalendar();
  }

  public drawName(index: number, directionDown: boolean): void {
    if (!this.rowHeaderRenderCanvas || !this.rowHeaderRenderCanvasCtx) {
      return;
    }

    const dy = index - this.scroll.verticalScrollPosition;
    const height = this.calendarSetting.cellHeight;
    const top = Math.floor(dy * height);
    const rec = new Rectangle(
      0,
      top,
      this.rowHeaderRenderCanvas.width,
      top + height
    );

    if (index < this.dataManagementBreak.rows) {
      DrawHelper.fillRectangle(
        this.rowHeaderRenderCanvasCtx!,
        this.gridColors.controlBackGroundColor,
        rec
      );

      const diff = directionDown ? 0 : this.calendarSetting.borderWidth;
      const diff1 = !directionDown ? this.calendarSetting.borderWidth : 0;
      DrawHelper.drawBorder(
        this.rowHeaderRenderCanvasCtx,
        rec.left,
        rec.top,
        rec.width,
        rec.top + rec.height - diff - 1,
        this.gridColors.controlBackGroundColor,
        2,
        Gradient3DBorderStyleEnum.Raised
      );

      DrawHelper.drawText(
        this.rowHeaderRenderCanvasCtx,
        this.dataManagementBreak.readClientName(index),
        rec.left,
        rec.top,
        rec.width,
        rec.height - 2,
        this.gridFonts.mainFontString,
        +this.gridFonts.mainFontSize,
        this.gridColors.foreGroundColor,
        TextAlignmentEnum.Left,
        BaselineAlignmentEnum.Center
      );
    } else {
      DrawHelper.fillRectangle(
        this.rowHeaderRenderCanvasCtx!,
        this.gridColors.backGroundContainerColor,
        rec
      );
    }
  }

  public deleteCanvas() {
    this.ctx = undefined;
    this.canvas = undefined;
    this.rowHeaderRenderCanvasCtx = undefined;
    this.rowHeaderRenderCanvas = undefined;
    this.rowHeaderCtx = undefined;
    this.rowHeaderCanvas = undefined;
  }

  public createCanvas() {
    this.canvas = document.getElementById(
      'rowHeaderCanvas'
    ) as HTMLCanvasElement;
    this.ctx = DrawHelper.createHiDPICanvas(
      this.canvas,
      this.width,
      this.height
    );

    DrawHelper.setAntiAliasing(this.ctx);

    this.rowHeaderRenderCanvas = document.createElement(
      'canvas'
    ) as HTMLCanvasElement;
    this.rowHeaderRenderCanvasCtx = DrawHelper.createHiDPICanvas(
      this.rowHeaderRenderCanvas,
      this.width,
      this.calendarSetting.cellHeaderHeight,
      true
    );

    DrawHelper.setAntiAliasing(this.rowHeaderRenderCanvasCtx!);

    this.rowHeaderCanvas = document.createElement(
      'canvas'
    ) as HTMLCanvasElement;
    this.rowHeaderCtx = DrawHelper.createHiDPICanvas(
      this.rowHeaderCanvas,
      this.width,
      this.calendarSetting.cellHeaderHeight,
      true
    );
    DrawHelper.setAntiAliasing(this.rowHeaderCtx);
  }

  public isCanvasAvailable(): boolean {
    if (!this.calendarSetting) {
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

  /* #endregion   draw */

  /* #region   select */

  set selectedRow(value: number) {
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

  get selectedRow() {
    return this._selectedRow;
  }

  drawSelectionRow(): void {
    if (this.selectedRow > -1) {
      if (this.isSelectedRowVisible()) {
        this.ctx!.save();
        this.ctx!.globalAlpha = 0.2;
        this.ctx!.fillStyle = this.gridColorService.focusBorderColor;
        const dy = this.selectedRow - this.scroll.verticalScrollPosition;
        const height = this.calendarSetting.cellHeight;
        const top =
          Math.floor(dy * height) + this.calendarSetting.cellHeaderHeight;

        this.ctx!.fillRect(0, top, this.canvas!.width, height);

        this.ctx!.restore();
      }
    }
  }

  unDrawSelectionRow(): void {
    if (this.selectedRow > -1) {
      if (this.isSelectedRowVisible())
        this.ctx!.drawImage(
          this.rowHeaderRenderCanvas!,
          0,
          this.calendarSetting.cellHeaderHeight
        );
    }
  }

  private isSelectedRowVisible(): boolean {
    if (
      this.selectedRow >= this.firstVisibleRow() &&
      this.selectedRow < this.firstVisibleRow() + this.visibleRow()
    ) {
      return true;
    }
    return false;
  }

  /* #endregion   select */

  /* #region Environment changes */

  public set width(value: number) {
    this._width = value;
    this.setMetrics();
    this.resizeMainCanvas();

    this.createRuler();
  }
  public get width(): number {
    return this._width;
  }

  public set height(value: number) {
    this._height = value;
    this.setMetrics();
    this.resizeMainCanvas();
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

  /* #endregion Environment changes */

  /* #region   metrics */

  setMetrics(): void {
    const visibleRows: number =
      Math.floor(this.height / this.calendarSetting.cellHeight) - 1;
  }

  visibleRow(): number {
    if (!this.isCanvasAvailable()) {
      return 0;
    }

    return Math.ceil(this.height / this.calendarSetting.cellHeight);
  }

  firstVisibleRow(): number {
    return this.scroll.verticalScrollPosition;
  }

  lastVisibleRow(): number {
    return this.firstVisibleRow() + this.visibleRow();
  }

  /* #endregion   metrics */
}

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
import { RowHeaderCanvasManagerService } from './row-header-canvas.service';
import { CanvasAvailable } from 'src/app/services/canvasAvailable.decorator';
import { RenderRowHeaderCellService } from './render-row-header-cell.service';

@Injectable()
export class DrawRowHeaderService {
  public recFilterIcon!: Rectangle;
  public filterImage: HTMLImageElement | undefined;

  public readonly iconSize = 16;

  public isBusy = false;
  public isShift = false;
  public isCtrl = false;

  private _selectedRow = -1;

  constructor(
    public scroll: ScrollService,
    private zone: NgZone,
    public gridColorService: GridColorService,
    public gridFontsService: GridFontsService,
    public calendarSetting: CalendarSettingService,
    public dataManagementBreak: DataManagementBreakService,
    private gridColors: GridColorService,
    private gridFonts: GridFontsService,
    public rowHeaderCanvasManager: RowHeaderCanvasManagerService,
    private drawRowHeaderCell: RenderRowHeaderCellService
  ) {}

  @CanvasAvailable()
  private drawFilterIcon() {
    const dy =
      this.rowHeaderCanvasManager.headerCanvas!.height / 2 - this.iconSize / 2;
    const dx =
      this.rowHeaderCanvasManager.headerCanvas!.width - (this.iconSize + 6);

    this.recFilterIcon = new Rectangle(
      dx,
      dy,
      dx + this.iconSize,
      dy + this.iconSize
    );
    DrawHelper.drawImage(
      this.rowHeaderCanvasManager.headerCtx!,
      this.filterImage!,
      this.recFilterIcon,
      0.5
    );
  }

  @CanvasAvailable()
  public createRuler(): void {
    this.rowHeaderCanvasManager.headerCanvas!.height =
      this.calendarSetting.cellHeaderHeight;
    this.rowHeaderCanvasManager.headerCanvas!.width =
      this.rowHeaderCanvasManager.width;

    const rec = new Rectangle(
      0,
      0,
      this.rowHeaderCanvasManager.width,
      this.rowHeaderCanvasManager.headerCanvas!.height
    );

    this.drawRowHeaderCell.fillRectangle(
      this.rowHeaderCanvasManager.headerCtx!,
      this.gridColors.controlBackGroundColor,
      rec
    );

    this.drawRowHeaderCell.drawText(
      this.rowHeaderCanvasManager.headerCtx!,
      `Name (${this.dataManagementBreak.clients.length})`,
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

    this.drawRowHeaderCell.drawBorder(
      this.rowHeaderCanvasManager.headerCtx!,
      rec.left,
      rec.top,
      rec.width,
      rec.height,
      this.gridColors.controlBackGroundColor,
      2,
      Gradient3DBorderStyleEnum.Raised
    );

    this.drawFilterIcon();
  }

  @CanvasAvailable()
  public renderRowHeader(): void {
    this.rowHeaderCanvasManager.renderCanvas!.height =
      this.rowHeaderCanvasManager.height;
    this.rowHeaderCanvasManager.renderCanvas!.width =
      this.rowHeaderCanvasManager.width;

    this.drawRowHeaderCell.clearRect(
      this.rowHeaderCanvasManager.renderCanvasCtx!,
      0,
      0,
      this.rowHeaderCanvasManager.renderCanvas!.width,
      this.rowHeaderCanvasManager.renderCanvas!.height
    );

    for (let i = 0; i < this.scroll.visibleRows + 1; i++) {
      this.drawName(i + this.scroll.verticalScrollPosition!, true);
    }
  }

  @CanvasAvailable()
  public drawCalendar() {
    this.drawRowHeaderCell.drawImage(
      this.rowHeaderCanvasManager.ctx!,
      this.rowHeaderCanvasManager.headerCanvas!,
      0,
      0
    );
    this.drawRowHeaderCell.drawImage(
      this.rowHeaderCanvasManager.ctx!,
      this.rowHeaderCanvasManager.renderCanvas!,
      0,
      this.calendarSetting.cellHeaderHeight
    );

    this.drawSelectionRow();
  }

  @CanvasAvailable()
  moveRow(directionY: number): void {
    const dirY = directionY;

    const visibleRow = Math.ceil(
      this.rowHeaderCanvasManager.height / this.calendarSetting.cellHeight
    );

    this.zone.runOutsideAngular(() => {
      try {
        this.isBusy = true;

        if (dirY !== 0) {
          if (dirY > 0) {
            if (dirY < visibleRow / 2) {
              this.moveIt(dirY);
              return;
            } else {
              this.renderRowHeader();
              return;
            }
          }
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

  @CanvasAvailable()
  private moveIt(directionY: number): void {
    const visibleRow = this.scroll.visibleRows;

    if (directionY !== 0) {
      const diff = this.scroll.verticalScrollDelta;
      if (diff === 0) {
        return;
      }

      const tempCanvas: HTMLCanvasElement = document.createElement('canvas');
      tempCanvas.height = this.rowHeaderCanvasManager.height;
      tempCanvas.width = this.rowHeaderCanvasManager.width;

      const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx && this.rowHeaderCanvasManager.renderCanvas) {
        ctx.drawImage(this.rowHeaderCanvasManager.renderCanvas, 0, 0);
      }

      this.drawRowHeaderCell.clearRect(
        ctx!,
        0,
        0,
        this.rowHeaderCanvasManager.renderCanvas!.width,
        this.rowHeaderCanvasManager.renderCanvas!.height
      );

      this.drawRowHeaderCell.drawImage(
        ctx!,
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
  }

  @CanvasAvailable()
  private drawName(index: number, directionDown: boolean): void {
    const dy = index - this.scroll.verticalScrollPosition;
    const height = this.calendarSetting.cellHeight;
    const top = Math.floor(dy * height);
    const rec = new Rectangle(
      0,
      top,
      this.rowHeaderCanvasManager.renderCanvas!.width,
      top + height
    );

    if (index < this.dataManagementBreak.rows) {
      this.drawRowHeaderCell.fillRectangle(
        this.rowHeaderCanvasManager.renderCanvasCtx!,
        this.gridColors.controlBackGroundColor,
        rec
      );

      const diff = directionDown ? 0 : this.calendarSetting.borderWidth;
      this.drawRowHeaderCell.drawBorder(
        this.rowHeaderCanvasManager.renderCanvasCtx!,
        rec.left,
        rec.top,
        rec.width,
        rec.top + rec.height - diff - 1,
        this.gridColors.controlBackGroundColor,
        2,
        Gradient3DBorderStyleEnum.Raised
      );

      this.drawRowHeaderCell.drawText(
        this.rowHeaderCanvasManager.renderCanvasCtx!,
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
      this.drawRowHeaderCell.fillRectangle(
        this.rowHeaderCanvasManager.renderCanvasCtx!,
        this.gridColors.backGroundContainerColor,
        rec
      );
    }
  }

  public deleteCanvas() {
    this.rowHeaderCanvasManager.deleteCanvas();
  }

  public createCanvas() {
    this.rowHeaderCanvasManager.createCanvas();
  }

  public isCanvasAvailable(): boolean {
    return this.rowHeaderCanvasManager.isCanvasAvailable();
  }

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
  visibleRow(): number {
    return Math.ceil(this.height / this.calendarSetting.cellHeight);
  }

  firstVisibleRow(): number {
    return this.scroll.verticalScrollPosition;
  }

  lastVisibleRow(): number {
    return this.firstVisibleRow() + this.visibleRow();
  }
}

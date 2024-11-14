import { Injectable, NgZone } from '@angular/core';
import { ScrollService } from './scroll.service';
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { GridFontsService } from 'src/app/grid/services/grid-fonts.service';
import { CalendarSettingService } from './calendar-setting.service';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { Rectangle } from 'src/app/grid/classes/geometry';
import { RowHeaderCanvasManagerService } from './row-header-canvas.service';
import { CanvasAvailable } from 'src/app/services/canvasAvailable.decorator';
import { RenderRowHeaderCellService } from './render-row-header-cell.service';
import { RenderRowHeaderService } from './render-row-header.service';

@Injectable()
export class DrawRowHeaderService {
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
    public rowHeaderCanvasManager: RowHeaderCanvasManagerService,
    private drawRowHeaderCell: RenderRowHeaderCellService,
    private renderRowHeaderService: RenderRowHeaderService
  ) {}

  public set filterImage(image: HTMLImageElement | undefined) {
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
    console.log('moveRow', directionY);

    const visibleRow = Math.ceil(
      this.rowHeaderCanvasManager.height / this.calendarSetting.cellHeight
    );

    this.zone.run(() => {
      try {
        this.isBusy = true;

        if (dirY !== 0) {
          if (dirY > 0) {
            if (dirY < visibleRow / 2) {
              this.moveGrid(dirY);
              return;
            } else {
              this.renderRowHeader();
              return;
            }
          }
          if (dirY < 0) {
            if (dirY * -1 < visibleRow / 2) {
              this.moveGrid(dirY);
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

  private moveGrid(directionY: number): void {
    console.log(
      'moveIt',
      this.scroll.visibleRows,
      this.scroll.verticalScrollDelta,
      this.scroll.verticalScrollPosition
    );

    this.renderRowHeaderService.moveGrid(directionY);
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

import { Injectable } from '@angular/core';
import { Rectangle } from 'src/app/grid/classes/geometry';
import { RowHeaderCanvasManagerService } from './row-header-canvas.service';
import { CalendarSettingService } from './calendar-setting.service';
import { RenderRowHeaderCellService } from './render-row-header-cell.service';
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { GridFontsService } from 'src/app/grid/services/grid-fonts.service';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from 'src/app/grid/enums/cell-settings.enum';
import { Gradient3DBorderStyleEnum } from 'src/app/grid/enums/gradient-3d-border-style';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { ScrollService } from '../../../shared/scrollbar/scroll.service';

@Injectable()
export class RenderRowHeaderService {
  public recFilterIcon!: Rectangle;
  public filterImage: HTMLImageElement | undefined;

  public readonly iconSize = 16;

  constructor(
    private rowHeaderCanvasManager: RowHeaderCanvasManagerService,
    private calendarSetting: CalendarSettingService,
    private scroll: ScrollService,
    private gridColors: GridColorService,
    private gridFonts: GridFontsService,
    public dataManagementBreak: DataManagementBreakService,
    private renderRowHeaderCell: RenderRowHeaderCellService
  ) {}

  public createRuler(): void {
    this.ShapeHeaderCanvasSurface();

    const rec = new Rectangle(
      0,
      0,
      this.rowHeaderCanvasManager.width,
      this.rowHeaderCanvasManager.headerCanvas!.height
    );

    this.ClearHeaderCanvasSurface(rec);

    this.DrawHeaderCanvas(rec);

    this.drawFilterIcon(rec);
  }

  public renderRowHeader(): void {
    this.ShapeRenderCanvasSurface();
    this.ClearRenderCanvasSurface();

    const first = this.scroll.verticalScrollPosition;
    const last =
      this.scroll.verticalScrollPosition + this.scroll.visibleRows + 1;
    for (let i = first; i < last; i++) {
      this.drawName(i, true, false);
    }
  }

  public drawName(
    index: number,
    directionDown: boolean,
    isMoveGrid: boolean
  ): void {
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
      this.renderRowHeaderCell.fillRectangle(
        this.rowHeaderCanvasManager.renderCanvasCtx!,
        isMoveGrid ? 'red' : this.gridColors.controlBackGroundColor,
        rec
      );

      const diff = directionDown ? 0 : this.calendarSetting.borderWidth;
      this.renderRowHeaderCell.drawBorder(
        this.rowHeaderCanvasManager.renderCanvasCtx!,
        rec.left,
        rec.top,
        rec.width,
        rec.top + rec.height - diff - 1,
        this.gridColors.controlBackGroundColor,
        2,
        Gradient3DBorderStyleEnum.Raised
      );

      this.renderRowHeaderCell.drawText(
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
      this.renderRowHeaderCell.fillRectangle(
        this.rowHeaderCanvasManager.renderCanvasCtx!,
        this.gridColors.backGroundContainerColor,
        rec
      );
    }
  }

  public moveGrid(directionY: number): void {
    const lineAdjustmentMinus = -1;
    const lineAdjustmentPlus = 1;
    const visibleRow = this.scroll.visibleRows;
    const diff = this.scroll.verticalScrollDelta;

    if (directionY === 0 || diff === 0) {
      return;
    }

    this.moveImage(diff);

    let firstRow = 0;
    let lastRow = 0;
    const directionDown = directionY > 0;

    if (directionDown) {
      firstRow =
        visibleRow +
        this.scroll.verticalScrollPosition +
        diff +
        lineAdjustmentMinus;
      lastRow = firstRow + diff * -1 + lineAdjustmentPlus;
    } else {
      firstRow = this.scroll.verticalScrollPosition;
      lastRow = firstRow + diff + lineAdjustmentPlus;
    }

    for (let row = firstRow; row < lastRow; row++) {
      this.drawName(row, directionDown, true);
    }
  }

  private ShapeRenderCanvasSurface(): void {
    this.rowHeaderCanvasManager.renderCanvas!.height =
      this.rowHeaderCanvasManager.height;
    this.rowHeaderCanvasManager.renderCanvas!.width =
      this.rowHeaderCanvasManager.width;
  }

  private ClearRenderCanvasSurface(): void {
    this.renderRowHeaderCell.clearRect(
      this.rowHeaderCanvasManager.renderCanvasCtx!,
      0,
      0,
      this.rowHeaderCanvasManager.renderCanvas!.width,
      this.rowHeaderCanvasManager.renderCanvas!.height
    );
  }

  private ShapeHeaderCanvasSurface(): void {
    this.rowHeaderCanvasManager.headerCanvas!.height =
      this.calendarSetting.cellHeaderHeight;
    this.rowHeaderCanvasManager.headerCanvas!.width =
      this.rowHeaderCanvasManager.width;
  }

  private ClearHeaderCanvasSurface(rec: Rectangle): void {
    this.renderRowHeaderCell.fillRectangle(
      this.rowHeaderCanvasManager.headerCtx!,
      this.gridColors.controlBackGroundColor,
      rec
    );
  }

  private DrawHeaderCanvas(rec: Rectangle): void {
    this.renderRowHeaderCell.drawText(
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

    this.renderRowHeaderCell.drawBorder(
      this.rowHeaderCanvasManager.headerCtx!,
      rec.left,
      rec.top,
      rec.width,
      rec.height,
      this.gridColors.controlBackGroundColor,
      2,
      Gradient3DBorderStyleEnum.Raised
    );
  }

  private drawFilterIcon(rec: Rectangle) {
    if (!this.filterImage) {
      return;
    }

    const dy = rec.height / 2 - this.iconSize / 2;
    const dx = rec.width - (this.iconSize + 6);

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

  private moveImage(verticalDiff: number) {
    const height = this.calendarSetting.cellHeight;
    const canvas = this.rowHeaderCanvasManager.renderCanvas;
    if (canvas) {
      this.rowHeaderCanvasManager.renderCanvasCtx?.drawImage(
        canvas,
        0,
        verticalDiff * height
      );
    }
  }
}

import { Injectable, inject, Injector } from '@angular/core';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { RowHeaderCanvasManagerService } from './row-header-canvas.service';
import { CalendarSettingService } from './calendar-setting.service';
import { RenderRowHeaderCellService } from './render-row-header-cell.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { DataManagementBreakPlaceholderService } from 'src/app/domain/services/break/data-management-break-placeholder.service';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { Gradient3DBorderStyleEnum } from 'src/app/presentation/shared/grid/enums/gradient-3d-border-style';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { ScrollService } from '../../../shared/scrollbar/scroll.service';
import { DrawImageHelper } from 'src/app/presentation/helpers/draw-image-helper';
import { ProgressBarAnimationService } from 'src/app/presentation/shared/grid/services/progress-bar-animation.service';

@Injectable()
export class RenderRowHeaderService {
  private rowHeaderCanvasManager = inject(RowHeaderCanvasManagerService);
  private calendarSetting = inject(CalendarSettingService);
  private scroll = inject(ScrollService);
  private gridColors = inject(GridColorService);
  private gridFonts = inject(GridFontsService);
  dataManagementBreak = inject(DataManagementBreakPlaceholderService);
  private renderRowHeaderCell = inject(RenderRowHeaderCellService);
  private progressBar = inject(ProgressBarAnimationService);
  private injector = inject(Injector);

  public recFilterIcon!: Rectangle;
  public filterImage: HTMLImageElement | undefined;

  public readonly iconSize = 16;
  private isProgressBarInitialized = false;
  private progressEffectRef: { destroy: () => void } | null = null;

  public createRuler(): void {
    this.ShapeHeaderCanvasSurface();

    const rec = new Rectangle(
      0,
      0,
      this.rowHeaderCanvasManager.width,
      this.calendarSetting.cellHeaderHeight
    );

    this.ClearHeaderCanvasSurface(rec);

    this.DrawHeaderCanvas(rec);

    this.drawFilterIcon(rec);
  }

  private renderProgressBarOnly(): void {
    if (!this.rowHeaderCanvasManager.headerCtx) return;

    if (!this.dataManagementBreak.isLoadingMore && !this.dataManagementBreak.hasMoreRows) {
      this.createRuler();
      return;
    }

    const rec = new Rectangle(
      0,
      0,
      this.rowHeaderCanvasManager.width,
      this.calendarSetting.cellHeaderHeight
    );

    const ctx = this.rowHeaderCanvasManager.headerCtx;
    const dpr = DrawHelper.pixelRatio();
    const barHeight = 2 * dpr;
    const yPos = rec.top + rec.height - barHeight - 1;

    ctx.save();
    ctx.fillStyle = this.gridColors.controlBackGroundColor;
    ctx.fillRect(0, yPos * dpr, rec.width * dpr, barHeight + 2);
    ctx.restore();

    this.progressBar.drawInRect(ctx, rec.left, rec.top, rec.width, rec.height);
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
    const dpr = DrawHelper.pixelRatio();
    const canvas = this.rowHeaderCanvasManager.renderCanvas!;
    const ctx = this.rowHeaderCanvasManager.renderCanvasCtx!;
    const width = this.rowHeaderCanvasManager.width;
    const height = this.rowHeaderCanvasManager.height;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    DrawHelper.setAntiAliasing(ctx);
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
    const canvas = this.rowHeaderCanvasManager.headerCanvas;
    const ctx = this.rowHeaderCanvasManager.headerCtx;
    if (!canvas || !ctx) return;

    const dpr = DrawHelper.pixelRatio();
    const width = this.rowHeaderCanvasManager.width;
    const height = this.calendarSetting.cellHeaderHeight;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    DrawHelper.setAntiAliasing(ctx);
  }

  private ClearHeaderCanvasSurface(rec: Rectangle): void {
    this.renderRowHeaderCell.fillRectangle(
      this.rowHeaderCanvasManager.headerCtx!,
      this.gridColors.controlBackGroundColor,
      rec
    );
  }

  private DrawHeaderCanvas(rec: Rectangle): void {
    const totalCount = this.dataManagementBreak.totalAvailableRows;
    const loadedCount = this.dataManagementBreak.clients.length;
    const displayCount = totalCount > 0 ? totalCount : loadedCount;
    const headerText = `Name (${displayCount})`;

    this.renderRowHeaderCell.drawText(
      this.rowHeaderCanvasManager.headerCtx!,
      headerText,
      rec.left + 2,
      rec.top,
      rec.width - 2,
      rec.height - 3,
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

    this.initializeProgressBar();
    this.progressBar.drawInRect(
      this.rowHeaderCanvasManager.headerCtx!,
      rec.left,
      rec.top,
      rec.width,
      rec.height
    );
  }

  private initializeProgressBar(): void {
    if (!this.isProgressBarInitialized) {
      this.progressBar.configure({ position: 'bottom', height: 2 });
      this.progressBar.setRenderCallback(() => this.renderProgressBarOnly());

      const loader = this.dataManagementBreak;
      this.progressEffectRef = this.progressBar.setupWithLoader(this.injector, {
        get isRead() { return loader.isRead; },
        get loadingProgress() { return loader.loadingProgress; },
        get hasMore() { return loader.hasMoreRows; },
      });

      this.isProgressBarInitialized = true;
    }
  }

  public destroy(): void {
    this.progressEffectRef?.destroy();
    this.progressEffectRef = null;
    this.progressBar.destroy();
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
    if (canvas && this.rowHeaderCanvasManager.renderCanvasCtx) {
      DrawImageHelper.drawCanvasLogical(
        this.rowHeaderCanvasManager.renderCanvasCtx,
        canvas,
        0,
        verticalDiff * height
      );
    }
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject, Injector } from '@angular/core';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { SharedRowHeaderCanvasManagerService } from './row-header-canvas-manager.service';
import { SharedRenderRowHeaderCellService } from './render-row-header-cell.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from 'src/app/presentation/shared/grid/enums/cell-settings.enum';
import { Gradient3DBorderStyleEnum } from 'src/app/presentation/shared/grid/enums/gradient-3d-border-style';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { DrawImageHelper } from 'src/app/presentation/helpers/draw-image-helper';
import { IProgressLoader, ProgressBarAnimationService } from 'src/app/presentation/shared/grid/services/progress-bar-animation.service';
import { ROW_HEADER_SETTINGS, ROW_HEADER_DATA } from './row-header-tokens';

@Injectable()
export class SharedRenderRowHeaderService {
  private rowHeaderCanvasManager = inject(SharedRowHeaderCanvasManagerService);
  private settings = inject(ROW_HEADER_SETTINGS);
  private dataProvider = inject(ROW_HEADER_DATA);
  private scroll = inject(ScrollService);
  private gridColors = inject(GridColorService);
  private gridFonts = inject(GridFontsService);
  private renderRowHeaderCell = inject(SharedRenderRowHeaderCellService);
  private progressBar = inject(ProgressBarAnimationService);
  private injector = inject(Injector);

  public recFilterIcon!: Rectangle;
  public filterImage: HTMLImageElement | undefined;

  public readonly iconSize = 16;
  private isProgressBarInitialized = false;
  private progressEffectRef: { destroy: () => void } | null = null;

  private progressBarLoader: IProgressLoader | null = null;

  private rowCellTemplate: HTMLCanvasElement | undefined;
  private templateWidth = 0;

  public setProgressBarLoader(loader: IProgressLoader): void {
    this.progressBarLoader = loader;
  }

  public createRuler(): void {
    this.ShapeHeaderCanvasSurface();

    const rec = new Rectangle(
      0,
      0,
      this.rowHeaderCanvasManager.width,
      this.settings.cellHeaderHeight
    );

    this.ClearHeaderCanvasSurface(rec);
    this.DrawHeaderCanvas(rec);
    this.drawFilterIcon(rec);
  }

  private renderProgressBarOnly(): void {
    if (!this.rowHeaderCanvasManager.headerCtx) return;

    if (!this.progressBarLoader) {
      this.createRuler();
      return;
    }

    const rec = new Rectangle(
      0,
      0,
      this.rowHeaderCanvasManager.width,
      this.settings.cellHeaderHeight
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
    this.ensureRowCellTemplate();

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
    const height = this.settings.cellHeight;
    const top = Math.floor(dy * height);
    const ctx = this.rowHeaderCanvasManager.renderCanvasCtx!;
    const logicalWidth = this.rowHeaderCanvasManager.width;

    if (index < this.dataProvider.getRowCount()) {
      if (!isMoveGrid && this.rowCellTemplate) {
        ctx.drawImage(
          this.rowCellTemplate,
          0,
          0,
          this.rowCellTemplate.width,
          this.rowCellTemplate.height,
          0,
          top,
          logicalWidth,
          height
        );
      } else {
        const rec = new Rectangle(
          0,
          top,
          this.rowHeaderCanvasManager.renderCanvas!.width,
          top + height
        );

        this.renderRowHeaderCell.fillRectangle(
          ctx,
          isMoveGrid ? 'red' : this.gridColors.controlBackGroundColor,
          rec
        );

        const diff = directionDown ? 0 : this.settings.borderWidth;
        this.renderRowHeaderCell.drawBorder(
          ctx,
          rec.left,
          rec.top,
          rec.width,
          rec.top + rec.height - diff - 1,
          this.gridColors.controlBackGroundColor,
          2,
          Gradient3DBorderStyleEnum.Raised
        );
      }

      this.renderRowHeaderCell.drawText(
        ctx,
        this.dataProvider.getClientName(index),
        0,
        top,
        logicalWidth,
        height - 2,
        this.gridFonts.mainFontString,
        +this.gridFonts.mainFontSize,
        this.gridColors.foreGroundColor,
        TextAlignmentEnum.Left,
        BaselineAlignmentEnum.Center
      );
    } else {
      const rec = new Rectangle(
        0,
        top,
        this.rowHeaderCanvasManager.renderCanvas!.width,
        top + height
      );

      this.renderRowHeaderCell.fillRectangle(
        ctx,
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

  private ensureRowCellTemplate(): void {
    const logicalWidth = this.rowHeaderCanvasManager.width;
    if (this.rowCellTemplate && this.templateWidth === logicalWidth) {
      return;
    }

    const height = this.settings.cellHeight;
    const ratio = DrawHelper.pixelRatio();

    const canvas = document.createElement('canvas');
    canvas.width = logicalWidth * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);

    const bg = this.gridColors.controlBackGroundColor;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, logicalWidth, height);

    DrawHelper.drawBorder(
      ctx,
      0,
      0,
      logicalWidth,
      height - 1,
      bg,
      2,
      Gradient3DBorderStyleEnum.Raised
    );

    this.rowCellTemplate = canvas;
    this.templateWidth = logicalWidth;
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
    const height = this.settings.cellHeaderHeight;

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
    const displayCount = this.dataProvider.getTotalCount();
    const headerText = `Name (${displayCount})`;

    this.renderRowHeaderCell.drawText(
      this.rowHeaderCanvasManager.headerCtx!,
      headerText,
      rec.left,
      rec.top,
      rec.width,
      rec.height - 3,
      this.gridFonts.headerFontStringZoom,
      this.gridFonts.headerFontHeightZoom,
      this.gridColors.headerForeGroundColor,
      TextAlignmentEnum.Center,
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
    if (!this.isProgressBarInitialized && this.progressBarLoader) {
      this.progressBar.configure({ position: 'bottom', height: 2 });
      this.progressBar.setRenderCallback(() => this.renderProgressBarOnly());

      this.progressEffectRef = this.progressBar.setupWithLoader(
        this.injector,
        this.progressBarLoader
      );

      this.isProgressBarInitialized = true;
    }
  }

  public destroy(): void {
    this.progressEffectRef?.destroy();
    this.progressEffectRef = null;
    this.progressBar.destroy();
    this.rowCellTemplate = undefined;
    this.templateWidth = 0;
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
    const height = this.settings.cellHeight;
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

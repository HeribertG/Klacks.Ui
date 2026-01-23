import { inject, Injectable, Injector, effect, runInInjectionContext, DestroyRef } from '@angular/core';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { ShiftScheduleLoaderService } from 'src/app/domain/services/schedule/shift-schedule-loader.service';
import { ProgressBarAnimationService } from 'src/app/presentation/shared/grid/services/progress-bar-animation.service';
import { ShiftRowHeaderCanvasService } from './shift-row-header-canvas.service';
import { ShiftCreateRowHeaderService } from './shift-create-row-header.service';

@Injectable()
export class ShiftDrawRowHeaderService {
  private canvasManager = inject(ShiftRowHeaderCanvasService);
  private createRowHeader = inject(ShiftCreateRowHeaderService);
  private scroll = inject(ScrollService);
  private settings = inject(BaseSettingsService);
  private gridColors = inject(GridColorService);
  private shiftLoader = inject(ShiftScheduleLoaderService);
  private progressBar = inject(ProgressBarAnimationService);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);

  private canvasId = 'shiftRowHeaderCanvas';
  private lastVerticalScrollPosition = 0;
  private lastZoom = 1;
  private progressEffectRef: { destroy: () => void } | null = null;

  public selectedRow = -1;
  public isSelectedRowActive = false;

  public set width(value: number) {
    this.canvasManager.width = value;
    this.canvasManager.resizeMainCanvas();
    this.canvasManager.resizeRenderCanvas();
  }

  public get width(): number {
    return this.canvasManager.width;
  }

  public set height(value: number) {
    this.canvasManager.height = value;
    this.canvasManager.resizeMainCanvas();
    this.canvasManager.resizeRenderCanvas();
  }

  public get height(): number {
    return this.canvasManager.height;
  }

  public createCanvas(): void {
    this.canvasManager.createCanvas(this.canvasId);
    this.setupProgressBar();
  }

  public deleteCanvas(): void {
    this.progressEffectRef?.destroy();
    this.progressEffectRef = null;
    this.progressBar.destroy();
    this.canvasManager.deleteCanvas();
  }

  private setupProgressBar(): void {
    this.progressBar.configure({
      position: 'top',
      height: this.canvasManager.progressBarHeight,
    });
    this.progressBar.setRenderCallback(() => this.renderProgressBarOnly());

    const loader = this.shiftLoader;
    this.progressEffectRef = this.progressBar.setupWithLoader(this.injector, {
      get isRead() { return loader.isRead; },
      get loadingProgress() { return loader.shiftLoadingProgress; },
      get hasMore() { return loader.hasMoreShifts; },
    });
  }

  private renderProgressBarOnly(): void {
    if (!this.isCanvasAvailable() || !this.canvasManager.ctx) return;

    const ctx = this.canvasManager.ctx;
    const width = this.canvasManager.width;
    const height = this.height;
    const dpr = DrawHelper.pixelRatio();
    const barHeight = this.canvasManager.progressBarHeight * dpr;

    ctx.save();
    ctx.fillStyle = this.gridColors.controlBackGroundColor;
    ctx.fillRect(0, 0, width * dpr, barHeight + 2);
    ctx.restore();

    this.progressBar.draw(ctx, width, height);
  }

  private renderProgressBar(): void {
    if (!this.isCanvasAvailable()) return;
    this.drawGrid();
    this.renderGrid();
  }

  public isCanvasAvailable(): boolean {
    return this.canvasManager.isCanvasAvailable();
  }

  public refresh(): void {
    if (!this.isCanvasAvailable()) return;
    this.resetIfZoomChanged();
    this.drawGrid();
    this.renderGrid();
  }

  public redraw(): void {
    if (!this.isCanvasAvailable()) return;
    this.resetIfZoomChanged();
    this.drawGrid();
    this.renderGrid();
  }

  public moveGrid(): void {
    if (!this.isCanvasAvailable()) return;

    const verticalPos = this.scroll.verticalScrollPosition;
    const verticalDiff = verticalPos - this.lastVerticalScrollPosition;
    this.lastVerticalScrollPosition = verticalPos;

    if (verticalDiff === 0) {
      this.refresh();
      return;
    }

    this.resetIfZoomChanged();
    this.drawGrid();
    this.renderGrid();
  }

  private resetIfZoomChanged(): void {
    const currentZoom = this.settings.zoom;
    if (currentZoom !== this.lastZoom) {
      this.lastZoom = currentZoom;
      this.createRowHeader.reset();
    }
  }

  private drawGrid(): void {
    if (!this.canvasManager.renderCanvasCtx) return;

    const ctx = this.canvasManager.renderCanvasCtx;
    const visibleRows = this.visibleRows();
    const firstRow = this.scroll.verticalScrollPosition;

    ctx.clearRect(
      0,
      0,
      this.canvasManager.renderCanvas!.width,
      this.canvasManager.renderCanvas!.height
    );

    for (let i = 0; i < visibleRows + 1; i++) {
      const row = firstRow + i;
      const yPosition = i * this.settings.cellHeight;
      const isFirstVisibleRow = i === 0;
      this.createRowHeader.drawRow(row, yPosition, isFirstVisibleRow);
    }
  }

  private renderGrid(): void {
    if (
      !this.canvasManager.ctx ||
      !this.canvasManager.renderCanvas ||
      !this.canvasManager.canvas
    )
      return;

    const ctx = this.canvasManager.ctx;
    const pixelRatio = DrawHelper.pixelRatio();
    const srcW = this.canvasManager.renderCanvas.width;
    const srcH = this.canvasManager.renderCanvas.height;

    ctx.clearRect(
      0,
      0,
      this.canvasManager.canvas.width,
      this.canvasManager.canvas.height
    );
    ctx.drawImage(
      this.canvasManager.renderCanvas,
      0,
      0,
      srcW,
      srcH,
      0,
      0,
      srcW / pixelRatio,
      srcH / pixelRatio
    );

    this.drawHighlightOnMainCanvas(ctx);
    this.progressBar.draw(ctx, this.canvasManager.width, this.height);
  }

  private drawHighlightOnMainCanvas(ctx: CanvasRenderingContext2D): void {
    if (!this.isSelectedRowActive) return;

    const firstRow = this.scroll.verticalScrollPosition;
    const visibleRows = this.visibleRows();

    if (
      this.selectedRow < firstRow ||
      this.selectedRow >= firstRow + visibleRows + 1
    )
      return;

    const rowIndex = this.selectedRow - firstRow;
    const yPosition = rowIndex * this.settings.cellHeight;

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = this.gridColors.focusBorderColor;
    ctx.fillRect(
      0,
      yPosition,
      this.canvasManager.canvas!.width,
      this.settings.cellHeight
    );
    ctx.globalAlpha = 1.0;
  }

  private visibleRows(): number {
    return Math.ceil(this.height / this.settings.cellHeight);
  }
}

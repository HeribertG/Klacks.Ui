import { inject, Injectable } from '@angular/core';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { ShiftRowHeaderCanvasService } from './shift-row-header-canvas.service';
import { ShiftCreateRowHeaderService } from './shift-create-row-header.service';

@Injectable()
export class ShiftDrawRowHeaderService {
  private canvasManager = inject(ShiftRowHeaderCanvasService);
  private createRowHeader = inject(ShiftCreateRowHeaderService);
  private scroll = inject(ScrollService);
  private settings = inject(BaseSettingsService);
  private dataService = inject(BaseDataService);

  private canvasId = 'shiftRowHeaderCanvas';
  private lastVerticalScrollPosition = 0;

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
  }

  public deleteCanvas(): void {
    this.canvasManager.deleteCanvas();
  }

  public isCanvasAvailable(): boolean {
    return this.canvasManager.isCanvasAvailable();
  }

  public refresh(): void {
    if (!this.isCanvasAvailable()) return;
    this.drawGrid();
    this.renderGrid();
  }

  public redraw(): void {
    if (!this.isCanvasAvailable()) return;
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

    this.drawGrid();
    this.renderGrid();
  }

  private drawGrid(): void {
    if (!this.canvasManager.renderCanvasCtx) return;

    const visibleRows = this.visibleRows();
    const firstRow = this.scroll.verticalScrollPosition;

    this.canvasManager.renderCanvasCtx.clearRect(
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
    if (!this.canvasManager.ctx || !this.canvasManager.renderCanvas) return;

    const pixelRatio = DrawHelper.pixelRatio();
    const srcW = this.canvasManager.renderCanvas.width;
    const srcH = this.canvasManager.renderCanvas.height;

    this.canvasManager.ctx.drawImage(
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
  }

  private visibleRows(): number {
    return Math.ceil(this.height / this.settings.cellHeight);
  }
}

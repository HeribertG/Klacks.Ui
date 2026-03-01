// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject, signal } from '@angular/core';
import { AvailabilitySettingService } from './availability-setting.service';
import { AvailabilityCanvasManagerService } from './availability-canvas-manager.service';
import { RenderAvailabilityGridService } from './render-availability-grid';
import { AvailabilityCalculationService } from './render-availability-grid/availability-calculation.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';

@Injectable()
export class DrawAvailabilityGridService {
  private settings = inject(AvailabilitySettingService);
  private canvasManager = inject(AvailabilityCanvasManagerService);
  private renderGrid = inject(RenderAvailabilityGridService);
  private calculation = inject(AvailabilityCalculationService);

  public vScrollbarRefreshTrigger = signal(0);
  public hScrollbarRefreshTrigger = signal(0);

  private scrollX = 0;
  private scrollY = 0;

  public drawGrid(): void {
    if (!this.canvasManager.isCanvasAvailable()) return;

    this.renderGrid.renderHeader();
    this.renderGrid.renderGrid(this.scrollX, this.scrollY);
    this.compositeToMain();
  }

  public moveGrid(moveX: number, moveY: number): void {
    this.scrollX = Math.max(0, moveX);
    this.scrollY = Math.max(0, moveY);
    this.drawGrid();
  }

  public getScrollX(): number {
    return this.scrollX;
  }

  public getScrollY(): number {
    return this.scrollY;
  }

  public getMaxScrollX(): number {
    const totalWidth = this.calculation.getWidth();
    return Math.max(0, totalWidth - this.canvasManager.width);
  }

  public getMaxScrollY(): number {
    const totalHeight = this.renderGrid.totalRows * this.settings.cellHeight;
    const bodyHeight = this.canvasManager.height - this.settings.cellHeaderHeight;
    return Math.max(0, totalHeight - bodyHeight);
  }

  public getVisibleWidth(): number {
    return this.canvasManager.width;
  }

  public getVisibleHeight(): number {
    return this.canvasManager.height - this.settings.cellHeaderHeight;
  }

  private compositeToMain(): void {
    const ctx = this.canvasManager.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvasManager.width, this.canvasManager.height);

    if (this.canvasManager.headerCanvas) {
      const headerHeight = this.settings.cellHeaderHeight;
      const ratio = DrawHelper.pixelRatio();

      ctx.drawImage(
        this.canvasManager.headerCanvas,
        this.scrollX * ratio,
        0,
        this.canvasManager.width * ratio,
        headerHeight * ratio,
        0,
        0,
        this.canvasManager.width,
        headerHeight
      );
    }

    if (this.canvasManager.renderCanvas) {
      ctx.drawImage(
        this.canvasManager.renderCanvas,
        0,
        0,
        this.canvasManager.renderCanvas.width,
        this.canvasManager.renderCanvas.height,
        0,
        this.settings.cellHeaderHeight,
        this.canvasManager.renderCanvas.width,
        this.canvasManager.renderCanvas.height
      );
    }
  }
}

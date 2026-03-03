// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { SharedRowHeaderCanvasManagerService } from 'src/app/presentation/shared/grid/row-header/row-header-canvas-manager.service';
import { SharedRenderRowHeaderService } from 'src/app/presentation/shared/grid/row-header/render-row-header.service';
import { DrawImageHelper } from 'src/app/presentation/helpers/draw-image-helper';
import { ROW_HEADER_SETTINGS } from 'src/app/presentation/shared/grid/row-header/row-header-tokens';
import { IRowHeaderSettings } from 'src/app/presentation/shared/grid/row-header/row-header-settings.interface';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { ROW_HEADER_DATA } from 'src/app/presentation/shared/grid/row-header/row-header-tokens';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';

@Injectable()
export class DrawAvailabilityRowHeaderService {
  private settings = inject(ROW_HEADER_SETTINGS) as IRowHeaderSettings;
  private canvasManager = inject(SharedRowHeaderCanvasManagerService);
  private renderService = inject(SharedRenderRowHeaderService);
  private scroll = inject(ScrollService);
  private dataProvider = inject(ROW_HEADER_DATA);

  public readonly iconSize = 24;

  public set filterImage(image: HTMLImageElement | HTMLCanvasElement | undefined) {
    this.renderService.filterImage = image;
  }

  public get recFilterIcon(): Rectangle {
    return this.renderService.recFilterIcon;
  }

  public get rowHeaderCanvasManager(): SharedRowHeaderCanvasManagerService {
    return this.canvasManager;
  }

  public createCanvas(canvasId: string): void {
    this.canvasManager.createCanvas(canvasId);
  }

  public deleteCanvas(): void {
    this.canvasManager.deleteCanvas();
  }

  public isCanvasAvailable(): boolean {
    return this.canvasManager.isCanvasAvailable();
  }

  public set width(value: number) {
    this.canvasManager.width = value;
  }

  public get width(): number {
    return this.canvasManager.width;
  }

  public set height(value: number) {
    this.canvasManager.height = value;
    this.updateVisibleRows();
  }

  public get height(): number {
    return this.canvasManager.height;
  }

  public drawRowHeader(): void {
    if (!this.canvasManager.isCanvasAvailable()) return;

    this.updateScrollState();
    this.renderService.createRuler();
    this.renderService.renderRowHeader();
    this.compositeToMain();
  }

  public moveVertical(scrollY: number): void {
    const rowIndex = Math.floor(scrollY / this.settings.cellHeight);
    this.scroll.verticalScrollPosition = rowIndex;
    this.drawRowHeader();
  }

  public destroy(): void {
    this.renderService.destroy();
  }

  private updateVisibleRows(): void {
    const bodyHeight = this.canvasManager.height - this.settings.cellHeaderHeight;
    this.scroll.visibleRows = Math.ceil(bodyHeight / this.settings.cellHeight);
  }

  private updateScrollState(): void {
    this.scroll.maxRows = this.dataProvider.getRowCount();
    this.updateVisibleRows();
  }

  private compositeToMain(): void {
    const ctx = this.canvasManager.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvasManager.width, this.canvasManager.height);

    if (this.canvasManager.headerCanvas) {
      DrawImageHelper.drawCanvasLogical(
        ctx,
        this.canvasManager.headerCanvas,
        0,
        0
      );
    }

    if (this.canvasManager.renderCanvas) {
      DrawImageHelper.drawCanvasLogical(
        ctx,
        this.canvasManager.renderCanvas,
        0,
        this.settings.cellHeaderHeight
      );
    }
  }
}

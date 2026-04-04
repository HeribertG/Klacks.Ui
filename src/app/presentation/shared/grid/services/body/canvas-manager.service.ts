// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';

@Injectable()
export class BaseCanvasManagerService {
  protected settings = inject(BaseSettingsService);

  private _ctx: CanvasRenderingContext2D | undefined;
  private _canvas: HTMLCanvasElement | undefined;
  private _renderCanvasCtx: CanvasRenderingContext2D | undefined;
  private _renderCanvas: HTMLCanvasElement | undefined;
  public headerCanvas: HTMLCanvasElement | undefined;
  public headerCtx: CanvasRenderingContext2D | undefined;

  private _width = 10;
  private _height = 10;
  private id!: string;
  private _canvasWasAvailable = false;

  public get ctx(): CanvasRenderingContext2D | undefined { return this._ctx; }
  public set ctx(value: CanvasRenderingContext2D | undefined) { this._ctx = value; }

  public get canvas(): HTMLCanvasElement | undefined { return this._canvas; }
  public set canvas(value: HTMLCanvasElement | undefined) { this._canvas = value; }

  public get renderCanvasCtx(): CanvasRenderingContext2D | undefined { return this._renderCanvasCtx; }
  public set renderCanvasCtx(value: CanvasRenderingContext2D | undefined) { this._renderCanvasCtx = value; }

  public get renderCanvas(): HTMLCanvasElement | undefined { return this._renderCanvas; }
  public set renderCanvas(value: HTMLCanvasElement | undefined) { this._renderCanvas = value; }

  public init(id: string): void {
    this.id = id;
  }

  public createCanvas(): void {
    this.createMainCanvas();
    this.createRenderCanvas();
    this.createHeaderCanvas();
  }

  public deleteCanvas(): void {
    this._canvasWasAvailable = false;
    this.ctx = undefined;
    this.canvas = undefined;
    this.renderCanvasCtx = undefined;
    this.renderCanvas = undefined;
    this.headerCanvas = undefined;
    this.headerCtx = undefined;
  }

  public resizeMainCanvas(): void {
    if (this.canvas && this.ctx) {
      this.ctx = DrawHelper.createHiDPICanvas(
        this.canvas,
        this._width,
        this._height,
        true
      );
      DrawHelper.setAntiAliasing(this.ctx);
    }
  }

  public resizeRenderCanvas(visibleRow: number, visibleCol: number): void {
    if (!this.renderCanvas || !this.renderCanvasCtx) {
      return;
    }
    const pixelRatio = DrawHelper.pixelRatio();
    const logicalWidth = visibleCol * this.settings.cellWidth;
    const logicalHeight = visibleRow * this.settings.cellHeight;

    this.renderCanvas.width = logicalWidth * pixelRatio;
    this.renderCanvas.height = logicalHeight * pixelRatio;

    this.renderCanvas.style.width = `${logicalWidth}px`;
    this.renderCanvas.style.height = `${logicalHeight}px`;

    this.renderCanvasCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.renderCanvasCtx.clearRect(0, 0, logicalWidth, logicalHeight);

    DrawHelper.setAntiAliasing(this.renderCanvasCtx);
  }

  public isCanvasAvailable(): boolean {
    const available = (
      this.canvas != null &&
      this.width > 0 &&
      this.height > 0 &&
      this.ctx != null
    );
    if (!available && this._canvasWasAvailable) {
      this._canvasWasAvailable = false;
    }
    if (available && !this._canvasWasAvailable) {
      this._canvasWasAvailable = true;
    }
    return available;
  }

  public isRenderCanvasAvailable(): boolean {
    return this.renderCanvas != null && this.renderCanvasCtx != null;
  }

  public set width(value: number) {
    this._width = value;
    this.resizeMainCanvas();
  }

  public get width(): number {
    return this._width;
  }

  public set height(value: number) {
    this._height = value;
    this.resizeMainCanvas();
  }

  public get height(): number {
    return this._height;
  }

  private createMainCanvas(): void {
    if (!this.id) {
      return;
    }

    this.canvas = document.getElementById(this.id) as HTMLCanvasElement;
    if (!this.canvas) {
      return;
    }

    try {
      this.ctx = DrawHelper.createHiDPICanvas(
        this.canvas,
        this.width,
        this.height,
        true
      );
      DrawHelper.setAntiAliasing(this.ctx);
    } catch { /* Canvas initialization may fail in headless/test environments */ }
  }

  private createRenderCanvas(): void {
    this.renderCanvas = document.createElement('canvas') as HTMLCanvasElement;
    if (!this.renderCanvas) {
      console.error("Canvas with ID 'renderCanvas' not found.");
      return;
    }

    try {
      this.renderCanvasCtx = DrawHelper.createHiDPICanvas(
        this.renderCanvas,
        this.width,
        this.height,
        true
      );
      DrawHelper.setAntiAliasing(this.renderCanvasCtx);
    } catch (error) {
      console.error('Error when creating the renderCanvas context:', error);
    }
  }

  private createHeaderCanvas(): void {
    this.headerCanvas = document.createElement('canvas') as HTMLCanvasElement;
    if (!this.headerCanvas) {
      console.error("Canvas with ID 'headerCanvas' not found.");
      return;
    }

    try {
      this.headerCtx = DrawHelper.createHiDPICanvas(
        this.headerCanvas,
        this.width,
        this.settings.cellHeaderHeight,
        true
      );
      DrawHelper.setAntiAliasing(this.headerCtx);
    } catch (error) {
      console.error('Error when creating the headerCanvas context:', error);
    }
  }
}

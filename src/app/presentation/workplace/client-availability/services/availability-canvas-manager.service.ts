// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { AvailabilitySettingService } from './availability-setting.service';

@Injectable()
export class AvailabilityCanvasManagerService {
  private settings = inject(AvailabilitySettingService);

  public ctx: CanvasRenderingContext2D | undefined;
  public canvas: HTMLCanvasElement | undefined;
  public renderCanvasCtx: CanvasRenderingContext2D | undefined;
  public renderCanvas: HTMLCanvasElement | undefined;
  public headerCanvas: HTMLCanvasElement | undefined;
  public headerCtx: CanvasRenderingContext2D | undefined;

  private _width = 10;
  private _height = 10;

  public createCanvas(canvasId: string): void {
    this.createMainCanvas(canvasId);
    this.createRenderCanvas();
    this.createHeaderCanvas();
  }

  public deleteCanvas(): void {
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

  public clearRenderCanvas(): void {
    if (this.renderCanvas && this.renderCanvasCtx) {
      this.renderCanvasCtx.clearRect(
        0,
        0,
        this.renderCanvas.width,
        this.renderCanvas.height
      );
    }
  }

  public resizeRenderCanvas(visibleRow: number, visibleCol: number): void {
    if (this.renderCanvas && this.renderCanvasCtx) {
      this.renderCanvas.height = visibleRow * this.settings.cellHeight;
      this.renderCanvas.width = visibleCol * this.settings.cellWidth;
      this.renderCanvasCtx.clearRect(
        0,
        0,
        this.renderCanvas.width,
        this.renderCanvas.height
      );
    }
  }

  public isCanvasAvailable(): boolean {
    return (
      this.canvas != null &&
      this._width > 0 &&
      this._height > 0 &&
      this.ctx != null
    );
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

  public resizeHeaderCanvas(width: number): void {
    if (this.headerCanvas && this.headerCtx) {
      this.headerCtx = DrawHelper.createHiDPICanvas(
        this.headerCanvas,
        width,
        this.settings.cellHeaderHeight,
        true
      );
      DrawHelper.setAntiAliasing(this.headerCtx);
    }
  }

  private createMainCanvas(canvasId: string): void {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      return;
    }

    try {
      this.ctx = DrawHelper.createHiDPICanvas(
        this.canvas,
        this._width,
        this._height,
        true
      );
      DrawHelper.setAntiAliasing(this.ctx);
    } catch (error) {
      console.error('Error creating availability canvas context:', error);
    }
  }

  private createRenderCanvas(): void {
    this.renderCanvas = document.createElement('canvas');
    try {
      this.renderCanvas.width = this._width;
      this.renderCanvas.height = this._height;
      this.renderCanvasCtx = this.renderCanvas.getContext('2d', {
        willReadFrequently: true,
      })!;
      DrawHelper.setAntiAliasing(this.renderCanvasCtx);
    } catch (error) {
      console.error('Error creating render canvas context:', error);
    }
  }

  private createHeaderCanvas(): void {
    this.headerCanvas = document.createElement('canvas');
    try {
      this.headerCtx = DrawHelper.createHiDPICanvas(
        this.headerCanvas,
        this._width,
        this.settings.cellHeaderHeight,
        true
      );
      DrawHelper.setAntiAliasing(this.headerCtx);
    } catch (error) {
      console.error('Error creating header canvas context:', error);
    }
  }
}

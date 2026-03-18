// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service managing canvas elements for shift row header rendering.
 * Handles canvas creation, sizing, and double-buffering setup.
 * Provides drawing context for ShiftDrawRowHeaderService.
 *
 * @relations
 * - Used by: ShiftDrawRowHeaderService, ShiftCreateRowHeaderService
 * - Uses: BaseSettingsService for dimensions
 */
import { Injectable, inject } from '@angular/core';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';

@Injectable()
export class ShiftRowHeaderCanvasService {
  private settings = inject(BaseSettingsService);

  public ctx: CanvasRenderingContext2D | undefined;
  public canvas: HTMLCanvasElement | undefined;
  public renderCanvasCtx: CanvasRenderingContext2D | undefined;
  public renderCanvas: HTMLCanvasElement | undefined;

  private _width = 10;
  private _height = 10;
  private _canvasWasAvailable = false;
  private _canvasId = '';
  public readonly progressBarHeight = 2;

  public createCanvas(canvasId: string): void {
    this._canvasId = canvasId;
    this.createMainCanvas(canvasId);
    this.createRenderCanvas();
  }

  public deleteCanvas(): void {
    this._canvasWasAvailable = false;
    this.ctx = undefined;
    this.canvas = undefined;
    this.renderCanvasCtx = undefined;
    this.renderCanvas = undefined;
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

  public set width(value: number) {
    this._width = value;
  }

  public get width(): number {
    return this._width;
  }

  public set height(value: number) {
    this._height = value;
  }

  public get height(): number {
    return this._height;
  }

  private createMainCanvas(canvasId: string): void {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
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
    } catch (error) {
      console.error('Error when creating the shift row header canvas context:', error);
    }
  }

  private createRenderCanvas(): void {
    this.renderCanvas = document.createElement('canvas') as HTMLCanvasElement;
    try {
      this.renderCanvasCtx = DrawHelper.createHiDPICanvas(
        this.renderCanvas,
        this.width,
        this.height,
        true
      );
      DrawHelper.setAntiAliasing(this.renderCanvasCtx);
    } catch (error) {
      console.error('Error when creating the render canvas context:', error);
    }
  }

  public resizeMainCanvas(): void {
    if (this.isCanvasAvailable() && this.canvas) {
      this.ctx = DrawHelper.createHiDPICanvas(
        this.canvas,
        this.width,
        this.height,
        true
      );
      DrawHelper.setAntiAliasing(this.ctx);
    }
  }

  public resizeRenderCanvas(): void {
    if (this.isCanvasAvailable() && this.renderCanvas) {
      this.renderCanvasCtx = DrawHelper.createHiDPICanvas(
        this.renderCanvas,
        this.width,
        this.height,
        true
      );
      DrawHelper.setAntiAliasing(this.renderCanvasCtx);
    }
  }
}

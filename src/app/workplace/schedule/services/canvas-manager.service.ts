import { Injectable } from '@angular/core';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { SettingsService } from './settings.service';

@Injectable()
export class CanvasManagerService {
  public ctx: CanvasRenderingContext2D | undefined;
  public canvas: HTMLCanvasElement | undefined;
  public renderCanvasCtx: CanvasRenderingContext2D | undefined;
  public renderCanvas: HTMLCanvasElement | undefined;
  public headerCanvas: HTMLCanvasElement | undefined;
  public headerCtx: CanvasRenderingContext2D | undefined;

  private _width = 10;
  private _height = 10;

  constructor(private settings: SettingsService) {}

  public createCanvas(): void {
    this.createMainCanvas();
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
    if (this.canvas) {
      this.canvas.width = this._width;
      this.canvas.height = this._height;
      this.canvas.style.width = `${this._width}px`;
      this.canvas.style.height = `${this._height}px`;
    }
    if (this.ctx) {
      this.ctx.canvas.width = this._width;
      this.ctx.canvas.height = this._height;
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
      this.width > 0 &&
      this.height > 0 &&
      this.ctx != null
    );
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
    this.canvas = document.getElementById(
      'scheduleCanvas'
    ) as HTMLCanvasElement;
    if (!this.canvas) {
      console.error("Canvas with ID 'scheduleCanvas' not found.");
      return;
    }

    try {
      this.ctx = DrawHelper.createHiDPICanvas(
        this.canvas,
        this.width,
        this.height
      );
      DrawHelper.setAntiAliasing(this.ctx);
    } catch (error) {
      console.error('Error when creating the scheduleCanvas context:', error);
    }
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

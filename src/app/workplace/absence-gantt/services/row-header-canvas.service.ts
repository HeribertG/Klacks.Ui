import { Injectable } from '@angular/core';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { CalendarSettingService } from './calendar-setting.service';

@Injectable()
export class RowHeaderCanvasManagerService {
  public ctx: CanvasRenderingContext2D | undefined;
  public canvas: HTMLCanvasElement | undefined;
  public renderCanvasCtx: CanvasRenderingContext2D | undefined;
  public renderCanvas: HTMLCanvasElement | undefined;
  public headerCanvas: HTMLCanvasElement | undefined;
  public headerCtx: CanvasRenderingContext2D | undefined;

  private _width = 10;
  private _height = 10;
  public pixelRatio = 1;

  constructor(private calendarSetting: CalendarSettingService) {}

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
    this.createMainCanvas();
  }

  public resizeRenderCanvas(): void {
    this.createRenderCanvas();
    this.createHeaderCanvas();
  }

  public isCanvasAvailable(): boolean {
    return (
      this.canvas != null &&
      this.width > 0 &&
      this.height > 0 &&
      this.ctx != null
    );
  }

  public set width(value: number) {
    this._width = value;
    this.createCanvas();
  }

  public get width(): number {
    return this._width;
  }

  public set height(value: number) {
    this._height = value;
    this.createCanvas();
  }

  public get height(): number {
    return this._height;
  }

  private createMainCanvas(): void {
    this.canvas = document.getElementById(
      'rowHeaderCanvas'
    ) as HTMLCanvasElement;
    if (!this.canvas) {
      console.error("Canvas with ID 'rowHeaderCanvas' not found.");
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
      console.error('Error when creating the rowHeaderCanvas context:', error);
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
      console.error('Error when creating the renderCanvas context:', error);
    }
  }

  private createHeaderCanvas(): void {
    this.headerCanvas = document.createElement('canvas') as HTMLCanvasElement;
    try {
      this.headerCtx = DrawHelper.createHiDPICanvas(
        this.headerCanvas,
        this.width,
        this.calendarSetting.cellHeaderHeight,
        true
      );
      DrawHelper.setAntiAliasing(this.headerCtx);
    } catch (error) {
      console.error('Error when creating the headerCanvas context:', error);
    }
  }

  public save(): void {
    if (this.ctx) {
      this.ctx.save();
    }
  }

  public restore(): void {
    if (this.ctx) {
      this.ctx.restore();
    }
  }

  public setGlobalAlpha(alpha: number): void {
    if (this.ctx) {
      this.ctx.globalAlpha = alpha;
    }
  }

  public setFillStyle(style: string): void {
    if (this.ctx) {
      this.ctx.fillStyle = style;
    }
  }

  public fillRect(x: number, y: number, width: number, height: number): void {
    if (this.ctx) {
      this.ctx.fillRect(x, y, width, height);
    }
  }
}

import { Injectable } from '@angular/core';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { CalendarSettingService } from './calendar-setting.service';

@Injectable({
  providedIn: 'root',
})
export class GanttCanvasManagerService {
  public ctx: CanvasRenderingContext2D | undefined;
  public canvas: HTMLCanvasElement | undefined;
  public renderCanvasCtx: CanvasRenderingContext2D | undefined;
  public renderCanvas: HTMLCanvasElement | undefined;
  public headerCanvas: HTMLCanvasElement | undefined;
  public headerCtx: CanvasRenderingContext2D | undefined;
  public backgroundRowCanvas: HTMLCanvasElement | undefined;
  public backgroundRowCtx: CanvasRenderingContext2D | undefined;
  public rowCanvas: HTMLCanvasElement | undefined;
  public rowCtx: CanvasRenderingContext2D | undefined;

  private _width: number = 10;
  private _height: number = 10;
  public pixelRatio = 1;

  constructor(private calendarSetting: CalendarSettingService) {}

  public createCanvas(): void {
    this.createMainCanvas();
    this.createRenderCanvas();
    this.createHeaderCanvas();
    this.createBackgroundRowCanvas();
    this.createRowCanvas();
  }

  public deleteCanvas(): void {
    this.ctx = undefined;
    this.canvas = undefined;
    this.renderCanvasCtx = undefined;
    this.renderCanvas = undefined;
    this.headerCanvas = undefined;
    this.headerCtx = undefined;
    this.backgroundRowCanvas = undefined;
    this.backgroundRowCtx = undefined;
    this.rowCanvas = undefined;
    this.rowCtx = undefined;
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
      this.renderCanvas.height = visibleRow * this.calendarSetting.cellHeight;
      this.renderCanvas.width = visibleCol * this.calendarSetting.cellWidth;
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
      'calendarCanvas'
    ) as HTMLCanvasElement;
    if (!this.canvas) {
      console.error("Canvas with ID 'calendarCanvas' not found.");
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
      console.error('Error when creating the calendarCanvas context:', error);
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

  private createBackgroundRowCanvas(): void {
    this.backgroundRowCanvas = document.createElement(
      'canvas'
    ) as HTMLCanvasElement;
    try {
      this.backgroundRowCtx = DrawHelper.createHiDPICanvas(
        this.backgroundRowCanvas,
        this.width,
        this.calendarSetting.cellHeight,
        true
      );
      DrawHelper.setAntiAliasing(this.backgroundRowCtx);
    } catch (error) {
      console.error(
        'Error when creating the backgroundRowCanvas context:',
        error
      );
    }
  }

  private createRowCanvas(): void {
    this.rowCanvas = document.createElement('canvas') as HTMLCanvasElement;
    try {
      this.rowCtx = DrawHelper.createHiDPICanvas(
        this.rowCanvas,
        this.width,
        this.calendarSetting.cellHeight,
        true
      );
      DrawHelper.setAntiAliasing(this.rowCtx);
    } catch (error) {
      console.error('Error when creating the rowCanvas context:', error);
    }
  }
}

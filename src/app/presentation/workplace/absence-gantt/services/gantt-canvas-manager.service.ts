// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { CalendarSettingService } from './calendar-setting.service';

@Injectable()
export class GanttCanvasManagerService {
  private calendarSetting = inject(CalendarSettingService);

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

  private _width = 10;
  private _height = 10;
  public pixelRatio = 1;

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

  public resizeHeaderCanvas(width: number): void {
    if (this.headerCanvas && this.headerCtx) {
      this.headerCtx = DrawHelper.createHiDPICanvas(
        this.headerCanvas,
        width,
        this.calendarSetting.cellHeaderHeight,
        true
      );
      DrawHelper.setAntiAliasing(this.headerCtx);
    }
  }

  public resizeBackgroundRowCanvas(width: number): void {
    if (this.backgroundRowCanvas && this.backgroundRowCtx) {
      this.backgroundRowCanvas.width = width;
      this.backgroundRowCanvas.height = this.calendarSetting.cellHeight;
    }
  }

  public resizeRowCanvas(width: number): void {
    if (this.rowCanvas && this.rowCtx) {
      this.rowCanvas.width = width;
      this.rowCanvas.height = this.calendarSetting.cellHeight;
    }
  }

  private createMainCanvas(): void {
    this.canvas = document.getElementById(
      'absence-surface-canvas'
    ) as HTMLCanvasElement;
    if (!this.canvas) {
      console.error("Canvas with ID 'absence-surface-canvas' not found.");
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
      console.error('Error when creating the calendarCanvas context:', error);
    }
  }

  private createRenderCanvas(): void {
    this.renderCanvas = document.createElement('canvas') as HTMLCanvasElement;
    try {
      this.renderCanvas.width = this.width;
      this.renderCanvas.height = this.height;
      this.renderCanvasCtx = this.renderCanvas.getContext('2d', {
        willReadFrequently: true,
      })!;
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
      this.backgroundRowCanvas.width = this.width;
      this.backgroundRowCanvas.height = this.calendarSetting.cellHeight;
      this.backgroundRowCtx = this.backgroundRowCanvas.getContext('2d', {
        willReadFrequently: true,
      })!;
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
      this.rowCanvas.width = this.width;
      this.rowCanvas.height = this.calendarSetting.cellHeight;
      this.rowCtx = this.rowCanvas.getContext('2d', {
        willReadFrequently: true,
      })!;
      DrawHelper.setAntiAliasing(this.rowCtx);
    } catch (error) {
      console.error('Error when creating the rowCanvas context:', error);
    }
  }
}

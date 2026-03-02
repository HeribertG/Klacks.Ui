// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';

@Injectable()
export class CheckboxDrawingService {
  private gridColors = inject(GridColorService);

  private static readonly CHECKBOX_SIZE = 16;
  private static readonly BORDER_RADIUS = 3;
  private static readonly CHECKMARK_LINE_WIDTH = 2;

  private checkedCanvas: HTMLCanvasElement | undefined;
  private uncheckedCanvas: HTMLCanvasElement | undefined;

  public initialize(): void {
    this.checkedCanvas = this.createCheckedCanvas();
    this.uncheckedCanvas = this.createUncheckedCanvas();
  }

  public getCheckedCanvas(): HTMLCanvasElement | undefined {
    return this.checkedCanvas;
  }

  public getUncheckedCanvas(): HTMLCanvasElement | undefined {
    return this.uncheckedCanvas;
  }

  public get checkboxSize(): number {
    return CheckboxDrawingService.CHECKBOX_SIZE;
  }

  private createCheckedCanvas(): HTMLCanvasElement {
    const size = CheckboxDrawingService.CHECKBOX_SIZE;
    const ratio = DrawHelper.pixelRatio();
    const canvas = document.createElement('canvas');
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);

    ctx.fillStyle = this.gridColors.focusBorderColor ?? '#4CAF50';
    this.drawRoundRect(ctx, 0.5, 0.5, size - 1, size - 1, CheckboxDrawingService.BORDER_RADIUS);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = CheckboxDrawingService.CHECKMARK_LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(3.5, 8);
    ctx.lineTo(6.5, 11.5);
    ctx.lineTo(12.5, 4.5);
    ctx.stroke();

    return canvas;
  }

  private createUncheckedCanvas(): HTMLCanvasElement {
    const size = CheckboxDrawingService.CHECKBOX_SIZE;
    const ratio = DrawHelper.pixelRatio();
    const canvas = document.createElement('canvas');
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);

    ctx.strokeStyle = this.gridColors.borderColor ?? '#999999';
    ctx.lineWidth = 1;
    this.drawRoundRect(ctx, 0.5, 0.5, size - 1, size - 1, CheckboxDrawingService.BORDER_RADIUS);
    ctx.stroke();

    return canvas;
  }

  private drawRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

import { Injectable } from '@angular/core';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { Rectangle } from 'src/app/grid/classes/geometry';
import { Gradient3DBorderStyleEnum } from 'src/app/grid/enums/gradient-3d-border-style';
import {
  BaselineAlignmentEnum,
  TextAlignmentEnum,
} from 'src/app/grid/enums/cell-settings.enum';

@Injectable({
  providedIn: 'root',
})
export class DrawRowHeaderCellService {
  constructor() {}

  public drawImage(
    ctx: CanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement,
    x: number,
    y: number
  ): void {
    ctx.drawImage(sourceCanvas, x, y);
  }

  public clearRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.clearRect(x, y, width, height);
  }

  public fillRectangle(
    ctx: CanvasRenderingContext2D,
    color: string,
    rectangle: Rectangle
  ): void {
    DrawHelper.fillRectangle(ctx, color, rectangle);
  }

  public drawBorder(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    width: number,
    height: number,
    color: string,
    borderWidth: number,
    style: Gradient3DBorderStyleEnum
  ): void {
    DrawHelper.drawBorder(
      ctx,
      left,
      top,
      width,
      height,
      color,
      borderWidth,
      style
    );
  }

  public drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    font: string,
    fontSize: number,
    color: string,
    textAlignment: TextAlignmentEnum,
    baselineAlignment: BaselineAlignmentEnum
  ): void {
    DrawHelper.drawText(
      ctx,
      text,
      x,
      y,
      width,
      height,
      font,
      fontSize,
      color,
      textAlignment,
      baselineAlignment
    );
  }

  public save(ctx: CanvasRenderingContext2D): void {
    ctx.save();
  }

  public restore(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  public setGlobalAlpha(ctx: CanvasRenderingContext2D, alpha: number): void {
    ctx.globalAlpha = alpha;
  }

  public setFillStyle(ctx: CanvasRenderingContext2D, style: string): void {
    ctx.fillStyle = style;
  }

  public fillRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.fillRect(x, y, width, height);
  }
}

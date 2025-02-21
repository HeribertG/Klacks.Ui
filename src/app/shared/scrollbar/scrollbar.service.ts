import { Injectable } from '@angular/core';
import { DrawHelper } from '../../helpers/draw-helper';
import { GridColorService } from '../../grid/services/grid-color.service';
import { IImagesThumps } from '../h-scrollbar/h-scrollbar.component';
import { SCROLLBAR_CONSTANTS } from './constants';

@Injectable()
export class ScrollbarService {
  constructor(private gridColor: GridColorService) {}
  public scrollTrackColorDark = DrawHelper.GetDarkColor(
    this.gridColor.scrollTrack,
    20
  );
  public scrollTrackColor = this.gridColor.scrollTrack;
  public trackColor = this.gridColor.controlBackGroundColor;
  public triangleTopSvg = `<svg width="10px" height="10px" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
  <path d="
    M4,17.32
    L16,17.32
    A2,2 0 0 0 18,13.856
    L12,3.464
    A2,2 0 0 0 8,3.464
    L2,13.856
    A2,2 0 0 0 4,17.32
    Z" fill="currentColor" stroke="currentColor" stroke-width="1"/>
</svg>`;
  public triangleBottomSvg = `<svg width="10px" height="10px" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
  <path d="
    M4,2.68
    L16,2.68
    A2,2 0 0 1 18,6.144
    L12,16.536
    A2,2 0 0 1 8,16.536
    L2,6.144
    A2,2 0 0 1 4,2.68
    Z" fill="currentColor" stroke="currentColor" stroke-width="1"/>
</svg>`;
  public triangleLeftSvg = `<svg width="10px" height="10px" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
  <path d="
    M17.32,16
    L17.32,4
    A2,2 0 0 0 13.856,2
    L3.464,8
    A2,2 0 0 0 3.464,12
    L13.856,18
    A2,2 0 0 0 17.32,16
    Z" fill="currentColor" stroke="currentColor" stroke-width="1"/>
</svg>`;
  public triangleRightSvg = `<svg width="10px" height="10px" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
  <path d="
    M2.68,16
    L2.68,4
    A2,2 0 0 1 6.144,2
    L16.536,8
    A2,2 0 0 1 16.536,12
    L6.144,18
    A2,2 0 0 1 2.68,16
    Z" fill="currentColor" stroke="currentColor" stroke-width="1"/>
</svg>`;

  public calcMetrics(
    width: number,
    colPercent: number,
    visibleLine: number,
    maxLine: number
  ): IMetrics {
    const res: Metrics = new Metrics();

    if (colPercent > 0) {
      res.thumbLength = Math.round((width * colPercent) / 100);
    }

    if (res.thumbLength < SCROLLBAR_CONSTANTS.MARGINS.MINIMUM_LENGTH) {
      res.thumbLength = SCROLLBAR_CONSTANTS.MARGINS.MINIMUM_LENGTH;
    }

    const invisibleWidth = width - res.thumbLength;
    res.invisibleTicks = maxLine - visibleLine;
    res.visibleTicks = visibleLine;
    res.tickSize = Math.round(invisibleWidth / res.invisibleTicks);

    return res;
  }

  public createThumbHorizontal(value: IMetrics, images: IImagesThumps): void {
    this.createThumb(value, images, true);
  }

  public createThumbVertical(value: IMetrics, images: IImagesThumps): void {
    this.createThumb(value, images, false);
  }

  private createThumb(
    value: IMetrics,
    images: IImagesThumps,
    isHorizontal: boolean
  ): void {
    if (value.thumbLength === -Infinity || value.thumbLength === Infinity) {
      return;
    }

    images.imgThumb = undefined;
    images.imgSelectedThumb = undefined;
    images.invisibleTicks = value.invisibleTicks;

    const canvas = document.createElement('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d', {
      willReadFrequently: true,
    }) as CanvasRenderingContext2D;

    const thumbWidth =
      SCROLLBAR_CONSTANTS.MARGINS.SCROLL -
      SCROLLBAR_CONSTANTS.MARGINS.THUMB * 2;
    if (isHorizontal) {
      canvas.width = value.thumbLength;
      canvas.height = thumbWidth;
    } else {
      canvas.width = thumbWidth;
      canvas.height = value.thumbLength;
    }

    DrawHelper.roundRect(
      ctx,
      0,
      0,
      canvas.width,
      canvas.height,
      SCROLLBAR_CONSTANTS.MARGINS.THUMB * 2
    );

    // Normaler Zustand
    ctx.fillStyle = this.scrollTrackColor;
    ctx.fill();
    images.imgThumb = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Hover Zustand
    ctx.fillStyle = this.scrollTrackColorDark;
    ctx.fill();
    images.imgSelectedThumb = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }
}

export interface IMetrics {
  visibleTicks: number;
  invisibleTicks: number;
  tickSize: number;
  thumbLength: number;
}
export class Metrics implements IMetrics {
  visibleTicks = 0;
  invisibleTicks = 0;
  tickSize = 0;
  thumbLength = 0;
}

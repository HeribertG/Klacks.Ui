import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PixelToPtService {
  private readonly INCH_TO_POINT = 72; // 1 Zoll entspricht 72 Punkten

  pixelToPoint(pixels: number): number {
    const inches = pixels / 96; // 96 ist die Standard-DPI
    return inches * this.INCH_TO_POINT;
  }

  pointToPixel(points: number): number {
    const inches = points / this.INCH_TO_POINT;
    return inches * 96;
  }
}

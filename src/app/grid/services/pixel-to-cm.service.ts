import { Injectable } from '@angular/core';
import { DrawHelper } from 'src/app/helpers/draw-helper';

@Injectable({
  providedIn: 'root',
})
export class PixelToCmService {
  private readonly INCH_TO_CM = 2.54; // 1 Zoll entspricht 2,54 Zentimeter

  // Umrechnung von Pixel in Zentimeter
  pixelToCm(pixels: number): number {
    const inches = pixels / 96; // 96 ist die Standard-DPI
    return inches * this.INCH_TO_CM;
  }

  // Umrechnung von Zentimeter in Pixel
  cmToPixel(cm: number): number {
    const inches = cm / this.INCH_TO_CM;
    return inches * 96;
  }
}

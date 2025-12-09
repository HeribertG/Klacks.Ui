import { Injectable, inject } from '@angular/core';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';

@Injectable()
export class ShiftRowHeaderIconsService {
  private gridColors = inject(GridColorService);

  private _width = 24;
  private _height = 24;

  private _unknownTimePicto: HTMLCanvasElement | undefined;
  private _timeWindowPicto: HTMLCanvasElement | undefined;
  private _shiftSegmentPicto: HTMLCanvasElement | undefined;
  private _containerPicto: HTMLCanvasElement | undefined;

  reset(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this._unknownTimePicto = undefined;
    this._timeWindowPicto = undefined;
    this._shiftSegmentPicto = undefined;
    this._containerPicto = undefined;
  }

  get unknownTimePicto(): HTMLCanvasElement | undefined {
    if (this._unknownTimePicto === undefined) {
      this._unknownTimePicto = this.createFromSvg(this.getUnknownTimeSvg());
    }
    return this._unknownTimePicto;
  }

  get timeWindowPicto(): HTMLCanvasElement | undefined {
    if (this._timeWindowPicto === undefined) {
      this._timeWindowPicto = this.createFromSvg(this.getTimeWindowSvg());
    }
    return this._timeWindowPicto;
  }

  get shiftSegmentPicto(): HTMLCanvasElement | undefined {
    if (this._shiftSegmentPicto === undefined) {
      this._shiftSegmentPicto = this.createFromSvg(this.getShiftSegmentSvg());
    }
    return this._shiftSegmentPicto;
  }

  get containerPicto(): HTMLCanvasElement | undefined {
    if (this._containerPicto === undefined) {
      this._containerPicto = this.createFromSvg(this.getContainerSvg());
    }
    return this._containerPicto;
  }

  private createFromSvg(svgString: string): HTMLCanvasElement {
    return DrawHelper.createCanvasFromSvgStringSync(
      svgString,
      this._width,
      this._height,
      (canvas) => {
        this.onIconLoaded(canvas);
      }
    );
  }

  private onIconLoaded(_canvas: HTMLCanvasElement): void {
    // Icons are loaded asynchronously, the canvas will be updated when ready
  }

  private getUnknownTimeSvg(): string {
    const color = this.gridColors.mainFontColor;
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m22 12-2 0" />
        <path d="m4 12-2 0" />
        <path opacity="0.5" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke-width="2" />
        <path opacity="0.5" d="M12 17h.01" stroke-width="2.5" />
      </svg>
    `;
  }

  private getTimeWindowSvg(): string {
    const color = this.gridColors.mainFontColor;
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m22 12-2 0" />
        <path d="m4 12-2 0" />
        <path d="M 12 12 L 12 2 A 10 10 0 0 0 2 12 Z" fill="${color}" fill-opacity="0.3" stroke-width="0" />
      </svg>
    `;
  }

  private getShiftSegmentSvg(): string {
    const color = this.gridColors.mainFontColor;
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" opacity="0.3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke-width="2.5" />
        <path d="M12 12V5" />
        <path d="M12 12H19" />
      </svg>
    `;
  }

  private getContainerSvg(): string {
    const color = this.gridColors.mainFontColor;
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m3.27 6.96 8.73-5.05 8.73 5.05-8.73 5.05-8.73-5.05z" fill="currentColor" fill-opacity="0.1" stroke="none" />
        <path d="M12 12v10.08l8.73-5.05V7l-8.73 5.05z" fill="currentColor" fill-opacity="0.3" stroke="none" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="m3.27 6.96 8.73 5.05" />
        <path d="m12 22.08V12" />
      </svg>
    `;
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service providing cached icon images for shift type indicators.
 * Pre-renders icons (sporadic, time window, shift segment, container)
 * as canvas elements for efficient drawing in row headers.
 *
 * @relations
 * - Used by: ShiftCreateRowHeaderService
 * - Uses: Icon components for SVG sources
 * - Uses: GridColorService for icon colors
 */
import { Injectable, inject } from '@angular/core';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { IconBoxContainerComponent } from 'src/app/presentation/icons/icon-box-container.component';
import { IconShiftSegmentComponent } from 'src/app/presentation/icons/icon-shift-segment.component';
import { IconTimeWindowComponent } from 'src/app/presentation/icons/icon-time-window.component';
import { IconUnknownTimeComponent } from 'src/app/presentation/icons/icon-unknown-time.component';

@Injectable()
export class ShiftRowHeaderIconsService {
  private gridColors = inject(GridColorService);

  private _width = 24;
  private _height = 24;

  private _unknownTimePicto: HTMLCanvasElement | undefined;
  private _timeWindowPicto: HTMLCanvasElement | undefined;
  private _shiftSegmentPicto: HTMLCanvasElement | undefined;
  private _containerPicto: HTMLCanvasElement | undefined;
  private _iconColor = '';

  reset(width: number, height: number): void {
    if (this._width === width && this._height === height) {
      return;
    }
    this._width = width;
    this._height = height;
    this.clearIcons();
  }

  private ensureColor(): void {
    const color = this.gridColors.headerForeGroundColor;
    if (this._iconColor !== color) {
      this._iconColor = color;
      this.clearIcons();
    }
  }

  private clearIcons(): void {
    this._unknownTimePicto = undefined;
    this._timeWindowPicto = undefined;
    this._shiftSegmentPicto = undefined;
    this._containerPicto = undefined;
  }

  get unknownTimePicto(): HTMLCanvasElement | undefined {
    this.ensureColor();
    if (this._unknownTimePicto === undefined) {
      this._unknownTimePicto = this.createFromSvg(
        IconUnknownTimeComponent.getSvg(this._iconColor)
      );
    }
    return this._unknownTimePicto;
  }

  get timeWindowPicto(): HTMLCanvasElement | undefined {
    this.ensureColor();
    if (this._timeWindowPicto === undefined) {
      this._timeWindowPicto = this.createFromSvg(
        IconTimeWindowComponent.getSvg(this._iconColor)
      );
    }
    return this._timeWindowPicto;
  }

  get shiftSegmentPicto(): HTMLCanvasElement | undefined {
    this.ensureColor();
    if (this._shiftSegmentPicto === undefined) {
      this._shiftSegmentPicto = this.createFromSvg(
        IconShiftSegmentComponent.getSvg(this._iconColor)
      );
    }
    return this._shiftSegmentPicto;
  }

  get containerPicto(): HTMLCanvasElement | undefined {
    this.ensureColor();
    if (this._containerPicto === undefined) {
      this._containerPicto = this.createFromSvg(
        IconBoxContainerComponent.getSvg(this._iconColor)
      );
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

  private onIconLoaded(_canvas: HTMLCanvasElement): void {}
}

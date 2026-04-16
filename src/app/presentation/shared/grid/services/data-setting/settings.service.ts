// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal, inject } from '@angular/core';
import {
  ClipboardModeEnum,
  GridSelectionModeEnum,
} from 'src/app/presentation/shared/grid/enums/divers';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';

@Injectable()
export class BaseSettingsService {
  private gridFonts = inject(GridFontsService);

  public zoomSignal = signal<number>(1);
  public timelineMode = signal<boolean>(false);

  private _isTimelineMode = false;

  private readonly TABLE_CELL_HEIGHT = 50;
  private readonly TIMELINE_CELL_HEIGHT_MULTIPLIER = 6;

  public get isTimelineMode(): boolean {
    return this._isTimelineMode;
  }

  clipboardMode: ClipboardModeEnum = ClipboardModeEnum.All;
  selectionMode: GridSelectionModeEnum = GridSelectionModeEnum.Cell;
  editable = false;

  private _zoom = 1;

  InfoSpotWidth = 70 * this._zoom;
  headerBorderWidth = 2;
  cellHeight = this.TABLE_CELL_HEIGHT * this._zoom;
  cellWidth = 90 * this._zoom;
  cellHeaderHeight = 30 * this._zoom;
  increaseBorder = 0.5;
  borderWidth = 1;
  boundaryBorderWidth = 2 * this._zoom;
  anchorWidth = 10 * this._zoom;
  rowHeaderIconWith = 20 * this._zoom;
  rowHeaderIconHeight = 20 * this._zoom;
  hasHeader = true;

  get zoom(): number {
    return this._zoom;
  }
  set zoom(value: number) {
    this._zoom = value;
    this.gridFonts.zoom = value;
    this.InfoSpotWidth = 70 * this._zoom;
    this.cellHeight = this.computeCellHeight();
    this.cellWidth = Math.round(90 * this._zoom);
    this.cellHeaderHeight = 30 * this._zoom;
    this.boundaryBorderWidth = 2 * this._zoom;

    if (this.boundaryBorderWidth < 2) {
      this.boundaryBorderWidth = 2;
    }

    this.anchorWidth = 10 * this._zoom;
    this.rowHeaderIconWith = 20 * this._zoom;
    this.rowHeaderIconHeight = 20 * this._zoom;

    this.zoomSignal.set(value);
  }

  setTimelineMode(enabled: boolean): void {
    this._isTimelineMode = enabled;
    this.timelineMode.set(enabled);
    this.cellHeight = this.computeCellHeight();
  }

  private computeCellHeight(): number {
    const base = this.TABLE_CELL_HEIGHT * this._zoom;
    return this._isTimelineMode
      ? base * this.TIMELINE_CELL_HEIGHT_MULTIPLIER
      : base;
  }

  getGroupLineHeight(neededRows: number): number {
    const rows = this._isTimelineMode ? 1 : neededRows;
    return this.cellHeight * rows + this.increaseBorder;
  }
}

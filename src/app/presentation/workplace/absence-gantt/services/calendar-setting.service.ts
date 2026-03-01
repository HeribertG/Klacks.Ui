// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { EventEmitter, Injectable, Output } from '@angular/core';
import { IRowHeaderSettings } from 'src/app/presentation/shared/grid/row-header/row-header-settings.interface';

@Injectable()
export class CalendarSettingService implements IRowHeaderSettings {
  @Output() zoomChangingEvent = new EventEmitter();

  private readonly BASE_CELL_WIDTH = 8;

  cellHeight = 45;
  cellWidth = this.BASE_CELL_WIDTH;
  cellHeaderHeight = 55;
  increaseBorder = 0.5;
  borderWidth = 1;
  anchorWidth = 10;

  private _zoom = 1;

  constructor() {}

  get zoom(): number {
    return this._zoom;
  }
  set zoom(value: number) {
    this._zoom = value;
    this.cellWidth = this.BASE_CELL_WIDTH * value;
    this.zoomChangingEvent.emit();
  }
}

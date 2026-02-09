import { EventEmitter, Injectable, Output } from '@angular/core';

@Injectable()
export class CalendarSettingService {
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

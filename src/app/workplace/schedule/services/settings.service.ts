import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ClipboardModeEnum } from 'src/app/grid/enums/divers';
import { GridFontsService } from 'src/app/grid/services/grid-fonts.service';

@Injectable()
export class SettingsService {
  public zoomChangingEvent = new Subject<number>();

  clipboardMode: ClipboardModeEnum = ClipboardModeEnum.All;

  private _zoom = 1;

  InfoSpotWidth = 70 * this._zoom;
  headerBorderWidth = 2;
  cellHeight = 50 * this._zoom;
  cellWidth = 90 * this._zoom;
  cellHeaderHeight = 30 * this._zoom;
  increaseBorder = 0.5;
  borderWidth = 1;
  boundaryBorderWidth = 2 * this._zoom; // the boundary line within the table
  anchorWidth = 10 * this._zoom;
  rowHeaderIconWith = 20 * this._zoom;
  rowHeaderIconHeight = 20 * this._zoom;

  constructor(private gridFonts: GridFontsService) {}

  get zoom(): number {
    return this._zoom;
  }
  set zoom(value: number) {
    this._zoom = value;
    this.gridFonts.zoom = value;
    this.InfoSpotWidth = 70 * this._zoom;
    this.cellHeight = 50 * this._zoom;
    this.cellWidth = 90 * this._zoom;
    this.cellHeaderHeight = 30 * this._zoom;
    this.boundaryBorderWidth = 2 * this._zoom;

    // to increase the visibility of the boundary line within the table
    if (this.boundaryBorderWidth < 2) {
      this.boundaryBorderWidth = 2;
    }

    this.anchorWidth = 10 * this._zoom;
    this.rowHeaderIconWith = 20 * this._zoom;
    this.rowHeaderIconHeight = 20 * this._zoom;

    this.zoomChangingEvent.next(value);
  }
}

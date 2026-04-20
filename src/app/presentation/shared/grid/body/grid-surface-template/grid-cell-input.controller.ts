// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Controls the inline cell-input overlay for editable grid cells.
 * Owns the overlay's visibility, position, width and the last-edited
 * (row, column) reference. Extracted from GridSurfaceTemplateComponent
 * so the surface component itself is free of direct overlay state.
 *
 * @param dataService - Grid data access (cell span, is-editable, cell text)
 * @param scroll - Current horizontal and vertical scroll offsets
 * @param settings - Cell geometry and editable flag
 * @param coord - RTL-aware cell-x + span math
 * @param cellManipulation - Initial character captured from keyboard-to-edit
 * @param drawSchedule - Canvas size for visibility calculation
 * @param gridFonts - Font size/family for the overlay
 */
import { inject, Injectable, signal } from '@angular/core';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseDrawScheduleService } from 'src/app/presentation/shared/grid/services/body/draw-schedule.service';
import { BaseCellManipulationService } from '../../services/body/cell-manipulation.service';
import { GridFontsService } from '../../services/grid-fonts.service';
import { GridCoordinateService } from '../../services/grid-coordinate.service';
import { CellInputEventsDirective } from '../directives/cell-input-events.directive';

export interface CellInputSaveEvent {
  row: number;
  column: number;
  value: string;
}

@Injectable()
export class GridCellInputController {
  private readonly dataService = inject(BaseDataService);
  private readonly scroll = inject(ScrollService);
  private readonly settings = inject(BaseSettingsService);
  private readonly coord = inject(GridCoordinateService);
  private readonly cellManipulation = inject(BaseCellManipulationService);
  private readonly drawSchedule = inject(BaseDrawScheduleService);
  private readonly gridFonts = inject(GridFontsService);

  private readonly _visible = signal(false);
  private readonly _x = signal(0);
  private readonly _y = signal(0);
  private readonly _width = signal(0);
  private readonly _lastRow = signal(-1);
  private readonly _lastColumn = signal(-1);

  readonly visible = this._visible.asReadonly();
  readonly x = this._x.asReadonly();
  readonly y = this._y.asReadonly();
  readonly width = this._width.asReadonly();
  readonly lastRow = this._lastRow.asReadonly();
  readonly lastColumn = this._lastColumn.asReadonly();

  private directive?: CellInputEventsDirective;

  get fontSize(): string {
    return this.gridFonts.mainFontSizeZoom + 'pt';
  }

  get fontFamily(): string {
    return this.gridFonts.mainFontName;
  }

  setDirective(directive: CellInputEventsDirective | undefined): void {
    this.directive = directive;
  }

  refreshForScroll(): void {
    if (!this._visible()) return;
    const pos = this.cellManipulation.positionSignal();
    this.updatePosition(pos.row, pos.column, this.cellManipulation.isEditing());
  }

  refreshForZoom(): void {
    if (!this._visible()) return;
    const pos = this.cellManipulation.positionSignal();
    this.updatePosition(pos.row, pos.column, this.cellManipulation.isEditing());
  }

  updatePosition(row: number, column: number, isEditing: boolean): void {
    if (!this.settings.editable || row < 0 || column < 0) {
      this.hide();
      return;
    }
    if (!isEditing) {
      this.hide();
      return;
    }
    if (!this.dataService.isCellEditable(row, column)) {
      this.hide();
      return;
    }

    const firstVisibleRow = this.scroll.verticalScrollPosition;
    const firstVisibleCol = this.scroll.horizontalScrollPosition;
    const visibleRows = this.calculateVisibleRows();
    const visibleCols = this.calculateVisibleColumns();

    const isInViewport =
      row >= firstVisibleRow &&
      row < firstVisibleRow + visibleRows &&
      column >= firstVisibleCol &&
      column < firstVisibleCol + visibleCols;
    if (!isInViewport) {
      this.hide();
      return;
    }

    const visibleCol = column - firstVisibleCol;
    const x = this.coord.cellX(visibleCol);
    const y =
      (row - firstVisibleRow) * this.settings.cellHeight +
      this.settings.cellHeaderHeight;

    this.show(x, y, row, column);
  }

  show(x: number, y: number, row: number, column: number): void {
    const isNewCell = row !== this._lastRow() || column !== this._lastColumn();

    const gridCell = this.dataService.getCell(row, column);
    const editSpan = gridCell?.colSpan || 1;
    const firstVisibleCol = this.scroll.horizontalScrollPosition;
    const visibleCols = this.calculateVisibleColumns();
    const maxSpan = Math.max(1, visibleCols - (column - firstVisibleCol));
    const clampedSpan = Math.min(editSpan, maxSpan);
    const visibleCol = column - firstVisibleCol;

    this._x.set(this.coord.cellXWithSpan(visibleCol, clampedSpan));
    this._y.set(y);
    this._width.set(clampedSpan * this.settings.cellWidth);
    this._visible.set(true);
    this._lastRow.set(row);
    this._lastColumn.set(column);

    if (isNewCell && this.directive) {
      const initialChar = this.cellManipulation.initialEditChar();
      if (initialChar) {
        this.directive.value = initialChar;
      } else {
        this.directive.value = this.dataService.getItemMainText(row, column);
      }
      setTimeout(() => {
        this.directive?.focus();
        if (!initialChar) {
          this.directive?.select();
        } else {
          this.directive?.moveCursorToEnd();
        }
      }, 0);
    }
  }

  hide(): void {
    this._visible.set(false);
    this._lastRow.set(-1);
    this._lastColumn.set(-1);
  }

  trySave(): CellInputSaveEvent | null {
    if (!this._visible() || this._lastRow() < 0 || this._lastColumn() < 0) {
      return null;
    }
    return {
      row: this._lastRow(),
      column: this._lastColumn(),
      value: this.directive?.value ?? '',
    };
  }

  cancel(): void {
    const row = this._lastRow();
    const column = this._lastColumn();
    if (row >= 0 && column >= 0 && this.directive) {
      this.directive.value = this.dataService.getItemMainText(row, column);
    }
    this.directive?.blur();
  }

  private calculateVisibleColumns(): number {
    if (!this.drawSchedule.isCanvasAvailable()) return 1;
    return Math.ceil(this.drawSchedule.width / this.settings.cellWidth);
  }

  private calculateVisibleRows(): number {
    if (!this.drawSchedule.isCanvasAvailable()) return 1;
    return Math.ceil(this.drawSchedule.height / this.settings.cellHeight);
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * @copyright 2025 Heribert Gasparoli
 * @license Proprietary
 *
 * @description
 * Service managing the fill handle drag operation in schedule grids.
 * Allows users to drag the fill handle to copy schedule entries across
 * multiple columns. Tracks drag state, source entry, and selected columns.
 *
 * @relations
 * - Used by: GridSurfaceTemplateComponent, ScheduleDataService
 * - Works with: BaseCellManipulationService for position tracking
 */
import { Injectable, signal } from '@angular/core';
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';

export interface FillHandleState {
  isDragging: boolean;
  startPosition: MyPosition | null;
  currentColumn: number;
  sourceEntryId: string | null;
  sourceWorkTime: number;
  sourceEntryType: number;
}

@Injectable({
  providedIn: 'root',
})
export class FillHandleService {
  private readonly HANDLE_RADIUS = 5;
  private readonly HANDLE_HIT_AREA = 10;

  private _state: FillHandleState = {
    isDragging: false,
    startPosition: null,
    currentColumn: -1,
    sourceEntryId: null,
    sourceWorkTime: 0,
    sourceEntryType: 0,
  };

  public stateSignal = signal<FillHandleState>(this._state);

  get state(): FillHandleState {
    return this._state;
  }

  get handleRadius(): number {
    return this.HANDLE_RADIUS;
  }

  isDragging(): boolean {
    return this._state.isDragging;
  }

  startDrag(position: MyPosition, entryId: string, workTime: number, entryType = 0): void {
    this._state = {
      isDragging: true,
      startPosition: position,
      currentColumn: position.column,
      sourceEntryId: entryId,
      sourceWorkTime: workTime,
      sourceEntryType: entryType,
    };
    this.stateSignal.set({ ...this._state });
  }

  updateDragColumn(column: number): void {
    if (!this._state.isDragging) return;

    const startCol = this._state.startPosition!.column;
    this._state.currentColumn = column < startCol ? startCol : column;
    this.stateSignal.set({ ...this._state });
  }

  endDrag(): { startColumn: number; endColumn: number; row: number; entryId: string; workTime: number; entryType: number } | null {
    if (!this._state.isDragging || !this._state.startPosition) {
      this.reset();
      return null;
    }

    const result = {
      startColumn: this._state.startPosition.column,
      endColumn: this._state.currentColumn,
      row: this._state.startPosition.row,
      entryId: this._state.sourceEntryId!,
      workTime: this._state.sourceWorkTime,
      entryType: this._state.sourceEntryType,
    };

    this.reset();
    return result;
  }

  reset(): void {
    this._state = {
      isDragging: false,
      startPosition: null,
      currentColumn: -1,
      sourceEntryId: null,
      sourceWorkTime: 0,
      sourceEntryType: 0,
    };
    this.stateSignal.set({ ...this._state });
  }

  isOverFillHandle(
    mouseX: number,
    mouseY: number,
    cellX: number,
    cellY: number,
    cellWidth: number,
    cellHeight: number
  ): boolean {
    const handleCenterX = cellX + cellWidth;
    const handleCenterY = cellY + cellHeight;

    const dx = mouseX - handleCenterX;
    const dy = mouseY - handleCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= this.HANDLE_HIT_AREA;
  }

  getSelectedColumns(): number[] {
    if (!this._state.isDragging || !this._state.startPosition) {
      return [];
    }

    const columns: number[] = [];
    for (let col = this._state.startPosition.column + 1; col <= this._state.currentColumn; col++) {
      columns.push(col);
    }
    return columns;
  }
}

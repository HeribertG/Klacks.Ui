// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Signal-based state container for vertical drag-and-drop of Work/Break cells
 * within the schedule table. Tracks pending/active drag, vertical mouse Y,
 * over-table flag, and move target row/client. The drag axis is strictly
 * vertical: the X coordinate is captured once at drag start and never updated.
 * @param dragThreshold - Pixel distance the mouse must travel before a pending
 *   drag turns into an active drag (separates click from drag, avoids conflict
 *   with draw-select).
 */
import { Injectable, computed, signal } from '@angular/core';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';

export interface ScheduleCellDragSource {
  row: number;
  column: number;
  clientId: string;
  date: Date;
  id: string;
  sourceId: string;
  entryId: string;
  entryType: WorkScheduleEntryType;
  abbreviation: string;
  startTime: string;
  endTime: string;
  startX: number;
  startY: number;
  cellWidth: number;
  cellHeight: number;
  snapshotDataUrl: string | null;
}

export type ScheduleCellDropAction = 'delete' | 'move' | 'cancel';

export interface ScheduleCellDropResult {
  source: ScheduleCellDragSource;
  action: ScheduleCellDropAction;
  targetRow?: number;
  targetClientId?: string;
}

@Injectable({ providedIn: 'root' })
export class ScheduleCellDragDropService {
  private readonly DRAG_THRESHOLD_PX = 5;
  private readonly DRAG_HOLD_MS = 320;

  private _isPending = signal(false);
  private _isDragging = signal(false);
  private _source = signal<ScheduleCellDragSource | null>(null);
  private _pendingStartTime = 0;
  private _currentY = signal(0);
  private _isOverTable = signal(false);
  private _targetRow = signal<number | null>(null);
  private _targetClientId = signal<string | null>(null);
  private _isValidMove = signal(false);

  public readonly isPending = this._isPending.asReadonly();
  public readonly isDragging = this._isDragging.asReadonly();
  public readonly source = this._source.asReadonly();
  public readonly currentY = this._currentY.asReadonly();
  public readonly isOverTable = this._isOverTable.asReadonly();
  public readonly targetRow = this._targetRow.asReadonly();
  public readonly targetClientId = this._targetClientId.asReadonly();
  public readonly isValidMove = this._isValidMove.asReadonly();

  public readonly showDeleteIndicator = computed(() =>
    this._isDragging() && !this._isOverTable(),
  );

  public readonly showMoveIndicator = computed(() =>
    this._isDragging() && this._isOverTable() && this._isValidMove(),
  );

  public readonly showSnapBackIndicator = computed(() =>
    this._isDragging() && this._isOverTable() && !this._isValidMove(),
  );

  tryPrepareDrag(source: ScheduleCellDragSource): void {
    this.cancelPending();
    this._source.set(source);
    this._currentY.set(source.startY);
    this._pendingStartTime = Date.now();
    this._isPending.set(true);
  }

  tryStartFromMove(clientX: number, clientY: number): boolean {
    if (!this._isPending() || this._isDragging()) {
      return false;
    }
    const src = this._source();
    if (!src) {
      return false;
    }
    const dx = clientX - src.startX;
    const dy = clientY - src.startY;
    const movedEnough =
      dx * dx + dy * dy >= this.DRAG_THRESHOLD_PX * this.DRAG_THRESHOLD_PX;
    if (!movedEnough) {
      return false;
    }
    const elapsed = Date.now() - this._pendingStartTime;
    if (elapsed < this.DRAG_HOLD_MS) {
      this.cancelPending();
      return false;
    }
    this._isPending.set(false);
    this._isDragging.set(true);
    this._currentY.set(clientY);
    return true;
  }

  updateDragPosition(clientY: number): void {
    if (!this._isDragging()) return;
    this._currentY.set(clientY);
  }

  setOverTable(isOver: boolean): void {
    if (!this._isDragging()) return;
    this._isOverTable.set(isOver);
    if (!isOver) {
      this._targetRow.set(null);
      this._targetClientId.set(null);
      this._isValidMove.set(false);
    }
  }

  setMoveTarget(row: number, clientId: string, isValid: boolean): void {
    if (!this._isDragging()) return;
    this._targetRow.set(row);
    this._targetClientId.set(clientId);
    this._isValidMove.set(isValid);
  }

  clearMoveTarget(): void {
    this._targetRow.set(null);
    this._targetClientId.set(null);
    this._isValidMove.set(false);
  }

  endDrag(): ScheduleCellDropResult | null {
    if (!this._isDragging()) {
      this.cancelPending();
      return null;
    }
    const src = this._source();
    if (!src) {
      this.resetAll();
      return null;
    }
    const isOver = this._isOverTable();
    const targetRow = this._targetRow();
    const targetClientId = this._targetClientId();
    const isValid = this._isValidMove();

    this.resetAll();

    if (!isOver) {
      return { source: src, action: 'delete' };
    }
    if (isValid && targetRow !== null && targetClientId) {
      return { source: src, action: 'move', targetRow, targetClientId };
    }
    return { source: src, action: 'cancel' };
  }

  cancelDrag(): void {
    this.resetAll();
  }

  cancelPending(): void {
    if (this._isDragging()) return;
    this._isPending.set(false);
    this._source.set(null);
    this._currentY.set(0);
    this._pendingStartTime = 0;
  }

  private resetAll(): void {
    this._isPending.set(false);
    this._isDragging.set(false);
    this._source.set(null);
    this._currentY.set(0);
    this._pendingStartTime = 0;
    this._isOverTable.set(false);
    this._targetRow.set(null);
    this._targetClientId.set(null);
    this._isValidMove.set(false);
  }
}

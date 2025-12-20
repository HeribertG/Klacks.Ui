import { Injectable, signal, computed } from '@angular/core';

export interface ShiftDragData {
  shiftId: string;
  shiftName: string;
  abbreviation: string;
  startShift: string;
  endShift: string;
  workTime: number;
  sourceColumn: number;
}

export interface ShiftDropResult {
  shiftId: string;
  shiftName: string;
  abbreviation: string;
  startShift: string;
  endShift: string;
  workTime: number;
  targetRow: number;
  targetColumn: number;
  targetClientId: string;
  targetDate: Date;
}

@Injectable({ providedIn: 'root' })
export class ShiftToScheduleDragDropService {
  private _isDragging = signal(false);
  private _dragData = signal<ShiftDragData | null>(null);
  private _dragStartX = signal(0);
  private _currentY = signal(0);
  private _isOverScheduleSection = signal(false);
  private _targetRow = signal<number | null>(null);
  private _targetClientId = signal<string | null>(null);
  private _targetDate = signal<Date | null>(null);
  private _isValidDrop = signal(false);

  public readonly isDragging = this._isDragging.asReadonly();
  public readonly dragData = this._dragData.asReadonly();
  public readonly dragStartX = this._dragStartX.asReadonly();
  public readonly currentY = this._currentY.asReadonly();
  public readonly isOverScheduleSection = this._isOverScheduleSection.asReadonly();
  public readonly targetRow = this._targetRow.asReadonly();
  public readonly targetClientId = this._targetClientId.asReadonly();
  public readonly targetDate = this._targetDate.asReadonly();
  public readonly isValidDrop = this._isValidDrop.asReadonly();

  public readonly showInvalidIndicator = computed(() => {
    return this._isDragging() && this._isOverScheduleSection() && !this._isValidDrop();
  });

  public readonly showValidIndicator = computed(() => {
    return this._isDragging() && this._isOverScheduleSection() && this._isValidDrop();
  });

  startDrag(event: MouseEvent, dragData: ShiftDragData): void {
    this._isDragging.set(true);
    this._dragData.set(dragData);
    this._dragStartX.set(event.clientX);
    this._currentY.set(event.clientY);
    this._isOverScheduleSection.set(false);
    this._targetRow.set(null);
    this._targetClientId.set(null);
    this._targetDate.set(null);
    this._isValidDrop.set(false);
  }

  updateDragPosition(clientY: number): void {
    if (!this._isDragging()) return;
    this._currentY.set(clientY);
  }

  setOverScheduleSection(isOver: boolean): void {
    this._isOverScheduleSection.set(isOver);
    if (!isOver) {
      this._targetRow.set(null);
      this._targetClientId.set(null);
      this._targetDate.set(null);
      this._isValidDrop.set(false);
    }
  }

  setDropTarget(row: number, clientId: string, date: Date, isValid: boolean): void {
    this._targetRow.set(row);
    this._targetClientId.set(clientId);
    this._targetDate.set(date);
    this._isValidDrop.set(isValid);
  }

  endDrag(): ShiftDropResult | null {
    if (!this._isDragging()) return null;

    const dragData = this._dragData();
    const targetRow = this._targetRow();
    const targetClientId = this._targetClientId();
    const targetDate = this._targetDate();
    const isValid = this._isValidDrop();

    this.cancelDrag();

    if (!isValid || !dragData || targetRow === null || !targetClientId || !targetDate) {
      return null;
    }

    return {
      shiftId: dragData.shiftId,
      shiftName: dragData.shiftName,
      abbreviation: dragData.abbreviation,
      startShift: dragData.startShift,
      endShift: dragData.endShift,
      workTime: dragData.workTime,
      targetRow,
      targetColumn: dragData.sourceColumn,
      targetClientId,
      targetDate,
    };
  }

  cancelDrag(): void {
    this._isDragging.set(false);
    this._dragData.set(null);
    this._dragStartX.set(0);
    this._currentY.set(0);
    this._isOverScheduleSection.set(false);
    this._targetRow.set(null);
    this._targetClientId.set(null);
    this._targetDate.set(null);
    this._isValidDrop.set(false);
  }
}

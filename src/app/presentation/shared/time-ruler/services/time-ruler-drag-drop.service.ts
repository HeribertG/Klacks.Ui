import { Injectable } from '@angular/core';
import { IShift } from 'src/app/domain/models/shift-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';

export interface DragState {
  isDragging: boolean;
  draggedShift: IShift | null;
  draggedShiftRect: Rectangle | null;
  dragStartMouseY: number | undefined;
  originalStartMinutes: number | undefined;
  originalEndMinutes: number | undefined;
  pixelsPerMinute: number;
  snapToMinutes: number;
  displayFromMinutes: number;
  totalMinutes: number;
}

@Injectable()
export class TimeRulerDragDropService {
  private _dragState: DragState = {
    isDragging: false,
    draggedShift: null,
    draggedShiftRect: null,
    dragStartMouseY: undefined,
    originalStartMinutes: undefined,
    originalEndMinutes: undefined,
    pixelsPerMinute: 0,
    snapToMinutes: 1,
    displayFromMinutes: 0,
    totalMinutes: 0,
  };

  private readonly MINUTES_PER_HOUR = 60;
  private readonly MINUTES_PER_DAY = 24 * 60;

  public get dragState(): DragState {
    return this._dragState;
  }

  public initializeDragState(
    pixelsPerMinute: number,
    snapToMinutes: number,
    displayFromMinutes: number,
    totalMinutes: number
  ): void {
    this._dragState.pixelsPerMinute = pixelsPerMinute;
    this._dragState.snapToMinutes = snapToMinutes;
    this._dragState.displayFromMinutes = displayFromMinutes;
    this._dragState.totalMinutes = totalMinutes;
  }

  public startDrag(
    mouseY: number,
    shift: IShift,
    shiftRect: Rectangle
  ): boolean {
    if (!shift.isTimeRange || !shift.timeRangeStartShift || !shift.timeRangeEndShift) {
      return false;
    }

    const startTime = this.parseTimeString(shift.timeRangeStartShift);
    const endTime = this.parseTimeString(shift.timeRangeEndShift);

    if (!startTime || !endTime) {
      return false;
    }

    let startMinutes =
      startTime.hours * this.MINUTES_PER_HOUR + startTime.minutes;
    let endMinutes = endTime.hours * this.MINUTES_PER_HOUR + endTime.minutes;

    if (endMinutes < startMinutes) {
      endMinutes += this.MINUTES_PER_DAY;
    }

    this._dragState.isDragging = true;
    this._dragState.draggedShift = shift;
    this._dragState.draggedShiftRect = shiftRect;
    this._dragState.dragStartMouseY = mouseY;
    this._dragState.originalStartMinutes = startMinutes;
    this._dragState.originalEndMinutes = endMinutes;

    return true;
  }

  public updateDrag(mouseY: number): {
    newStartMinutes: number;
    newEndMinutes: number;
  } | null {
    if (
      !this._dragState.isDragging ||
      this._dragState.dragStartMouseY === undefined ||
      this._dragState.originalStartMinutes === undefined ||
      this._dragState.originalEndMinutes === undefined
    ) {
      return null;
    }

    const pixelDelta = mouseY - this._dragState.dragStartMouseY;

    const minutesDelta = pixelDelta / this._dragState.pixelsPerMinute;

    const snappedMinutesDelta =
      Math.round(minutesDelta / this._dragState.snapToMinutes) *
      this._dragState.snapToMinutes;

    const duration =
      this._dragState.originalEndMinutes - this._dragState.originalStartMinutes;

    let newStartMinutes =
      this._dragState.originalStartMinutes + snappedMinutesDelta;
    let newEndMinutes = newStartMinutes + duration;

    newStartMinutes = Math.max(
      this._dragState.displayFromMinutes,
      Math.min(
        newStartMinutes,
        this._dragState.displayFromMinutes + this._dragState.totalMinutes - duration
      )
    );
    newEndMinutes = newStartMinutes + duration;

    return {
      newStartMinutes,
      newEndMinutes,
    };
  }

  public endDrag(): {
    shift: IShift;
    newStartTime: string;
    newEndTime: string;
  } | null {
    if (!this._dragState.isDragging || !this._dragState.draggedShift) {
      this.resetDragState();
      return null;
    }

    const shift = this._dragState.draggedShift;
    const originalStartMinutes = this._dragState.originalStartMinutes;
    const originalEndMinutes = this._dragState.originalEndMinutes;

    this.resetDragState();

    if (
      originalStartMinutes === undefined ||
      originalEndMinutes === undefined
    ) {
      return null;
    }

    const newStartTime = shift.timeRangeStartShift;
    const newEndTime = shift.timeRangeEndShift;

    if (!newStartTime || !newEndTime) {
      return null;
    }

    return {
      shift,
      newStartTime,
      newEndTime,
    };
  }

  public cancelDrag(): void {
    this.resetDragState();
  }

  public calculateNewPosition(
    newStartMinutes: number,
    newEndMinutes: number,
    height: number
  ): Rectangle | null {
    if (!this._dragState.draggedShiftRect) {
      return null;
    }

    const startY =
      ((newStartMinutes - this._dragState.displayFromMinutes) /
        this._dragState.totalMinutes) *
      height;
    const endY =
      ((newEndMinutes - this._dragState.displayFromMinutes) /
        this._dragState.totalMinutes) *
      height;

    return new Rectangle(
      this._dragState.draggedShiftRect.left,
      startY,
      this._dragState.draggedShiftRect.right,
      endY
    );
  }

  public formatTimeFromMinutes(totalMinutes: number): string {
    const normalizedMinutes = totalMinutes % this.MINUTES_PER_DAY;
    const hours = Math.floor(normalizedMinutes / this.MINUTES_PER_HOUR);
    const minutes = normalizedMinutes % this.MINUTES_PER_HOUR;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  }

  private resetDragState(): void {
    this._dragState.isDragging = false;
    this._dragState.draggedShift = null;
    this._dragState.draggedShiftRect = null;
    this._dragState.dragStartMouseY = undefined;
    this._dragState.originalStartMinutes = undefined;
    this._dragState.originalEndMinutes = undefined;
  }

  private parseTimeString(
    timeString: string
  ): { hours: number; minutes: number } | null {
    const parts = timeString.split(':');
    if (parts.length < 2) return null;

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) return null;

    return { hours, minutes };
  }
}

import { Injectable, inject } from '@angular/core';
import { IShift } from 'src/app/domain/models/shift-class';
import { IContainerTemplateItem } from 'src/app/domain/models/container-template-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { TimeRangeService } from './time-range.service';

export interface DragState {
  isDragging: boolean;
  draggedShift: IContainerTemplateItem | null;
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
  private timeRangeService = inject(TimeRangeService);

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
    item: IContainerTemplateItem,
    shiftRect: Rectangle
  ): boolean {
    if (!item.shift?.isTimeRange || !item.timeRangeStartShift || !item.timeRangeEndShift) {
      return false;
    }

    const startMinutes = this.timeRangeService.getShiftStartMinutes(item);
    const endMinutes = this.timeRangeService.getShiftEndMinutes(item);

    if (startMinutes === 0 && endMinutes === 0) {
      return false;
    }

    this._dragState.isDragging = true;
    this._dragState.draggedShift = item;
    this._dragState.draggedShiftRect = shiftRect;
    this._dragState.dragStartMouseY = mouseY;
    this._dragState.originalStartMinutes = startMinutes;
    this._dragState.originalEndMinutes = endMinutes;

    return true;
  }

  public updateDrag(
    mouseY: number,
    allShifts: any[]
  ): {
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

    const adjustedPosition = this.resolveOverlaps(
      newStartMinutes,
      newEndMinutes,
      allShifts
    );

    return adjustedPosition;
  }

  public resolveOverlapsForShift(
    startMinutes: number,
    endMinutes: number,
    currentItem: IContainerTemplateItem,
    allItems: IContainerTemplateItem[]
  ): {
    newStartMinutes: number;
    newEndMinutes: number;
  } {
    const duration = endMinutes - startMinutes;

    const otherItems = allItems.filter(
      (item) => item !== currentItem && item.shift?.isTimeRange
    );

    if (otherItems.length === 0) {
      return { newStartMinutes: startMinutes, newEndMinutes: endMinutes };
    }

    if (!this.hasOverlap(startMinutes, endMinutes, otherItems)) {
      return { newStartMinutes: startMinutes, newEndMinutes: endMinutes };
    }

    const snapAbove = this.findSnapPositionAbove(
      startMinutes,
      endMinutes,
      duration,
      otherItems
    );
    const snapBelow = this.findSnapPositionBelow(
      startMinutes,
      endMinutes,
      duration,
      otherItems
    );

    const distanceAbove = snapAbove
      ? Math.abs(snapAbove.newStartMinutes - startMinutes)
      : Infinity;
    const distanceBelow = snapBelow
      ? Math.abs(snapBelow.newStartMinutes - startMinutes)
      : Infinity;

    if (distanceAbove < distanceBelow && snapAbove) {
      return snapAbove;
    } else if (snapBelow) {
      return snapBelow;
    } else if (snapAbove) {
      return snapAbove;
    }

    return { newStartMinutes: startMinutes, newEndMinutes: endMinutes };
  }

  private resolveOverlaps(
    startMinutes: number,
    endMinutes: number,
    allShifts: any[]
  ): {
    newStartMinutes: number;
    newEndMinutes: number;
  } {
    const draggedShift = this._dragState.draggedShift;
    if (!draggedShift) {
      return { newStartMinutes: startMinutes, newEndMinutes: endMinutes };
    }
    return this.resolveOverlapsForShift(startMinutes, endMinutes, draggedShift, allShifts);
  }

  private findSnapPositionAbove(
    startMinutes: number,
    endMinutes: number,
    duration: number,
    otherShifts: any[]
  ): { newStartMinutes: number; newEndMinutes: number } | null {
    const conflictingShifts = otherShifts.filter((shift) =>
      this.shiftsOverlap(
        startMinutes,
        endMinutes,
        this.timeRangeService.getShiftStartMinutes(shift),
        this.timeRangeService.getShiftEndMinutes(shift)
      )
    );

    if (conflictingShifts.length === 0) {
      return null;
    }

    const lowestConflictStart = Math.min(
      ...conflictingShifts.map((s) => this.timeRangeService.getShiftStartMinutes(s))
    );

    let candidateEnd = lowestConflictStart;
    let candidateStart = candidateEnd - duration;

    if (candidateStart < this._dragState.displayFromMinutes) {
      return null;
    }

    let iterations = 0;
    const maxIterations = 100;

    while (
      this.hasOverlap(candidateStart, candidateEnd, otherShifts) &&
      iterations < maxIterations
    ) {
      const blockingShifts = otherShifts.filter((shift) =>
        this.shiftsOverlap(
          candidateStart,
          candidateEnd,
          this.timeRangeService.getShiftStartMinutes(shift),
          this.timeRangeService.getShiftEndMinutes(shift)
        )
      );

      if (blockingShifts.length === 0) break;

      const nextStart = Math.min(
        ...blockingShifts.map((s) => this.timeRangeService.getShiftStartMinutes(s))
      );

      candidateEnd = nextStart;
      candidateStart = candidateEnd - duration;

      if (candidateStart < this._dragState.displayFromMinutes) {
        return null;
      }

      iterations++;
    }

    if (iterations >= maxIterations) {
      return null;
    }

    if (!this.hasOverlap(candidateStart, candidateEnd, otherShifts)) {
      return {
        newStartMinutes: candidateStart,
        newEndMinutes: candidateEnd,
      };
    }

    return null;
  }

  private findSnapPositionBelow(
    startMinutes: number,
    endMinutes: number,
    duration: number,
    otherShifts: any[]
  ): { newStartMinutes: number; newEndMinutes: number } | null {
    const conflictingShifts = otherShifts.filter((shift) =>
      this.shiftsOverlap(
        startMinutes,
        endMinutes,
        this.timeRangeService.getShiftStartMinutes(shift),
        this.timeRangeService.getShiftEndMinutes(shift)
      )
    );

    if (conflictingShifts.length === 0) {
      return null;
    }

    const highestConflictEnd = Math.max(
      ...conflictingShifts.map((s) => this.timeRangeService.getShiftEndMinutes(s))
    );

    let candidateStart = highestConflictEnd;
    let candidateEnd = candidateStart + duration;

    if (
      candidateEnd >
      this._dragState.displayFromMinutes + this._dragState.totalMinutes
    ) {
      return null;
    }

    let iterations = 0;
    const maxIterations = 100;

    while (
      this.hasOverlap(candidateStart, candidateEnd, otherShifts) &&
      iterations < maxIterations
    ) {
      const blockingShifts = otherShifts.filter((shift) =>
        this.shiftsOverlap(
          candidateStart,
          candidateEnd,
          this.timeRangeService.getShiftStartMinutes(shift),
          this.timeRangeService.getShiftEndMinutes(shift)
        )
      );

      if (blockingShifts.length === 0) break;

      const nextEnd = Math.max(
        ...blockingShifts.map((s) => this.timeRangeService.getShiftEndMinutes(s))
      );

      candidateStart = nextEnd;
      candidateEnd = candidateStart + duration;

      if (
        candidateEnd >
        this._dragState.displayFromMinutes + this._dragState.totalMinutes
      ) {
        return null;
      }

      iterations++;
    }

    if (iterations >= maxIterations) {
      return null;
    }

    if (!this.hasOverlap(candidateStart, candidateEnd, otherShifts)) {
      return {
        newStartMinutes: candidateStart,
        newEndMinutes: candidateEnd,
      };
    }

    return null;
  }

  private hasOverlap(
    startMinutes: number,
    endMinutes: number,
    shifts: any[]
  ): boolean {
    return shifts.some((shift) =>
      this.shiftsOverlap(
        startMinutes,
        endMinutes,
        this.timeRangeService.getShiftStartMinutes(shift),
        this.timeRangeService.getShiftEndMinutes(shift)
      )
    );
  }

  private shiftsOverlap(
    start1: number,
    end1: number,
    start2: number,
    end2: number
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  public endDrag(): {
    shift: IContainerTemplateItem;
    newStartTime: string;
    newEndTime: string;
  } | null {
    if (!this._dragState.isDragging || !this._dragState.draggedShift) {
      this.resetDragState();
      return null;
    }

    const item = this._dragState.draggedShift;
    const originalStartMinutes = this._dragState.originalStartMinutes;
    const originalEndMinutes = this._dragState.originalEndMinutes;

    this.resetDragState();

    if (
      originalStartMinutes === undefined ||
      originalEndMinutes === undefined
    ) {
      return null;
    }

    const newStartTime = item.timeRangeStartShift;
    const newEndTime = item.timeRangeEndShift;

    if (!newStartTime || !newEndTime) {
      return null;
    }

    return {
      shift: item,
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
    return this.timeRangeService.formatTime(totalMinutes) + ':00';
  }

  private resetDragState(): void {
    this._dragState.isDragging = false;
    this._dragState.draggedShift = null;
    this._dragState.draggedShiftRect = null;
    this._dragState.dragStartMouseY = undefined;
    this._dragState.originalStartMinutes = undefined;
    this._dragState.originalEndMinutes = undefined;
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { formatTimeFromMinutes as formatTimeFromMinutesHelper } from 'src/app/shared/helpers/time-format.helper';
import { TimeRangeService } from './time-range.service';

interface SnapDirection {
  getEffectiveEdge: (shift: IContainerTemplateItem, timeRangeService: TimeRangeService) => number;
  aggregate: typeof Math.min | typeof Math.max;
  boundaryCheck: (edge: number, boundary: number) => boolean;
  computeCandidate: (edge: number, pre: number, post: number, duration: number) => { start: number; end: number; effectiveStart: number; effectiveEnd: number };
}

const SNAP_ABOVE: SnapDirection = {
  getEffectiveEdge: (shift, timeRangeService) => timeRangeService.getEffectiveStartMinutes(shift),
  aggregate: Math.min,
  boundaryCheck: (effectiveStart, boundary) => effectiveStart < boundary,
  computeCandidate: (edge, pre, post, duration) => {
    const effectiveEnd = edge;
    const end = effectiveEnd - post;
    const start = end - duration;
    const effectiveStart = start - pre;
    return { start, end, effectiveStart, effectiveEnd };
  },
};

const SNAP_BELOW: SnapDirection = {
  getEffectiveEdge: (shift, timeRangeService) => timeRangeService.getEffectiveEndMinutes(shift),
  aggregate: Math.max,
  boundaryCheck: (effectiveEnd, boundary) => effectiveEnd > boundary,
  computeCandidate: (edge, pre, post, duration) => {
    const effectiveStart = edge;
    const start = effectiveStart + pre;
    const end = start + duration;
    const effectiveEnd = end + post;
    return { start, end, effectiveStart, effectiveEnd };
  },
};

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
  private readonly SNAP_THRESHOLD_PIXELS = 5;

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
    if (
      !item.shift?.isTimeRange ||
      !item.timeRangeStartItem ||
      !item.timeRangeEndItem
    ) {
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
        this._dragState.displayFromMinutes +
          this._dragState.totalMinutes -
          duration
      )
    );
    newEndMinutes = newStartMinutes + duration;

    const snappedToEdge = this.applySnapToEdge(
      newStartMinutes,
      newEndMinutes,
      allShifts
    );

    if (snappedToEdge) {
      return snappedToEdge;
    }

    const adjustedPosition = this.resolveOverlaps(
      newStartMinutes,
      newEndMinutes,
      allShifts
    );

    return adjustedPosition;
  }

  private applySnapToEdge(
    startMinutes: number,
    endMinutes: number,
    allShifts: IContainerTemplateItem[]
  ): { newStartMinutes: number; newEndMinutes: number } | null {
    const draggedShift = this._dragState.draggedShift;
    if (!draggedShift) return null;

    const snapThresholdMinutes =
      this.SNAP_THRESHOLD_PIXELS / this._dragState.pixelsPerMinute;
    const preShiftTime =
      this.timeRangeService.getTotalPreShiftMinutes(draggedShift);
    const postShiftTime =
      this.timeRangeService.getTotalPostShiftMinutes(draggedShift);
    const duration = endMinutes - startMinutes;

    const effectiveStart = startMinutes - preShiftTime;
    const effectiveEnd = endMinutes + postShiftTime;

    const otherItems = allShifts.filter(
      (item) => item !== draggedShift && item.shift?.isTimeRange
    );

    let closestSnap: {
      newStartMinutes: number;
      newEndMinutes: number;
      distance: number;
    } | null = null;

    for (const other of otherItems) {
      const otherEffectiveStart =
        this.timeRangeService.getEffectiveStartMinutes(other);
      const otherEffectiveEnd =
        this.timeRangeService.getEffectiveEndMinutes(other);

      const distanceToTop = effectiveEnd - otherEffectiveStart;
      if (
        distanceToTop > 0 &&
        distanceToTop <= snapThresholdMinutes &&
        effectiveStart < otherEffectiveStart
      ) {
        const newEffectiveEnd = otherEffectiveStart;
        const newEnd = newEffectiveEnd - postShiftTime;
        const newStart = newEnd - duration;

        if (
          !closestSnap ||
          Math.abs(distanceToTop) < Math.abs(closestSnap.distance)
        ) {
          closestSnap = {
            newStartMinutes: newStart,
            newEndMinutes: newEnd,
            distance: distanceToTop,
          };
        }
      }

      const distanceToBottom = otherEffectiveEnd - effectiveStart;
      if (
        distanceToBottom > 0 &&
        distanceToBottom <= snapThresholdMinutes &&
        effectiveEnd > otherEffectiveEnd
      ) {
        const newEffectiveStart = otherEffectiveEnd;
        const newStart = newEffectiveStart + preShiftTime;
        const newEnd = newStart + duration;

        if (
          !closestSnap ||
          Math.abs(distanceToBottom) < Math.abs(closestSnap.distance)
        ) {
          closestSnap = {
            newStartMinutes: newStart,
            newEndMinutes: newEnd,
            distance: distanceToBottom,
          };
        }
      }
    }

    if (closestSnap) {
      return {
        newStartMinutes: closestSnap.newStartMinutes,
        newEndMinutes: closestSnap.newEndMinutes,
      };
    }

    return null;
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
    const preShiftTime =
      this.timeRangeService.getTotalPreShiftMinutes(currentItem);
    const postShiftTime =
      this.timeRangeService.getTotalPostShiftMinutes(currentItem);

    const otherItems = allItems.filter(
      (item) => item !== currentItem && item.shift?.isTimeRange
    );

    if (otherItems.length === 0) {
      return { newStartMinutes: startMinutes, newEndMinutes: endMinutes };
    }

    const effectiveStart = startMinutes - preShiftTime;
    const effectiveEnd = endMinutes + postShiftTime;

    if (!this.hasEffectiveOverlap(effectiveStart, effectiveEnd, otherItems)) {
      return { newStartMinutes: startMinutes, newEndMinutes: endMinutes };
    }

    const snapAbove = this.findSnapPositionAbove(
      startMinutes,
      endMinutes,
      duration,
      otherItems,
      preShiftTime,
      postShiftTime
    );
    const snapBelow = this.findSnapPositionBelow(
      startMinutes,
      endMinutes,
      duration,
      otherItems,
      preShiftTime,
      postShiftTime
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
    return this.resolveOverlapsForShift(
      startMinutes,
      endMinutes,
      draggedShift,
      allShifts
    );
  }

  private findSnapPositionAbove(
    startMinutes: number,
    endMinutes: number,
    duration: number,
    otherShifts: IContainerTemplateItem[],
    preShiftTime = 0,
    postShiftTime = 0
  ): { newStartMinutes: number; newEndMinutes: number } | null {
    return this.findSnapPosition(
      SNAP_ABOVE,
      startMinutes,
      endMinutes,
      duration,
      otherShifts,
      preShiftTime,
      postShiftTime
    );
  }

  private findSnapPositionBelow(
    startMinutes: number,
    endMinutes: number,
    duration: number,
    otherShifts: IContainerTemplateItem[],
    preShiftTime = 0,
    postShiftTime = 0
  ): { newStartMinutes: number; newEndMinutes: number } | null {
    return this.findSnapPosition(
      SNAP_BELOW,
      startMinutes,
      endMinutes,
      duration,
      otherShifts,
      preShiftTime,
      postShiftTime
    );
  }

  private findSnapPosition(
    direction: SnapDirection,
    startMinutes: number,
    endMinutes: number,
    duration: number,
    otherShifts: IContainerTemplateItem[],
    preShiftTime: number,
    postShiftTime: number
  ): { newStartMinutes: number; newEndMinutes: number } | null {
    const effectiveStart = startMinutes - preShiftTime;
    const effectiveEnd = endMinutes + postShiftTime;

    const conflictingShifts = otherShifts.filter((shift) =>
      this.effectiveShiftsOverlap(effectiveStart, effectiveEnd, shift)
    );

    if (conflictingShifts.length === 0) {
      return null;
    }

    const boundaryEdge = direction.aggregate(
      ...conflictingShifts.map((s) =>
        direction.getEffectiveEdge(s, this.timeRangeService)
      )
    );

    let candidate = direction.computeCandidate(
      boundaryEdge,
      preShiftTime,
      postShiftTime,
      duration
    );

    const displayBoundary =
      direction === SNAP_ABOVE
        ? this._dragState.displayFromMinutes
        : this._dragState.displayFromMinutes + this._dragState.totalMinutes;

    const checkEdge =
      direction === SNAP_ABOVE
        ? candidate.effectiveStart
        : candidate.effectiveEnd;

    if (direction.boundaryCheck(checkEdge, displayBoundary)) {
      return null;
    }

    let iterations = 0;
    const maxIterations = 100;

    while (
      this.hasEffectiveOverlap(
        candidate.effectiveStart,
        candidate.effectiveEnd,
        otherShifts
      ) &&
      iterations < maxIterations
    ) {
      const blockingShifts = otherShifts.filter((shift) =>
        this.effectiveShiftsOverlap(
          candidate.effectiveStart,
          candidate.effectiveEnd,
          shift
        )
      );

      if (blockingShifts.length === 0) break;

      const nextEdge = direction.aggregate(
        ...blockingShifts.map((s) =>
          direction.getEffectiveEdge(s, this.timeRangeService)
        )
      );

      candidate = direction.computeCandidate(
        nextEdge,
        preShiftTime,
        postShiftTime,
        duration
      );

      const iterCheckEdge =
        direction === SNAP_ABOVE
          ? candidate.effectiveStart
          : candidate.effectiveEnd;

      if (direction.boundaryCheck(iterCheckEdge, displayBoundary)) {
        return null;
      }

      iterations++;
    }

    if (iterations >= maxIterations) {
      return null;
    }

    if (
      !this.hasEffectiveOverlap(
        candidate.effectiveStart,
        candidate.effectiveEnd,
        otherShifts
      )
    ) {
      return {
        newStartMinutes: candidate.start,
        newEndMinutes: candidate.end,
      };
    }

    return null;
  }

  private hasOverlap(
    startMinutes: number,
    endMinutes: number,
    shifts: IContainerTemplateItem[]
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

  private hasEffectiveOverlap(
    effectiveStart: number,
    effectiveEnd: number,
    shifts: IContainerTemplateItem[]
  ): boolean {
    return shifts.some((shift) =>
      this.effectiveShiftsOverlap(effectiveStart, effectiveEnd, shift)
    );
  }

  private effectiveShiftsOverlap(
    effectiveStart: number,
    effectiveEnd: number,
    otherShift: IContainerTemplateItem
  ): boolean {
    const otherEffectiveStart =
      this.timeRangeService.getEffectiveStartMinutes(otherShift);
    const otherEffectiveEnd =
      this.timeRangeService.getEffectiveEndMinutes(otherShift);
    return (
      effectiveStart < otherEffectiveEnd && effectiveEnd > otherEffectiveStart
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

    const newStartTime = item.timeRangeStartItem;
    const newEndTime = item.timeRangeEndItem;

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
    return formatTimeFromMinutesHelper(totalMinutes);
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

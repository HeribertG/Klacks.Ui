// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for drag-drop operations on the time ruler canvas with dynamic item displacement.
 * @param timeRangeService - Calculates effective start/end minutes including pre/post shift times
 */
import { Injectable, inject } from '@angular/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { formatTimeFromMinutes as formatTimeFromMinutesHelper } from 'src/app/shared/helpers/time-format.helper';
import { TimeRangeService } from './time-range.service';
import { TimeRulerBlockSelectionService } from './time-ruler-block-selection.service';

interface SnapDirection {
  getEffectiveEdge: (startMinutes: number, endMinutes: number, timeRangeService: TimeRangeService, item: IContainerTemplateItem) => number;
  aggregate: typeof Math.min | typeof Math.max;
  boundaryCheck: (edge: number, boundary: number) => boolean;
  computeCandidate: (edge: number, pre: number, post: number, duration: number) => { start: number; end: number; effectiveStart: number; effectiveEnd: number };
}

const SNAP_ABOVE: SnapDirection = {
  getEffectiveEdge: (startMinutes, _endMinutes, timeRangeService, item) =>
    startMinutes - timeRangeService.getTotalPreShiftMinutes(item),
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
  getEffectiveEdge: (_startMinutes, endMinutes, timeRangeService, item) =>
    endMinutes + timeRangeService.getTotalPostShiftMinutes(item),
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

export interface ItemPosition {
  startMinutes: number;
  endMinutes: number;
}

export interface DragUpdateResult {
  draggedPosition: { newStartMinutes: number; newEndMinutes: number };
  displacements: Map<IContainerTemplateItem, ItemPosition>;
}

export interface DragState {
  isDragging: boolean;
  draggedShift: IContainerTemplateItem | null;
  draggedShiftRect: Rectangle | null;
  dragStartMouseY: number | undefined;
  originalStartMinutes: number | undefined;
  originalEndMinutes: number | undefined;
  originalPositions: Map<IContainerTemplateItem, ItemPosition>;
  pixelsPerMinute: number;
  snapToMinutes: number;
  displayFromMinutes: number;
  totalMinutes: number;
  isBlockDrag: boolean;
  blockItems: Set<IContainerTemplateItem>;
  blockOriginalPositions: Map<IContainerTemplateItem, ItemPosition>;
  blockEffectiveStart: number;
  blockEffectiveEnd: number;
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
    originalPositions: new Map(),
    pixelsPerMinute: 0,
    snapToMinutes: 1,
    displayFromMinutes: 0,
    totalMinutes: 0,
    isBlockDrag: false,
    blockItems: new Set(),
    blockOriginalPositions: new Map(),
    blockEffectiveStart: 0,
    blockEffectiveEnd: 0,
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
    shiftRect: Rectangle,
    allShifts: IContainerTemplateItem[]
  ): boolean {
    const isAbsence = !!item.absenceId;
    const isTimeRange = !!item.shift?.isTimeRange;

    if (isAbsence) {
      if (!item.startItem || !item.endItem) {
        return false;
      }
    } else if (!isTimeRange || !item.timeRangeStartItem || !item.timeRangeEndItem) {
      return false;
    }

    if (!this.timeRangeService.hasExplicitTimes(item)) {
      return false;
    }

    const startMinutes = this.timeRangeService.getShiftStartMinutes(item);
    const endMinutes = this.timeRangeService.getShiftEndMinutes(item);

    this._dragState.isDragging = true;
    this._dragState.draggedShift = item;
    this._dragState.draggedShiftRect = shiftRect;
    this._dragState.dragStartMouseY = mouseY;
    this._dragState.originalStartMinutes = startMinutes;
    this._dragState.originalEndMinutes = endMinutes;

    this._dragState.originalPositions.clear();
    for (const shift of allShifts) {
      const shiftStart = this.timeRangeService.getShiftStartMinutes(shift);
      const shiftEnd = this.timeRangeService.getShiftEndMinutes(shift);
      this._dragState.originalPositions.set(shift, {
        startMinutes: shiftStart,
        endMinutes: shiftEnd,
      });
    }

    return true;
  }

  public startBlockDrag(
    mouseY: number,
    anchorItem: IContainerTemplateItem,
    shiftRect: Rectangle,
    allShifts: IContainerTemplateItem[],
    blockSelectionService: TimeRulerBlockSelectionService
  ): boolean {
    const started = this.startDrag(mouseY, anchorItem, shiftRect, allShifts);
    if (!started) return false;

    this._dragState.isBlockDrag = true;
    this._dragState.blockItems = new Set(blockSelectionService.selectedItems());

    const bounds = blockSelectionService.getBlockEffectiveBounds();
    if (bounds) {
      this._dragState.blockEffectiveStart = bounds.effectiveStart;
      this._dragState.blockEffectiveEnd = bounds.effectiveEnd;
    }

    for (const item of this._dragState.blockItems) {
      const start = this.timeRangeService.getShiftStartMinutes(item);
      const end = this.timeRangeService.getShiftEndMinutes(item);
      this._dragState.blockOriginalPositions.set(item, { startMinutes: start, endMinutes: end });
    }

    return true;
  }

  public updateDrag(
    mouseY: number,
    allShifts: IContainerTemplateItem[]
  ): DragUpdateResult | null {
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

    let displacements: Map<IContainerTemplateItem, ItemPosition>;

    if (this._dragState.isBlockDrag) {
      const anchorOrigStart = this._dragState.originalStartMinutes!;
      const blockDelta = newStartMinutes - anchorOrigStart;

      displacements = new Map();

      for (const blockItem of this._dragState.blockItems) {
        if (blockItem === this._dragState.draggedShift) continue;
        const origPos = this._dragState.blockOriginalPositions.get(blockItem);
        if (!origPos) continue;
        const itemDuration = origPos.endMinutes - origPos.startMinutes;
        const newItemStart = origPos.startMinutes + blockDelta;
        const newItemEnd = newItemStart + itemDuration;
        displacements.set(blockItem, { startMinutes: newItemStart, endMinutes: newItemEnd });
      }

      const blockDisplacements = this.calculateBlockDisplacements(
        blockDelta, allShifts
      );
      for (const [item, pos] of blockDisplacements) {
        displacements.set(item, pos);
      }
    } else {
      const snappedToEdge = this.applySnapToEdge(
        newStartMinutes,
        newEndMinutes,
        allShifts
      );

      if (snappedToEdge) {
        newStartMinutes = snappedToEdge.newStartMinutes;
        newEndMinutes = snappedToEdge.newEndMinutes;
      }

      displacements = this.calculateDisplacements(
        newStartMinutes,
        newEndMinutes,
        allShifts
      );
    }

    return {
      draggedPosition: { newStartMinutes, newEndMinutes },
      displacements,
    };
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
      (item) => item !== draggedShift && (item.shift?.isTimeRange || !!item.absenceId)
    );

    let closestSnap: {
      newStartMinutes: number;
      newEndMinutes: number;
      distance: number;
    } | null = null;

    for (const other of otherItems) {
      const origPos = this._dragState.originalPositions.get(other);
      if (!origPos) continue;

      const otherPre = this.timeRangeService.getTotalPreShiftMinutes(other);
      const otherPost = this.timeRangeService.getTotalPostShiftMinutes(other);
      const otherEffectiveStart = origPos.startMinutes - otherPre;
      const otherEffectiveEnd = origPos.endMinutes + otherPost;

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

  private calculateDisplacements(
    draggedStartMinutes: number,
    draggedEndMinutes: number,
    allItems: IContainerTemplateItem[]
  ): Map<IContainerTemplateItem, ItemPosition> {
    const displacements = new Map<IContainerTemplateItem, ItemPosition>();
    const draggedShift = this._dragState.draggedShift;
    if (!draggedShift) return displacements;

    const draggedOrigPos = this._dragState.originalPositions.get(draggedShift);
    if (!draggedOrigPos) return displacements;

    const draggedPre = this.timeRangeService.getTotalPreShiftMinutes(draggedShift);
    const draggedPost = this.timeRangeService.getTotalPostShiftMinutes(draggedShift);
    const draggedEffEnd = draggedEndMinutes + draggedPost;
    const draggedEffStart = draggedStartMinutes - draggedPre;

    const movableItems = allItems.filter(
      (item) =>
        item !== draggedShift &&
        (item.shift?.isTimeRange || item.shift?.isSporadic || !!item.absenceId)
    );

    const isMovingDown = draggedStartMinutes > draggedOrigPos.startMinutes;
    const isMovingUp = draggedStartMinutes < draggedOrigPos.startMinutes;

    if (isMovingDown) {
      const candidates = movableItems
        .filter((item) => {
          const orig = this._dragState.originalPositions.get(item);
          if (!orig) return false;
          const itemPre = this.timeRangeService.getTotalPreShiftMinutes(item);
          const itemPost = this.timeRangeService.getTotalPostShiftMinutes(item);
          const itemEffStart = orig.startMinutes - itemPre;
          const itemEffEnd = orig.endMinutes + itemPost;
          const itemEffMidpoint = (itemEffStart + itemEffEnd) / 2;
          return itemEffMidpoint >= draggedEffStart;
        })
        .sort((a, b) => {
          const origA = this._dragState.originalPositions.get(a)!;
          const origB = this._dragState.originalPositions.get(b)!;
          return origA.startMinutes - origB.startMinutes;
        });

      let cursor = draggedEffEnd;

      for (const item of candidates) {
        const orig = this._dragState.originalPositions.get(item)!;
        const itemPre = this.timeRangeService.getTotalPreShiftMinutes(item);
        const itemPost = this.timeRangeService.getTotalPostShiftMinutes(item);
        const itemEffStart = orig.startMinutes - itemPre;
        const itemDuration = orig.endMinutes - orig.startMinutes;

        if (cursor > itemEffStart) {
          const newStart = cursor + itemPre;
          const newEnd = newStart + itemDuration;
          displacements.set(item, { startMinutes: newStart, endMinutes: newEnd });
          cursor = newEnd + itemPost;
        } else {
          break;
        }
      }
    } else if (isMovingUp) {
      const candidates = movableItems
        .filter((item) => {
          const orig = this._dragState.originalPositions.get(item);
          if (!orig) return false;
          const itemPre = this.timeRangeService.getTotalPreShiftMinutes(item);
          const itemPost = this.timeRangeService.getTotalPostShiftMinutes(item);
          const itemEffStart = orig.startMinutes - itemPre;
          const itemEffEnd = orig.endMinutes + itemPost;
          const itemEffMidpoint = (itemEffStart + itemEffEnd) / 2;
          return itemEffMidpoint <= draggedEffEnd;
        })
        .sort((a, b) => {
          const origA = this._dragState.originalPositions.get(a)!;
          const origB = this._dragState.originalPositions.get(b)!;
          return origB.startMinutes - origA.startMinutes;
        });

      let cursor = draggedEffStart;

      for (const item of candidates) {
        const orig = this._dragState.originalPositions.get(item)!;
        const itemPre = this.timeRangeService.getTotalPreShiftMinutes(item);
        const itemPost = this.timeRangeService.getTotalPostShiftMinutes(item);
        const itemEffEnd = orig.endMinutes + itemPost;
        const itemDuration = orig.endMinutes - orig.startMinutes;

        if (cursor < itemEffEnd) {
          const newEnd = cursor - itemPost;
          const newStart = newEnd - itemDuration;
          displacements.set(item, { startMinutes: newStart, endMinutes: newEnd });
          cursor = newStart - itemPre;
        } else {
          break;
        }
      }
    }

    return displacements;
  }

  private calculateBlockDisplacements(
    blockDelta: number,
    allItems: IContainerTemplateItem[]
  ): Map<IContainerTemplateItem, ItemPosition> {
    const displacements = new Map<IContainerTemplateItem, ItemPosition>();
    const blockItems = this._dragState.blockItems;

    let blockEffStart = Infinity;
    let blockEffEnd = -Infinity;

    for (const item of blockItems) {
      const origPos = this._dragState.blockOriginalPositions.get(item);
      if (!origPos) continue;
      const newStart = origPos.startMinutes + blockDelta;
      const itemDuration = origPos.endMinutes - origPos.startMinutes;
      const newEnd = newStart + itemDuration;
      const pre = this.timeRangeService.getTotalPreShiftMinutes(item);
      const post = this.timeRangeService.getTotalPostShiftMinutes(item);
      blockEffStart = Math.min(blockEffStart, newStart - pre);
      blockEffEnd = Math.max(blockEffEnd, newEnd + post);
    }

    const movableItems = allItems.filter(
      item => !blockItems.has(item) &&
        (item.shift?.isTimeRange || item.shift?.isSporadic || !!item.absenceId)
    );

    const isMovingDown = blockDelta > 0;
    const isMovingUp = blockDelta < 0;

    if (isMovingDown) {
      const candidates = movableItems
        .filter(item => {
          const orig = this._dragState.originalPositions.get(item);
          if (!orig) return false;
          const pre = this.timeRangeService.getTotalPreShiftMinutes(item);
          const post = this.timeRangeService.getTotalPostShiftMinutes(item);
          const effStart = orig.startMinutes - pre;
          const effEnd = orig.endMinutes + post;
          const midpoint = (effStart + effEnd) / 2;
          return midpoint >= blockEffStart;
        })
        .sort((a, b) => {
          const origA = this._dragState.originalPositions.get(a)!;
          const origB = this._dragState.originalPositions.get(b)!;
          return origA.startMinutes - origB.startMinutes;
        });

      let cursor = blockEffEnd;

      for (const item of candidates) {
        const orig = this._dragState.originalPositions.get(item)!;
        const itemPre = this.timeRangeService.getTotalPreShiftMinutes(item);
        const itemPost = this.timeRangeService.getTotalPostShiftMinutes(item);
        const itemEffStart = orig.startMinutes - itemPre;
        const itemDuration = orig.endMinutes - orig.startMinutes;

        if (cursor > itemEffStart) {
          const newStart = cursor + itemPre;
          const newEnd = newStart + itemDuration;
          displacements.set(item, { startMinutes: newStart, endMinutes: newEnd });
          cursor = newEnd + itemPost;
        } else {
          break;
        }
      }
    } else if (isMovingUp) {
      const candidates = movableItems
        .filter(item => {
          const orig = this._dragState.originalPositions.get(item);
          if (!orig) return false;
          const pre = this.timeRangeService.getTotalPreShiftMinutes(item);
          const post = this.timeRangeService.getTotalPostShiftMinutes(item);
          const effStart = orig.startMinutes - pre;
          const effEnd = orig.endMinutes + post;
          const midpoint = (effStart + effEnd) / 2;
          return midpoint <= blockEffEnd;
        })
        .sort((a, b) => {
          const origA = this._dragState.originalPositions.get(a)!;
          const origB = this._dragState.originalPositions.get(b)!;
          return origB.startMinutes - origA.startMinutes;
        });

      let cursor = blockEffStart;

      for (const item of candidates) {
        const orig = this._dragState.originalPositions.get(item)!;
        const itemPre = this.timeRangeService.getTotalPreShiftMinutes(item);
        const itemPost = this.timeRangeService.getTotalPostShiftMinutes(item);
        const itemEffEnd = orig.endMinutes + itemPost;
        const itemDuration = orig.endMinutes - orig.startMinutes;

        if (cursor < itemEffEnd) {
          const newEnd = cursor - itemPost;
          const newStart = newEnd - itemDuration;
          displacements.set(item, { startMinutes: newStart, endMinutes: newEnd });
          cursor = newStart - itemPre;
        } else {
          break;
        }
      }
    }

    return displacements;
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
      (item) => item !== currentItem && (item.shift?.isTimeRange || !!item.absenceId)
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
    allShifts: IContainerTemplateItem[]
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
      this.effectiveShiftsOverlapOriginal(effectiveStart, effectiveEnd, shift)
    );

    if (conflictingShifts.length === 0) {
      return null;
    }

    const boundaryEdge = direction.aggregate(
      ...conflictingShifts.map((s) => {
        const orig = this._dragState.originalPositions.get(s);
        if (orig) {
          return direction.getEffectiveEdge(orig.startMinutes, orig.endMinutes, this.timeRangeService, s);
        }
        return direction.getEffectiveEdge(
          this.timeRangeService.getShiftStartMinutes(s),
          this.timeRangeService.getShiftEndMinutes(s),
          this.timeRangeService,
          s
        );
      })
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
      this.hasEffectiveOverlapOriginal(
        candidate.effectiveStart,
        candidate.effectiveEnd,
        otherShifts
      ) &&
      iterations < maxIterations
    ) {
      const blockingShifts = otherShifts.filter((shift) =>
        this.effectiveShiftsOverlapOriginal(
          candidate.effectiveStart,
          candidate.effectiveEnd,
          shift
        )
      );

      if (blockingShifts.length === 0) break;

      const nextEdge = direction.aggregate(
        ...blockingShifts.map((s) => {
          const orig = this._dragState.originalPositions.get(s);
          if (orig) {
            return direction.getEffectiveEdge(orig.startMinutes, orig.endMinutes, this.timeRangeService, s);
          }
          return direction.getEffectiveEdge(
            this.timeRangeService.getShiftStartMinutes(s),
            this.timeRangeService.getShiftEndMinutes(s),
            this.timeRangeService,
            s
          );
        })
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
      !this.hasEffectiveOverlapOriginal(
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

  private hasEffectiveOverlapOriginal(
    effectiveStart: number,
    effectiveEnd: number,
    shifts: IContainerTemplateItem[]
  ): boolean {
    return shifts.some((shift) =>
      this.effectiveShiftsOverlapOriginal(effectiveStart, effectiveEnd, shift)
    );
  }

  private effectiveShiftsOverlapOriginal(
    effectiveStart: number,
    effectiveEnd: number,
    otherShift: IContainerTemplateItem
  ): boolean {
    const orig = this._dragState.originalPositions.get(otherShift);
    const otherStart = orig ? orig.startMinutes : this.timeRangeService.getShiftStartMinutes(otherShift);
    const otherEnd = orig ? orig.endMinutes : this.timeRangeService.getShiftEndMinutes(otherShift);
    const otherPre = this.timeRangeService.getTotalPreShiftMinutes(otherShift);
    const otherPost = this.timeRangeService.getTotalPostShiftMinutes(otherShift);
    const otherEffectiveStart = otherStart - otherPre;
    const otherEffectiveEnd = otherEnd + otherPost;
    return effectiveStart < otherEffectiveEnd && effectiveEnd > otherEffectiveStart;
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

    const isAbsence = !!item.absenceId;
    const newStartTime = isAbsence ? item.startItem : item.timeRangeStartItem;
    const newEndTime = isAbsence ? item.endItem : item.timeRangeEndItem;

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
    this._dragState.originalPositions.clear();
    this._dragState.isBlockDrag = false;
    this._dragState.blockItems = new Set();
    this._dragState.blockOriginalPositions.clear();
    this._dragState.blockEffectiveStart = 0;
    this._dragState.blockEffectiveEnd = 0;
  }
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Service holding the drag session state of the time ruler canvas and turning mouse moves into item positions.
 * @param timeRangeService - Calculates effective start/end minutes including pre/post shift times
 * @param edgeSnapService - Snaps a single dragged item onto the edges of its neighbours
 * @param displacementService - Pushes the neighbours of the dragged item or block aside
 */
import { Injectable, inject } from '@angular/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { Rectangle } from 'src/app/domain/models/geometry/rectangle.model';
import { formatTimeFromMinutes as formatTimeFromMinutesHelper } from 'src/app/domain/helpers/time-format.helper';
import { TimeRangeService } from './time-range.service';
import { ItemPosition } from './item-position.interface';
import { DragUpdateResult } from './drag-update-result.interface';
import { DragState } from './drag-state.interface';
import { TimeRulerBlockSelectionService } from './time-ruler-block-selection.service';
import { TimeRulerEdgeSnapService } from './time-ruler-edge-snap.service';
import { TimeRulerNeighbourDisplacementService } from './time-ruler-neighbour-displacement.service';

@Injectable()
export class TimeRulerDragDropService {
  private timeRangeService = inject(TimeRangeService);
  private edgeSnapService = inject(TimeRulerEdgeSnapService);
  private displacementService = inject(TimeRulerNeighbourDisplacementService);

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

      const blockDisplacements = this.displacementService.displaceAroundBlock(
        this._dragState.blockItems,
        this._dragState.blockOriginalPositions,
        blockDelta,
        this._dragState.originalPositions,
        allShifts
      );
      for (const [item, pos] of blockDisplacements) {
        displacements.set(item, pos);
      }
    } else {
      const snappedToEdge = this.edgeSnapService.snapToNeighbourEdge(
        this._dragState.draggedShift,
        newStartMinutes,
        newEndMinutes,
        allShifts,
        this._dragState.originalPositions,
        this._dragState.pixelsPerMinute
      );

      if (snappedToEdge) {
        newStartMinutes = snappedToEdge.newStartMinutes;
        newEndMinutes = snappedToEdge.newEndMinutes;
      }

      displacements = this.displacementService.displaceAroundItem(
        this._dragState.draggedShift,
        newStartMinutes,
        newEndMinutes,
        this._dragState.originalPositions,
        allShifts
      );
    }

    return {
      draggedPosition: { newStartMinutes, newEndMinutes },
      displacements,
    };
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

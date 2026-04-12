// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for mouse/click interactions on the time ruler canvas.
 * @param dragDropService - Management of drag & drop states for shift movements
 * @param shiftService - Access to selected shifts and container template items
 * @param timeRangeService - Calculation of shift start/end minutes for sorting
 */

import { EventEmitter, inject, Injectable } from '@angular/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { DrawImageHelper } from '../../../helpers/draw-image-helper';
import { TimeRangeService } from './time-range.service';
import { TimeRulerDragDropService, DragUpdateResult } from './time-ruler-drag-drop.service';
import { TimeRulerRenderService } from './time-ruler-render.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { IShiftContextMenuEvent } from '../time-ruler.component';
import { TimeRulerBlockSelectionService } from './time-ruler-block-selection.service';

interface CanvasLogicalCoordinates {
  x: number;
  y: number;
}

@Injectable()
export class TimeRulerInteractionService {
  private dragDropService = inject(TimeRulerDragDropService);
  private shiftService = inject(ContainerTemplateShiftService);
  private timeRangeService = inject(TimeRangeService);
  private renderService = inject(TimeRulerRenderService);

  private _isPaintSelecting = false;
  private _suppressNextClick = false;

  get isPaintSelecting(): boolean {
    return this._isPaintSelecting;
  }

  resolveCanvasCoordinates(
    event: MouseEvent,
    canvas: HTMLCanvasElement
  ): CanvasLogicalCoordinates {
    const rect = canvas.getBoundingClientRect();
    const logicalDimensions = DrawImageHelper.getLogicalDimensions(canvas);

    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const scaleX = logicalDimensions.width / rect.width;
    const scaleY = logicalDimensions.height / rect.height;

    return {
      x: clickX * scaleX - this.renderService.contentOffsetX,
      y: clickY * scaleY,
    };
  }

  handleCanvasClick(
    event: MouseEvent,
    canvas: HTMLCanvasElement,
    shiftRectangles: Map<IContainerTemplateItem, Rectangle>,
    blockSelectionService: TimeRulerBlockSelectionService,
    allShifts: IContainerTemplateItem[]
  ): void {
    if (this._suppressNextClick) {
      this._suppressNextClick = false;
      return;
    }

    if (this.dragDropService.dragState.isDragging) {
      return;
    }

    const { x, y } = this.resolveCanvasCoordinates(event, canvas);

    for (const [item, shiftRect] of shiftRectangles) {
      if (shiftRect.pointInRect(x, y)) {
        if (event.ctrlKey || event.shiftKey) {
          blockSelectionService.toggleItem(item, event.ctrlKey, event.shiftKey, allShifts);
        } else {
          blockSelectionService.clearSelection();
          this.shiftService.setSelectedShift(item);
        }
        return;
      }
    }

    blockSelectionService.clearSelection();
  }

  handleContextMenu(
    event: MouseEvent,
    canvas: HTMLCanvasElement,
    shiftRectangles: Map<IContainerTemplateItem, Rectangle>,
    shiftRightClick: EventEmitter<IShiftContextMenuEvent>
  ): void {
    const { x, y } = this.resolveCanvasCoordinates(event, canvas);

    for (const [item, shiftRect] of shiftRectangles) {
      if (shiftRect.pointInRect(x, y)) {
        event.preventDefault();
        event.stopPropagation();
        this.shiftService.setSelectedShift(item);
        shiftRightClick.emit({ item, mouseEvent: event });
        return;
      }
    }

    event.preventDefault();
  }

  handleMouseDown(
    event: MouseEvent,
    canvas: HTMLCanvasElement,
    shiftRectangles: Map<IContainerTemplateItem, Rectangle>,
    allShifts: IContainerTemplateItem[],
    blockSelectionService: TimeRulerBlockSelectionService
  ): void {
    const { x, y } = this.resolveCanvasCoordinates(event, canvas);

    for (const [item, shiftRect] of shiftRectangles) {
      if (!shiftRect.pointInRect(x, y)) continue;

      if (event.ctrlKey) {
        this._isPaintSelecting = true;
        blockSelectionService.toggleItem(item, true, event.shiftKey, allShifts);
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const isDraggable = item.shift?.isTimeRange || !!item.absenceId;
      if (!isDraggable) return;

      const isBlockMember = blockSelectionService.isSelected(item);

      if (isBlockMember && blockSelectionService.isDraggable()) {
        const dragStarted = this.dragDropService.startBlockDrag(
          y, item, shiftRect, allShifts, blockSelectionService
        );
        if (dragStarted) {
          event.preventDefault();
          event.stopPropagation();
        }
      } else {
        const dragStarted = this.dragDropService.startDrag(y, item, shiftRect, allShifts);
        if (dragStarted) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
      return;
    }
  }

  handlePaintSelectMove(
    event: MouseEvent,
    canvas: HTMLCanvasElement,
    shiftRectangles: Map<IContainerTemplateItem, Rectangle>,
    blockSelectionService: TimeRulerBlockSelectionService
  ): boolean {
    if (!this._isPaintSelecting) return false;

    const { x, y } = this.resolveCanvasCoordinates(event, canvas);

    for (const [item, shiftRect] of shiftRectangles) {
      if (shiftRect.pointInRect(x, y)) {
        return blockSelectionService.addToSelection(item);
      }
    }

    return false;
  }

  endPaintSelect(): void {
    this._isPaintSelecting = false;
    this._suppressNextClick = true;
  }

  handleMouseMove(
    event: MouseEvent,
    canvas: HTMLCanvasElement,
    shifts: IContainerTemplateItem[]
  ): DragUpdateResult | null {
    if (!this.dragDropService.dragState.isDragging) {
      return null;
    }

    event.preventDefault();
    event.stopPropagation();

    const { y } = this.resolveCanvasCoordinates(event, canvas);
    return this.dragDropService.updateDrag(y, shifts);
  }

  handleMouseUp(
    event: MouseEvent,
    shifts: IContainerTemplateItem[]
  ): boolean {
    if (!this.dragDropService.dragState.isDragging) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();

    const result = this.dragDropService.endDrag();
    if (result) {
      this.sortShiftsByTime(shifts);
      return true;
    }

    return false;
  }

  sortShiftsByTime(shifts: IContainerTemplateItem[]): void {
    const isMovable = (item: IContainerTemplateItem): boolean =>
      !!item.shift?.isTimeRange || !!item.shift?.isSporadic || !!item.absenceId;

    const itemsToSort = shifts.filter(isMovable);
    const fixedItems = shifts.filter((item) => !isMovable(item));

    itemsToSort.sort((a, b) => {
      const aStart = this.timeRangeService.getShiftStartMinutes(a);
      const bStart = this.timeRangeService.getShiftStartMinutes(b);
      return aStart - bStart;
    });

    const newItemsArray = [...itemsToSort, ...fixedItems];

    this.shiftService.setSelectedContainerTemplateItems(newItemsArray);
  }
}

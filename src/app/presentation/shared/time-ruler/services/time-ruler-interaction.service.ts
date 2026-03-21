// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service für Mouse-/Click-Interaktionen auf dem Time-Ruler Canvas.
 * @param dragDropService - Verwaltung von Drag&Drop-Zuständen für Shift-Verschiebungen
 * @param shiftService - Zugriff auf selektierte Shifts und Container-Template-Items
 * @param timeRangeService - Berechnung von Shift-Start/End-Minuten für Sortierung
 */

import { EventEmitter, inject, Injectable } from '@angular/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { DrawImageHelper } from '../../../helpers/draw-image-helper';
import { TimeRangeService } from './time-range.service';
import { TimeRulerDragDropService } from './time-ruler-drag-drop.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { IShiftContextMenuEvent } from '../time-ruler.component';

interface CanvasLogicalCoordinates {
  x: number;
  y: number;
}

@Injectable()
export class TimeRulerInteractionService {
  private dragDropService = inject(TimeRulerDragDropService);
  private shiftService = inject(ContainerTemplateShiftService);
  private timeRangeService = inject(TimeRangeService);

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
      x: clickX * scaleX,
      y: clickY * scaleY,
    };
  }

  handleCanvasClick(
    event: MouseEvent,
    canvas: HTMLCanvasElement,
    shiftRectangles: Map<IContainerTemplateItem, Rectangle>
  ): void {
    if (this.dragDropService.dragState.isDragging) {
      return;
    }

    const { x, y } = this.resolveCanvasCoordinates(event, canvas);

    for (const [item, shiftRect] of shiftRectangles) {
      if (shiftRect.pointInRect(x, y)) {
        this.shiftService.setSelectedShift(item);
        return;
      }
    }

    this.shiftService.setSelectedShift(null);
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
    shiftRectangles: Map<IContainerTemplateItem, Rectangle>
  ): void {
    const { x, y } = this.resolveCanvasCoordinates(event, canvas);

    for (const [item, shiftRect] of shiftRectangles) {
      if (shiftRect.pointInRect(x, y) && (item.shift?.isTimeRange || !!item.absenceId)) {
        const dragStarted = this.dragDropService.startDrag(y, item, shiftRect);
        if (dragStarted) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
    }
  }

  handleMouseMove(
    event: MouseEvent,
    canvas: HTMLCanvasElement,
    shifts: IContainerTemplateItem[]
  ): { newStartMinutes: number; newEndMinutes: number } | null {
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
    const itemsToSort = shifts.filter((item) => item.shift?.isTimeRange);
    const otherItems = shifts.filter((item) => !item.shift?.isTimeRange);

    itemsToSort.sort((a, b) => {
      const aStart = this.timeRangeService.getShiftStartMinutes(a);
      const bStart = this.timeRangeService.getShiftStartMinutes(b);
      return aStart - bStart;
    });

    const newItemsArray = [...itemsToSort, ...otherItems];

    this.shiftService.setSelectedContainerTemplateItems(newItemsArray);
  }
}

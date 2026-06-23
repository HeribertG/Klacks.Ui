// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal, Signal } from '@angular/core';

export interface FloorPlanDragData {
  id?: string;
  workId?: string;
  clientId?: string;
  clientName?: string;
  label?: string;
  shiftId?: string;
  abbreviation?: string;
  startTime?: string;
  endTime?: string;
  fromDate?: Date;
  untilDate?: Date;
  markerType?: number;
}

@Injectable()
export class FloorPlanWorkDropService {
  private readonly _isDragging = signal(false);
  private readonly _dragData = signal<FloorPlanDragData | null>(null);

  readonly isDragging: Signal<boolean> = this._isDragging.asReadonly();
  readonly dragData: Signal<FloorPlanDragData | null> = this._dragData.asReadonly();

  startDrag(markerData: FloorPlanDragData): void {
    this._dragData.set(markerData);
    this._isDragging.set(true);
  }

  updatePosition(
    event: MouseEvent,
    canvasElement: HTMLCanvasElement
  ): { x: number; y: number } {
    const rect = canvasElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  endDrag(): FloorPlanDragData | null {
    const data = this._dragData();
    this._isDragging.set(false);
    this._dragData.set(null);
    return data;
  }

  cancelDrag(): void {
    this._isDragging.set(false);
    this._dragData.set(null);
  }
}

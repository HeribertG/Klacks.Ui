// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Minimal events directive for the timeline surface canvas.
 * Emits right-click grid coordinates and suppresses the browser context menu
 * without injecting any component class, so the directive can live outside the
 * existing GridSurfaceTemplateComponent dependency cycle.
 * @param drawSchedule - Draw service used to translate mouse events into grid positions
 */
import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Output,
} from '@angular/core';
import { BaseDrawScheduleService } from 'src/app/presentation/shared/grid/services/body/draw-schedule.service';

export interface TimelineGridRightClickEvent {
  row: number;
  column: number;
  clientX: number;
  clientY: number;
}

@Directive({
  selector: '[appTimelineGridEvents]',
  standalone: true,
})
export class TimelineGridEventsDirective {
  private readonly el = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private drawSchedule = inject(BaseDrawScheduleService);

  @Output() rightClick = new EventEmitter<TimelineGridRightClickEvent>();
  @Output() wheelScroll = new EventEmitter<{ deltaX: number; deltaY: number }>();

  @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent): void {
    if (event.buttons === 2) {
      this.emitRightClick(event);
    }
  }

  @HostListener('contextmenu', ['$event']) onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  @HostListener('wheel', ['$event']) onWheel(event: WheelEvent): void {
    const deltaX = event.deltaX === 0 ? 0 : event.deltaX > 0 ? 1 : -1;
    const deltaY = event.deltaY === 0 ? 0 : event.deltaY > 0 ? 1 : -1;
    if (deltaX !== 0 || deltaY !== 0) {
      this.wheelScroll.emit({ deltaX, deltaY });
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private emitRightClick(event: MouseEvent): void {
    const pos = this.drawSchedule.calcCorrectCoordinate(event);
    if (!this.drawSchedule.isPositionValid(pos)) {
      return;
    }
    this.rightClick.emit({
      row: pos.row,
      column: pos.column,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }
}

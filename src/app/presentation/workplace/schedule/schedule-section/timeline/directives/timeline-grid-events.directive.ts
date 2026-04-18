// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Minimal events directive for the timeline surface canvas.
 * Emits right-click grid coordinates, suppresses the browser context menu and
 * tracks hovered cell / header for the tooltip service without injecting any
 * component class, so the directive lives outside the existing
 * GridSurfaceTemplateComponent dependency cycle.
 * @param drawSchedule - Draw service used to translate mouse events into grid positions
 * @param cellManipulation - Holds the hoveredCell signal consumed by the tooltip effect
 * @param settings - Grid settings (header height needed for header-hover detection)
 * @param gridData - Grid data (used to validate hovered column range)
 * @param scrollGrid - Horizontal scroll offset for header-column calculation
 */
import {
  DestroyRef,
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, throttleTime } from 'rxjs';
import { BaseDrawScheduleService } from 'src/app/presentation/shared/grid/services/body/draw-schedule.service';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { TimelineBlockHitTestService } from '../services/timeline-block-hit-test.service';
import { TimelineSelectionService } from '../services/timeline-selection.service';

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
  private cellManipulation = inject(BaseCellManipulationService);
  private gridSettings = inject(BaseSettingsService);
  private gridData = inject(BaseDataService);
  private scrollGrid = inject(ScrollService);
  private hitTest = inject(TimelineBlockHitTestService);
  private selection = inject(TimelineSelectionService);
  private destroyRef = inject(DestroyRef);

  private readonly mouseMoveThrottleMs = 16;

  @Output() rightClick = new EventEmitter<TimelineGridRightClickEvent>();
  @Output() wheelScroll = new EventEmitter<{ deltaX: number; deltaY: number }>();

  constructor() {
    fromEvent<MouseEvent>(this.el.nativeElement, 'mousemove')
      .pipe(throttleTime(this.mouseMoveThrottleMs), takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.onMouseMove(event));
  }

  @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent): void {
    if (event.buttons === 1) {
      this.respondToLeftButtonMouseDown(event);
    } else if (event.buttons === 2) {
      this.emitRightClick(event);
    }
  }

  @HostListener('contextmenu', ['$event']) onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  @HostListener('mouseleave') onMouseLeave(): void {
    this.cellManipulation.hoveredCell.set(null);
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

  private onMouseMove(event: MouseEvent): void {
    if (this.handleHeaderHover(event)) {
      return;
    }

    const pos = this.drawSchedule.calcCorrectCoordinate(event);
    if (!this.drawSchedule.isPositionValid(pos)) {
      this.cellManipulation.hoveredCell.set(null);
      return;
    }

    const isEmpty = !this.gridData.isCellActive(pos.row, pos.column);
    this.cellManipulation.hoveredCell.set({
      row: pos.row,
      column: pos.column,
      isEmpty,
      isHeader: false,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  private handleHeaderHover(event: MouseEvent): boolean {
    if (!this.gridSettings.hasHeader) {
      return false;
    }

    const rect = this.el.nativeElement.getBoundingClientRect();
    const relativeY = event.clientY - rect.top;
    if (relativeY >= this.gridSettings.cellHeaderHeight) {
      return false;
    }

    const relativeX = event.clientX - rect.left;
    const column =
      Math.floor(relativeX / this.gridSettings.cellWidth) +
      this.scrollGrid.horizontalScrollPosition;

    if (column < 0 || column >= this.gridData.columns) {
      this.cellManipulation.hoveredCell.set(null);
      return true;
    }

    this.cellManipulation.hoveredCell.set({
      row: -1,
      column,
      isEmpty: true,
      isHeader: true,
      clientX: event.clientX,
      clientY: event.clientY,
    });

    return true;
  }

  private respondToLeftButtonMouseDown(event: MouseEvent): void {
    const pos = this.drawSchedule.calcCorrectCoordinate(event);
    if (!this.drawSchedule.isPositionValid(pos)) {
      return;
    }

    const relativeY = this.computeRelativeYInCell(event, pos.row);
    const hit = this.hitTest.hitTest(pos.row, pos.column, relativeY);

    if (hit) {
      this.selection.selectBlock({
        row: pos.row,
        col: hit.mainCol,
        entry: hit.entry,
      });
    } else {
      this.selection.clearBlock();
    }

    this.cellManipulation.Position = pos;
    this.drawSchedule.refresh();
  }

  private computeRelativeYInCell(event: MouseEvent, row: number): number {
    const rect = this.el.nativeElement.getBoundingClientRect();
    const canvasY = event.clientY - rect.top;
    const cellTop =
      this.gridSettings.cellHeaderHeight +
      (row - this.scrollGrid.verticalScrollPosition) * this.gridSettings.cellHeight;
    return canvasY - cellTop;
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

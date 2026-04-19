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
import { IScheduleCell, WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-class';
import { ShiftType } from 'src/app/domain/models/shift/shift-class';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { ScheduleDataService } from '../../services/schedule-data.service';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { TimelineBlockHitTestService } from '../services/timeline-block-hit-test.service';
import { TimelineBlockTooltipService } from '../services/timeline-block-tooltip.service';
import { TimelineSelectionService } from '../services/timeline-selection.service';

export interface TimelineGridRightClickEvent {
  row: number;
  column: number;
  clientX: number;
  clientY: number;
  entry: IScheduleCell | null;
}

export interface TimelineGridBlockEvent {
  row: number;
  column: number;
  entry: IScheduleCell;
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
  private blockTooltip = inject(TimelineBlockTooltipService);
  private selection = inject(TimelineSelectionService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private destroyRef = inject(DestroyRef);

  private readonly mouseMoveThrottleMs = 16;

  @Output() rightClick = new EventEmitter<TimelineGridRightClickEvent>();
  @Output() wheelScroll = new EventEmitter<{ deltaX: number; deltaY: number }>();
  @Output() workDoubleClick = new EventEmitter<TimelineGridBlockEvent>();
  @Output() workChangeDoubleClick = new EventEmitter<TimelineGridBlockEvent>();
  @Output() containerWorkDoubleClick = new EventEmitter<TimelineGridBlockEvent>();
  @Output() deleteKey = new EventEmitter<TimelineGridBlockEvent>();

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

  @HostListener('dblclick', ['$event']) onDoubleClick(event: MouseEvent): void {
    const pos = this.drawSchedule.calcCorrectCoordinate(event);
    if (!this.drawSchedule.isPositionValid(pos)) {
      return;
    }
    const relativeY = this.computeRelativeYInCell(event, pos.row);
    const hit = this.hitTest.hitTest(pos.row, pos.column, relativeY);
    if (!hit) {
      return;
    }
    this.dispatchBlockEdit(pos.row, hit.mainCol, hit.entry);
  }

  @HostListener('keydown', ['$event']) onKeyDown(event: KeyboardEvent): void {
    const block = this.selection.selectedBlock();
    if (!block) {
      return;
    }
    if (event.key === 'Delete') {
      event.preventDefault();
      event.stopPropagation();
      this.deleteKey.emit({ row: block.row, column: block.col, entry: block.entry });
      return;
    }
    if (event.key === 'F2' || event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.dispatchBlockEdit(block.row, block.col, block.entry);
    }
  }

  private dispatchBlockEdit(row: number, column: number, entry: IScheduleCell): void {
    if (entry.lockLevel > 0 || entry.isGroupRestricted) {
      return;
    }
    if (
      entry.entryType === WorkScheduleEntryType.WorkChange ||
      entry.entryType === WorkScheduleEntryType.Expenses
    ) {
      this.workChangeDoubleClick.emit({ row, column, entry });
      return;
    }
    if (entry.entryType === WorkScheduleEntryType.Work) {
      const shift = this.dataManagementSchedule.shiftSchedules.find(
        (s) => s.shiftId === entry.entryId,
      );
      if (shift?.shiftType === ShiftType.IsContainer) {
        this.containerWorkDoubleClick.emit({ row, column, entry });
      } else {
        this.workDoubleClick.emit({ row, column, entry });
      }
    }
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
    const relativeY = this.computeRelativeYInCell(event, pos.row);
    const hit = this.hitTest.hitTest(pos.row, pos.column, relativeY);
    const tooltip = hit
      ? this.blockTooltip.buildBlockTooltip(hit.entry)
      : (this.gridData as ScheduleDataService).getAvailabilityTooltipForCell(pos.row, pos.column);
    this.cellManipulation.hoveredCell.set({
      row: pos.row,
      column: pos.column,
      isEmpty,
      isHeader: false,
      clientX: event.clientX,
      clientY: event.clientY,
      blockTooltip: tooltip,
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
    const relativeY = this.computeRelativeYInCell(event, pos.row);
    const hit = this.hitTest.hitTest(pos.row, pos.column, relativeY);
    this.rightClick.emit({
      row: pos.row,
      column: hit ? hit.mainCol : pos.column,
      clientX: event.clientX,
      clientY: event.clientY,
      entry: hit?.entry ?? null,
    });
  }
}

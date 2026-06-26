// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Generic grid events directive: keyboard navigation, mouse events, focus management.
 * @param gridSurface - GridSurfaceTemplateComponent for canvas access and scroll events
 * @param gridData - BaseDataService for grid data (rows, columns, cell status)
 * @param gridSettings - BaseSettingsService for grid configuration (header, cell size)
 * @param scrollGrid - ScrollService for scroll positions
 * @param cellManipulation - BaseCellManipulationService for cell editing and hover
 * @param fillHandleDrag - GridFillHandleDragService for fill handle drag-and-drop
 * @param scheduleEvents - GridScheduleEventsService for schedule-specific events
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  DestroyRef,
  Directive,
  ElementRef,
  HostListener,
  inject,
  output
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

export interface GridRightClickEvent {
  row: number;
  column: number;
  clientX: number;
  clientY: number;
}
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';
import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { GridSurfaceTemplateComponent } from '../grid-surface-template/grid-surface-template.component';
import { GridSelectionModeEnum } from '../../enums/divers';
import { GridFillHandleDragService } from '../../services/body/grid-fill-handle-drag.service';
import { GridScheduleEventsService } from './grid-schedule-events.service';

export interface GridDoubleClickEvent {
  row: number;
  column: number;
  entry?: IScheduleCell | null;
}

@Directive({
  selector: '[appGridTemplateEvents]',
  standalone: true,
})
export class GridTemplateEventsDirective {
  private readonly el = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private gridSurface = inject(GridSurfaceTemplateComponent);
  private gridData = inject(BaseDataService);
  private gridSettings = inject(BaseSettingsService);
  private scrollGrid = inject(ScrollService);
  private cellManipulation = inject(BaseCellManipulationService);
  private fillHandleDrag = inject(GridFillHandleDragService);
  private scheduleEvents = inject(GridScheduleEventsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rightClick = output<GridRightClickEvent>();
  readonly workChangeDoubleClick = output<GridDoubleClickEvent>();
  readonly workDoubleClick = output<GridDoubleClickEvent>();
  readonly containerWorkDoubleClick = output<GridDoubleClickEvent>();

  private readonly INDEX_CORRECTION = 1;
  private readonly REPEAT_DELAY = 100;

  private readonly DRAG_SCROLL_INITIAL_INTERVAL_MS = 220;
  private readonly DRAG_SCROLL_MIN_INTERVAL_MS = 25;
  private readonly DRAG_SCROLL_DECAY_TAU_MS = 700;

  private keyDown = false;
  private scrollByKey = false;
  private isDrawing = false;
  private hasCollection = false;

  private edgeEnterTime: number | null = null;
  private lastScrollEmitTime = 0;

  private lastGoRightTime = 0;
  private lastGoLeftTime = 0;
  private lastGoUpTime = 0;
  private lastGoDownTime = 0;
  private lastPageDownTime = 0;
  private lastPageUpTime = 0;

  private readonly keyHandlers = new Map<string, (event: KeyboardEvent) => void>([
    ['ArrowDown', (event) => this.handleArrowDown(event)],
    ['PageDown', (event) => this.handlePageDown(event)],
    ['ArrowUp', (event) => this.handleArrowUp(event)],
    ['PageUp', (event) => this.handlePageUp(event)],
    ['End', (event) => this.handleEnd(event)],
    ['Home', (event) => this.handleHome(event)],
    ['ArrowLeft', (event) => this.handleArrowLeftOrBackspace(event)],
    ['Backspace', (event) => this.handleArrowLeftOrBackspace(event)],
    ['ArrowRight', (event) => this.handleArrowRightOrTabOrEnter(event)],
    ['Tab', (event) => this.handleArrowRightOrTabOrEnter(event)],
    ['Enter', (event) => this.handleArrowRightOrTabOrEnter(event)],
    ['Delete', (event) => this.handleDeleteKeyAction(event)],
    ['Ctrl+c', (event) => this.handleCopy(event)],
    ['Ctrl+v', (event) => this.handlePaste(event)],
    ['F2', (event) => this.handleF2(event)],
  ]);

  constructor() {
    this.fillHandleDrag.initialize({ gridSurface: this.gridSurface, el: this.el });
    this.scheduleEvents.workChangeDoubleClick.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => this.workChangeDoubleClick.emit(event));
    this.scheduleEvents.workDoubleClick.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => this.workDoubleClick.emit(event));
    this.scheduleEvents.containerWorkDoubleClick.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => this.containerWorkDoubleClick.emit(event));

    fromEvent<MouseEvent>(this.el.nativeElement, 'mousemove').pipe(
      throttleTime(16),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => {
      this.onMouseMove(event);
    });
  }

  @HostListener('mouseenter', ['$event']) onMouseEnter(event: MouseEvent) {}

  @HostListener('dblclick', ['$event']) onDoubleClick(event: MouseEvent): void {
    if (!this.isOwnElement(event)) {
      return;
    }

    const pos = this.gridSurface.drawSchedule.calcCorrectCoordinate(event);
    if (!this.gridSurface.drawSchedule.isPositionValid(pos)) {
      return;
    }

    if (this.scheduleEvents.handleDoubleClick(pos)) {
      return;
    }

    this.cellManipulation.startEditing();
  }

  @HostListener('mouseleave', ['$event']) onMouseLeave(event: MouseEvent) {
    if (!this.isOwnElement(event)) {
      return;
    }
    this.cellManipulation.hoveredCell.set(null);
    this.gridSurface.destroyToolTip();
  }

  @HostListener('mousewheel', ['$event']) onMouseWheel(event: Event): void {
    const wheelEvent = event as WheelEvent;
    const moveY: number =
      wheelEvent.deltaY === 0 ? 0 : wheelEvent.deltaY > 0 ? 1 : -1;
    const moveX: number =
      wheelEvent.deltaX === 0 ? 0 : wheelEvent.deltaX > 0 ? 1 : -1;

    if (moveX !== 0) {
      const newValue = this.gridSurface.valueChangeHScrollbar() + moveX;
      if (newValue >= 0) {
        this.gridSurface.valueHScrollbar.emit(newValue);
      }
    }

    if (moveY !== 0) {
      const newValue = this.gridSurface.valueChangeVScrollbar() + moveY;
      if (newValue >= 0) {
        this.gridSurface.valueVScrollbar.emit(newValue);
      }
    }

    this.stopEvent(event);
  }

  @HostListener('appClickOutside', ['$event']) onClickOutside(
    event: Event
  ): void {
    this.gridSurface.destroyToolTip();
  }

  @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent): void {
    if (event.buttons === 1) {
      if (this.fillHandleDrag.tryStartDrag(event)) {
        return;
      }
      this.respondToLeftButtonMouseDown(event);
      this.scheduleEvents.tryPrepareShiftDrag(event);
      this.scheduleEvents.tryPrepareScheduleCellDrag(event);
    } else if (event.buttons === 2) {
      this.respondToRightButtonMouseDown(event);
    }
  }

  @HostListener('mouseup', ['$event']) onMouseUp(event: MouseEvent): void {
    this.scheduleEvents.cancelPendingDrag();
    this.scheduleEvents.cancelPendingScheduleCellDrag();

    if (this.scheduleEvents.isShiftDragging()) {
      return;
    }

    if (this.scheduleEvents.isScheduleCellDragging()) {
      return;
    }

    if (this.fillHandleDrag.isDragging()) {
      this.fillHandleDrag.endDrag();
      return;
    }

    this.isDrawing = false;
    this.lastGoRightTime = 0;
    this.lastGoLeftTime = 0;
    this.lastGoUpTime = 0;
    this.lastGoDownTime = 0;
    this.lastPageDownTime = 0;
    this.lastPageUpTime = 0;

    if (this.hasCollection && !this.isMultiselectBlocked()) {
      const pos: MyPosition =
        this.gridSurface.drawSchedule.calcCorrectCoordinate(event);
      if (!this.gridSurface.drawSchedule.isPositionValid(pos)) {
        return;
      }

      this.gridSurface.drawSchedule.createSelection(pos);
    }

    this.hasCollection = false;
  }

  onMouseMove(event: MouseEvent): void {
    if (this.scheduleEvents.isShiftDragging()) {
      this.scheduleEvents.updateShiftDragPosition(event.clientY);
      return;
    }

    if (this.scheduleEvents.isScheduleCellDragging()) {
      this.scheduleEvents.updateScheduleCellDragPosition(event.clientY);
      return;
    }

    if (this.scheduleEvents.tryStartPendingScheduleCellDrag(event)) {
      this.isDrawing = false;
      this.hasCollection = false;
      this.gridSurface.drawSchedule.destroySelection();
      return;
    }

    if (this.fillHandleDrag.isDragging()) {
      this.fillHandleDrag.updateDrag(event);
      return;
    }

    if (this.handleHeaderHover(event)) {
      return;
    }

    const pos: MyPosition =
      this.gridSurface.drawSchedule.calcCorrectCoordinate(event);

    this.updateHoveredCell(pos, event);
    this.fillHandleDrag.updateCursorForFillHandle(event);

    if (event.buttons === 1 && this.isDrawing) {
      if (this.isMultiselectBlocked()) {
        return;
      }

      this.scrollOnPoint(pos);
      if (!this.gridSurface.drawSchedule.isPositionValid(pos)) {
        return;
      }

      this.gridSurface.drawSchedule.drawSelectionDynamically(pos);

      this.hasCollection = true;
    }
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
    const column = Math.floor(relativeX / this.gridSettings.cellWidth) + this.scrollGrid.horizontalScrollPosition;

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

  private updateHoveredCell(pos: MyPosition, event: MouseEvent): void {
    if (!this.gridSurface.drawSchedule.isPositionValid(pos)) {
      this.cellManipulation.hoveredCell.set(null);
      this.gridSurface.hideToolTip();
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

    const cell = this.gridData.getCell(pos.row, pos.column);
    if (cell && cell.tooltip) {
      this.gridSurface.showToolTip({ value: cell.tooltip, event });
    } else {
      this.gridSurface.hideToolTip();
    }
  }

  @HostListener('window:keydown', ['$event']) onKeyDown(
    event: KeyboardEvent
  ): void {
    if (event.key === 'Escape' && this.scheduleEvents.isScheduleCellDragging()) {
      this.scheduleEvents.cancelScheduleCellDrag();
      this.stopEvent(event);
      return;
    }

    this.keyDown = true;

    if (!this.isOwnElement(event)) {
      this.gridSurface.drawSchedule.isFocused = false;
      return;
    }

    this.gridSurface.drawSchedule.isFocused = true;

    this.keyDown = true;

    const contextMenu = this.gridSurface.contextMenu();
    if (contextMenu) {
      contextMenu.closeMenu(true);
    }

    const mapKey = event.ctrlKey ? `Ctrl+${event.key}` : event.key;
    const handler = this.keyHandlers.get(mapKey);
    if (handler) {
      handler(event);
      return;
    }

    if (!event.ctrlKey && !event.altKey && !event.metaKey && this.isPrintableKey(event)) {
      this.cellManipulation.startEditing(event.key);
      this.stopEvent(event);
      return;
    }

    event.stopPropagation();
  }

  private handleArrowDown(event: KeyboardEvent): void {
    if (event.repeat) {
      const now = Date.now();
      if (now - this.lastGoDownTime < this.REPEAT_DELAY) {
        this.stopEvent(event);
        return;
      }
      this.lastGoDownTime = now;
    }

    this.goDown();
    this.stopEvent(event);
  }

  private handlePageDown(event: KeyboardEvent): void {
    if (event.repeat) {
      const now = Date.now();
      if (now - this.lastPageDownTime < this.REPEAT_DELAY) {
        this.stopEvent(event);
        return;
      }
      this.lastPageDownTime = now;
    }

    this.goPageDown();
    this.stopEvent(event);
  }

  private handleArrowUp(event: KeyboardEvent): void {
    if (event.repeat) {
      const now = Date.now();
      if (now - this.lastGoUpTime < this.REPEAT_DELAY) {
        this.stopEvent(event);
        return;
      }
      this.lastGoUpTime = now;
    }

    this.goUp();
    this.stopEvent(event);
  }

  private handlePageUp(event: KeyboardEvent): void {
    if (event.repeat) {
      const now = Date.now();
      if (now - this.lastPageUpTime < this.REPEAT_DELAY) {
        this.stopEvent(event);
        return;
      }
      this.lastPageUpTime = now;
    }

    this.goPageUp();
    this.stopEvent(event);
  }

  private handleEnd(event: KeyboardEvent): void {
    if (event.repeat) {
      event.preventDefault();
      return;
    }

    let lastRow: number = this.scrollGrid.maxRows;

    if (this.scrollGrid.maxRows <= 1) {
      lastRow = 0;
    }

    if (this.gridSurface.drawSchedule.position) {
      this.gridSurface.drawSchedule.position = new MyPosition(
        this.gridData.rows - 1,
        this.gridSurface.drawSchedule.position.column
      );
    }

    this.gridSurface.valueVScrollbar.emit(lastRow);
    this.stopEvent(event);
  }

  private handleHome(event: KeyboardEvent): void {
    if (event.repeat) {
      event.preventDefault();
      return;
    }

    const firstRow = 0;
    this.gridSurface.valueVScrollbar.emit(firstRow);
    this.stopEvent(event);
  }

  private handleArrowLeftOrBackspace(event: KeyboardEvent): void {
    if (event.repeat) {
      const now = Date.now();
      if (now - this.lastGoLeftTime < this.REPEAT_DELAY) {
        this.stopEvent(event);
        return;
      }
      this.lastGoLeftTime = now;
    }

    this.goLeft();
    this.stopEvent(event);
  }

  private handleArrowRightOrTabOrEnter(event: KeyboardEvent): void {
    if (event.repeat) {
      const now = Date.now();
      if (now - this.lastGoRightTime < this.REPEAT_DELAY) {
        this.stopEvent(event);
        return;
      }
      this.lastGoRightTime = now;
    }

    this.goRight();
    this.stopEvent(event);
  }

  private handleDeleteKeyAction(event: KeyboardEvent): void {
    this.scheduleEvents.handleDeleteKey();
    this.stopEvent(event);
  }

  private handleCopy(event: KeyboardEvent): void {
    this.cellManipulation.copy();
    this.keyDown = false;
  }

  private handlePaste(event: KeyboardEvent): void {
    this.cellManipulation.paste();
    this.keyDown = false;
  }

  private handleF2(event: KeyboardEvent): void {
    this.cellManipulation.startEditing();
    this.stopEvent(event);
  }

  private isPrintableKey(event: KeyboardEvent): boolean {
    if (event.key.length !== 1) {
      return false;
    }
    const code = event.key.charCodeAt(0);
    return code >= 32 && code <= 126;
  }

  @HostListener('window:keyup', ['$event']) onKeyUp(
    event: KeyboardEvent
  ): void {
    this.keyDown = false;
    this.scrollByKey = false;
  }

  @HostListener('window:keypress', ['$event']) onKeyPress(
    event: KeyboardEvent
  ): void {}

  @HostListener('window:focus', ['$event']) onfocus(event: FocusEvent): void {
    this.gridSurface.setFocus();
    if (
      this.gridSurface.drawSchedule.position &&
      !this.gridSurface.drawSchedule.hasPositionCollection
    ) {
      this.gridSurface.drawSchedule.refreshCell(
        this.gridSurface.drawSchedule.position
      );
      this.gridSurface.drawSchedule.drawGridSelectedCell();
    }
  }

  @HostListener('window:blur', ['$event']) onblur(event: FocusEvent): void {
    this.gridSurface.drawSchedule.isFocused = false;
    if (
      this.gridSurface.drawSchedule.position &&
      !this.gridSurface.drawSchedule.hasPositionCollection
    ) {
      this.gridSurface.drawSchedule.refreshCell(
        this.gridSurface.drawSchedule.position
      );
      this.gridSurface.drawSchedule.drawGridSelectedCell();
    }
  }

  scrollOnPoint(pos: MyPosition) {
    const hScrollPos = this.scrollGrid.horizontalScrollPosition;
    const vScrollPos = this.scrollGrid.verticalScrollPosition;
    const lastVisibleColumn = hScrollPos + this.scrollGrid.visibleCols - 1;
    const lastVisibleRow = vScrollPos + this.fullyVisibleBodyRows() - 1;

    const atLeftEdge = hScrollPos > 0 && pos.column <= hScrollPos;
    const atRightEdge = pos.column >= lastVisibleColumn;
    const atTopEdge = vScrollPos > 0 && pos.row <= vScrollPos;
    const atBottomEdge = pos.row >= lastVisibleRow;

    if (!atLeftEdge && !atRightEdge && !atTopEdge && !atBottomEdge) {
      this.edgeEnterTime = null;
      return;
    }

    const now = Date.now();
    if (this.edgeEnterTime === null) {
      this.edgeEnterTime = now;
      this.lastScrollEmitTime = 0;
    }

    const elapsed = now - this.edgeEnterTime;
    const interval =
      this.DRAG_SCROLL_MIN_INTERVAL_MS +
      (this.DRAG_SCROLL_INITIAL_INTERVAL_MS -
        this.DRAG_SCROLL_MIN_INTERVAL_MS) *
        Math.exp(-elapsed / this.DRAG_SCROLL_DECAY_TAU_MS);

    if (now - this.lastScrollEmitTime < interval) {
      return;
    }

    this.lastScrollEmitTime = now;

    if (atLeftEdge) {
      this.gridSurface.valueHScrollbar.emit(hScrollPos - 1);
    } else if (atRightEdge) {
      this.gridSurface.valueHScrollbar.emit(hScrollPos + 1);
    }

    if (atTopEdge) {
      this.gridSurface.valueVScrollbar.emit(vScrollPos - 1);
    } else if (atBottomEdge) {
      this.gridSurface.valueVScrollbar.emit(vScrollPos + 1);
    }
  }

  private respondToLeftButtonMouseDown(event: MouseEvent): void {
    this.gridSurface.drawSchedule.destroySelection();
    this.gridSurface.setFocus();

    const pos: MyPosition =
      this.gridSurface.drawSchedule.calcCorrectCoordinate(event);
    this.isDrawing = true;

    if (this.gridSurface.drawSchedule.position !== pos) {
      this.gridSurface.drawSchedule.position = pos;
    }
    this.gridSurface.drawSchedule.refresh();
  }

  private respondToRightButtonMouseDown(event: MouseEvent): void {
    this.gridSurface.setFocus();

    const pos: MyPosition =
      this.gridSurface.drawSchedule.calcCorrectCoordinate(event);

    if (!this.gridSurface.drawSchedule.isPositionValid(pos)) {
      return;
    }

    if (this.gridSurface.drawSchedule.position !== pos) {
      this.gridSurface.drawSchedule.position = pos;
    }
    this.gridSurface.drawSchedule.drawSelection();
    this.gridSurface.drawSchedule.drawGridSelectedCell();

    this.rightClick.emit({
      row: pos.row,
      column: pos.column,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private stopEvent(event: Event): void {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
  }

  private isOwnElement(event: Event): boolean {
    const targetElement = event.target as HTMLElement;

    const hasId = targetElement.hasAttribute('id');
    const idValue = hasId ? targetElement.getAttribute('id') : '';

    if (idValue === 'scheduleCanvas') {
      return true;
    }

    if (targetElement === (this.el.nativeElement as HTMLElement)) {
      return true;
    }

    if (this.el.nativeElement.parentElement) {
      if (
        targetElement === (this.el.nativeElement.parentElement as HTMLElement)
      ) {
        return true;
      }
    }

    return false;
  }

  private goRight() {
    if (
      this.gridSurface.drawSchedule.position &&
      this.gridSurface.drawSchedule.position.column < this.gridData.columns - 1
    ) {
      const nextColumn: number =
        this.gridSurface.drawSchedule.position.column + 1;

      this.gridSurface.drawSchedule.position = new MyPosition(
        this.gridSurface.drawSchedule.position.row,
        nextColumn
      );

      if (
        this.gridSurface.drawSchedule.position.column >=
        this.scrollGrid.horizontalScrollPosition +
          this.scrollGrid.visibleCols -
          1
      ) {
        this.gridSurface.valueHScrollbar.emit(
          this.scrollGrid.horizontalScrollPosition + 1
        );
      }
    }
  }
  private goLeft() {
    if (
      this.gridSurface.drawSchedule.position &&
      this.gridSurface.drawSchedule.position.column > 0
    ) {
      const previousColumn: number =
        this.gridSurface.drawSchedule.position.column - 1;
      this.gridSurface.drawSchedule.position = new MyPosition(
        this.gridSurface.drawSchedule.position.row,
        previousColumn
      );

      if (
        this.gridSurface.drawSchedule.position.column <
        this.scrollGrid.horizontalScrollPosition
      ) {
        this.gridSurface.valueHScrollbar.emit(previousColumn);
        this.gridSurface.drawSchedule.drawGridSelectedCell();
      }
    }
  }

  private goUp() {
    if (
      this.gridSurface.drawSchedule.position &&
      this.gridSurface.drawSchedule.position.row > 0
    ) {
      const previousRow = this.gridSurface.drawSchedule.position.row - 1;

      this.gridSurface.drawSchedule.position = new MyPosition(
        previousRow,
        this.gridSurface.drawSchedule.position.column
      );

      if (previousRow < this.scrollGrid.verticalScrollPosition) {
        this.gridSurface.valueVScrollbar.emit(
          this.scrollGrid.verticalScrollPosition - 1
        );
      }
    }
  }

  private goDown() {
    if (
      this.gridSurface.drawSchedule.position &&
      this.gridSurface.drawSchedule.position.row < this.gridData.rows
    ) {
      this.gridSurface.drawSchedule.position = new MyPosition(
        this.gridSurface.drawSchedule.position.row + this.INDEX_CORRECTION,
        this.gridSurface.drawSchedule.position.column
      );

      const currentVerticalRow = this.gridSurface.drawSchedule.position.row;
      const firstVisibleRow = this.scrollGrid.verticalScrollPosition;
      const lastFullyVisibleRow =
        firstVisibleRow + this.fullyVisibleBodyRows() - 1;

      if (lastFullyVisibleRow <= currentVerticalRow) {
        this.gridSurface.valueVScrollbar.emit(firstVisibleRow + 1);
      }
    }
  }

  private fullyVisibleBodyRows(): number {
    const cellHeight = this.gridSettings.cellHeight;
    if (cellHeight <= 0) return 1;
    const headerHeight = this.gridSettings.hasHeader
      ? this.gridSettings.cellHeaderHeight
      : 0;
    const bodyHeight = this.gridSurface.drawSchedule.height - headerHeight;
    return Math.max(1, Math.floor(bodyHeight / cellHeight));
  }

  private goPageDown() {
    let nextVisibleRow: number =
      this.scrollGrid.verticalScrollPosition + this.fullyVisibleBodyRows() - 1;

    if (nextVisibleRow > this.gridData.rows) {
      nextVisibleRow = this.gridData.rows - 2;
    }

    let nextRow = 0;
    if (this.scrollGrid.maxRows <= 1) {
      this.scrollGrid.verticalScrollPosition = 0;
    } else if (this.scrollGrid.maxRows >= nextVisibleRow) {
      nextRow = nextVisibleRow;
    } else {
      nextRow = this.scrollGrid.maxRows;
    }

    if (this.gridSurface.drawSchedule.position) {
      this.gridSurface.drawSchedule.position = new MyPosition(
        nextVisibleRow,
        this.gridSurface.drawSchedule.position.column
      );
    }

    this.gridSurface.valueVScrollbar.emit(nextRow);
    this.gridSurface.drawSchedule.drawGridSelectedCell();
  }

  private goPageUp() {
    let previousRow: number =
      this.scrollGrid.verticalScrollPosition - this.scrollGrid.visibleRows + 1;

    if (previousRow < 0) {
      previousRow = 0;
    }

    if (this.scrollGrid.maxRows <= 1) {
      previousRow = 0;
    }

    if (this.gridSurface.drawSchedule.position) {
      this.gridSurface.drawSchedule.position = new MyPosition(
        previousRow,
        this.gridSurface.drawSchedule.position.column
      );
    }

    this.gridSurface.valueVScrollbar.emit(previousRow);
    this.gridSurface.drawSchedule.drawGridSelectedCell();
  }

  private isMultiselectBlocked(): boolean {
    return (
      this.gridSettings.selectionMode === GridSelectionModeEnum.Row ||
      this.gridSettings.selectionMode === GridSelectionModeEnum.RowActiveOnly
    );
  }
}

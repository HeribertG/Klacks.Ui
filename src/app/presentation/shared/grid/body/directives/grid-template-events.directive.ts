/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Output,
  ViewContainerRef,
} from '@angular/core';

import { Overlay } from '@angular/cdk/overlay';

export interface GridRightClickEvent {
  row: number;
  column: number;
  clientX: number;
  clientY: number;
}
import { MyPosition } from 'src/app/presentation/shared/grid/classes/position';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { BaseSettingsService } from 'src/app/presentation/shared/grid/services/data-setting/settings.service';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import { GridSurfaceTemplateComponent } from '../grid-surface-template/grid-surface-template.component';
import { GridSelectionModeEnum } from '../../enums/divers';
import { ShiftToScheduleDragDropService } from 'src/app/presentation/workplace/schedule/services/shift-to-schedule-drag-drop.service';
import { ShiftDataService } from 'src/app/presentation/workplace/schedule/shift-section/services/shift-data.service';
import { ScheduleDataService } from 'src/app/presentation/workplace/schedule/schedule-section/services/schedule-data.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { FillHandleService } from 'src/app/presentation/workplace/schedule/services/fill-handle.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { WorkScheduleEntryType } from 'src/app/domain/models/work-schedule-class';
import { BreakCellParams } from 'src/app/domain/services/schedule/schedule-entry-crud.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';

export interface GridDoubleClickEvent {
  row: number;
  column: number;
}

@Directive({
  selector: '[appGridTemplateEvents]',
  standalone: true,
})
export class GridTemplateEventsDirective {
  private readonly el = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private gridSurface = inject(GridSurfaceTemplateComponent);
  public overlay = inject(Overlay);
  public viewContainerRef = inject(ViewContainerRef);
  private gridData = inject(BaseDataService);
  private gridSettings = inject(BaseSettingsService);
  private scrollGrid = inject(ScrollService);
  private cellManipulation = inject(BaseCellManipulationService);
  private shiftDragService = inject(ShiftToScheduleDragDropService);
  private dataManagementSchedule = inject(DataManagementScheduleService);
  private fillHandleService = inject(FillHandleService);
  private gridFonts = inject(GridFontsService);
  private absenceLookup = inject(AbsenceLookupService);

  @Output() rightClick = new EventEmitter<GridRightClickEvent>();
  @Output() workChangeDoubleClick = new EventEmitter<GridDoubleClickEvent>();
  @Output() workDoubleClick = new EventEmitter<GridDoubleClickEvent>();

  private readonly INDEX_CORRECTION = 1;
  private readonly REPEAT_DELAY = 100;

  private keyDown = false;
  private scrollByKey = false;
  private isDrawing = false;
  private hasCollection = false;

  private lastGoRightTime = 0;
  private lastGoLeftTime = 0;
  private lastGoUpTime = 0;
  private lastGoDownTime = 0;
  private lastPageDownTime = 0;
  private lastPageUpTime = 0;

  private dragDelayTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingDragEvent: MouseEvent | null = null;
  private readonly DRAG_DELAY_MS = 150;
  private readonly FILL_HANDLE_RADIUS = 5;
  private readonly FILL_HANDLE_HIT_AREA = 12;

  private autoScrollTimer: ReturnType<typeof setInterval> | null = null;
  private autoScrollStartTime = 0;
  private readonly AUTO_SCROLL_INITIAL_DELAY = 400;
  private readonly AUTO_SCROLL_MIN_DELAY = 50;

  @HostListener('mouseenter', ['$event']) onMouseEnter(event: MouseEvent) {}

  @HostListener('dblclick', ['$event']) onDoubleClick(event: MouseEvent): void {
    if (!this.isOwnElement(event)) {
      return;
    }

    const pos = this.gridSurface.drawSchedule.calcCorrectCoordinate(event);
    if (!this.gridSurface.drawSchedule.isPositionValid(pos)) {
      return;
    }

    if (this.gridSurface.nameId === 'surface') {
      if (this.handleWorkChangeDoubleClick(pos)) {
        return;
      }
      if (this.handleWorkDoubleClick(pos)) {
        return;
      }
    }

    this.cellManipulation.startEditing();
  }

  private handleWorkChangeDoubleClick(pos: MyPosition): boolean {
    const scheduleDataService = this.gridData as ScheduleDataService;
    const entry = scheduleDataService.getWorkScheduleEntryForCell(pos.row, pos.column);

    if (!entry || entry.entryType !== WorkScheduleEntryType.WorkChange) {
      return false;
    }

    if (scheduleDataService.isColumnSealed(pos.column)) {
      return false;
    }

    this.workChangeDoubleClick.emit({ row: pos.row, column: pos.column });
    return true;
  }

  private handleWorkDoubleClick(pos: MyPosition): boolean {
    const scheduleDataService = this.gridData as ScheduleDataService;
    const entry = scheduleDataService.getWorkScheduleEntryForCell(pos.row, pos.column);

    if (!entry || entry.entryType !== WorkScheduleEntryType.Work) {
      return false;
    }

    if (scheduleDataService.isColumnSealed(pos.column)) {
      return false;
    }

    this.workDoubleClick.emit({ row: pos.row, column: pos.column });
    return true;
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
      const newValue = this.gridSurface.valueChangeHScrollbar + moveX;
      if (newValue >= 0) {
        this.gridSurface.valueHScrollbar.emit(newValue);
      }
    }

    if (moveY !== 0) {
      const newValue = this.gridSurface.valueChangeVScrollbar + moveY;
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
      if (this.tryStartFillHandleDrag(event)) {
        return;
      }
      this.respondToLeftButtonMouseDown(event);
      this.tryPrepareShiftDrag(event);
    } else if (event.buttons === 2) {
      this.respondToRightButtonMouseDown(event);
    }
  }

  private tryPrepareShiftDrag(event: MouseEvent): void {
    if (this.gridSurface.nameId !== 'shift') {
      return;
    }

    const pos = this.gridSurface.drawSchedule.calcCorrectCoordinate(event);
    if (!this.gridSurface.drawSchedule.isPositionValid(pos)) {
      return;
    }

    if (!this.gridData.isCellActive(pos.row, pos.column)) {
      return;
    }

    const shiftDataService = this.gridData as ShiftDataService;
    const dragData = shiftDataService.getShiftDragData(pos.row, pos.column);
    if (!dragData) {
      return;
    }

    this.cancelPendingDrag();
    this.pendingDragEvent = event;
    this.dragDelayTimer = setTimeout(() => {
      if (this.pendingDragEvent) {
        this.shiftDragService.startDrag(this.pendingDragEvent, dragData);
        this.pendingDragEvent = null;
      }
    }, this.DRAG_DELAY_MS);
  }

  private cancelPendingDrag(): void {
    if (this.dragDelayTimer) {
      clearTimeout(this.dragDelayTimer);
      this.dragDelayTimer = null;
    }
    this.pendingDragEvent = null;
  }

  @HostListener('mouseup', ['$event']) onMouseUp(event: MouseEvent): void {
    this.cancelPendingDrag();

    if (this.shiftDragService.isDragging()) {
      return;
    }

    if (this.fillHandleService.isDragging()) {
      this.handleFillHandleDrop();
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

  @HostListener('mousemove', ['$event']) onMouseMove(event: MouseEvent): void {
    if (this.shiftDragService.isDragging()) {
      this.shiftDragService.updateDragPosition(event.clientY);
      return;
    }

    if (this.fillHandleService.isDragging()) {
      this.handleFillHandleDrag(event);
      return;
    }

    if (this.handleHeaderHover(event)) {
      return;
    }

    const pos: MyPosition =
      this.gridSurface.drawSchedule.calcCorrectCoordinate(event);

    this.updateHoveredCell(pos, event);
    this.updateCursorForFillHandle(event);

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

  @HostListener('window:keydown', ['$event']) onKeyDown(
    event: KeyboardEvent
  ): void {
    this.keyDown = true;

    if (!this.isOwnElement(event)) {
      this.gridSurface.drawSchedule.isFocused = false;
      return;
    }

    this.gridSurface.drawSchedule.isFocused = true;

    this.keyDown = true;

    if (this.gridSurface.contextMenu) {
      this.gridSurface.contextMenu.closeMenu();
    }

    // if (event.shiftKey) {
    //   this.gridSurface.setShiftKey();
    // }
    // this.gridSurface.isCtrl = event.ctrlKey;

    if (event.key === 'ArrowDown') {
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
      return;
    }

    if (event.key === 'PageDown') {
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
      return;
    }

    if (event.key === 'ArrowUp') {
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
      return;
    }

    if (event.key === 'PageUp') {
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
      return;
    }

    if (event.key === 'End') {
      if (event.repeat) {
        // const isOkToWrite :boolean = event
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
      return;
    }

    if (event.key === 'Home') {
      if (event.repeat) {
        event.preventDefault();
        return;
      }

      const firstRow = 0;

      this.gridSurface.valueVScrollbar.emit(firstRow);

      this.stopEvent(event);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
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
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'Tab' || event.key === 'Enter') {
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
      return;
    }

    if (event.key === 'Delete') {
      this.handleDeleteKey();
      this.stopEvent(event);
      return;
    }

    // if (e.Key == Key.X && IsCtrl) {
    //   try {
    //     zCut();
    //     e.Handled = true;
    //     return;
    //   }
    //   catch (Exception ex)
    //   {
    //     Debug.Print("ucChildSimpleGrid.KeyDown: " + ex.Message);
    //   }
    // }
    // Copy
    if (event.key === 'c' && event.ctrlKey) {
      this.cellManipulation.copy();
      this.keyDown = false;
      return;
    }

    // Paste
    if (event.key === 'v' && event.ctrlKey) {
      this.cellManipulation.paste();
      this.keyDown = false;
      return;
    }

    // F2 - start editing
    if (event.key === 'F2') {
      this.cellManipulation.startEditing();
      this.stopEvent(event);
      return;
    }

    if (!event.ctrlKey && !event.altKey && !event.metaKey && this.isPrintableKey(event)) {
      this.cellManipulation.startEditing(event.key);
      this.stopEvent(event);
      return;
    }

    event.stopPropagation();
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
    if (pos.column < this.scrollGrid.horizontalScrollPosition) {
      this.gridSurface.valueHScrollbar.emit(
        this.scrollGrid.horizontalScrollPosition - 1
      );
      return;
    }

    const lastVisibleColum =
      this.scrollGrid.visibleCols + this.scrollGrid.horizontalScrollPosition;

    if (pos.column > lastVisibleColum) {
      this.gridSurface.valueHScrollbar.emit(
        this.scrollGrid.horizontalScrollPosition + 1
      );
      return;
    }

    if (pos.row < this.scrollGrid.verticalScrollPosition) {
      this.gridSurface.valueHScrollbar.emit(
        this.scrollGrid.verticalScrollPosition - 1
      );
      return;
    }

    const lastVisibleRow =
      this.scrollGrid.visibleRows + this.scrollGrid.verticalScrollPosition;

    if (pos.row >= lastVisibleRow) {
      // this.gridSurface.drawSchedule.moveGrid(0, 1);
      return;
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
    this.gridSurface.drawSchedule.refresh();

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

      const nextRow =
        currentVerticalRow <= this.scrollGrid.maxRows
          ? currentVerticalRow
          : this.scrollGrid.maxRows;

      const firstVisibleRow = this.scrollGrid.verticalScrollPosition;
      const visibleRows = this.scrollGrid.visibleRows;
      const lastVisibleRow = firstVisibleRow + visibleRows - 2;

      if (lastVisibleRow <= nextRow) {
        this.gridSurface.valueVScrollbar.emit(
          this.scrollGrid.verticalScrollPosition + 1
        );
      }
    }
  }

  private goPageDown() {
    let nextVisibleRow: number =
      this.scrollGrid.verticalScrollPosition + this.scrollGrid.visibleRows - 2;

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

  private handleDeleteKey(): void {
    if (this.gridSurface.nameId !== 'surface') {
      return;
    }

    const scheduleDataService = this.gridData as ScheduleDataService;
    const entriesToDelete: { id: string; sourceId: string; clientId: string; date: Date; entryId: string; entryType: number }[] = [];

    const positionCollection = this.cellManipulation.PositionCollection;
    const currentPos = this.gridSurface.drawSchedule.position;

    if (positionCollection.count() > 0) {
      for (let i = 0; i < positionCollection.count(); i++) {
        const pos = positionCollection.item(i);
        const deleteInfo = this.getDeleteInfoForPosition(scheduleDataService, pos.row, pos.column);
        if (deleteInfo) {
          entriesToDelete.push(deleteInfo);
        }
      }
    }

    if (currentPos && !positionCollection.contains(currentPos)) {
      const deleteInfo = this.getDeleteInfoForPosition(scheduleDataService, currentPos.row, currentPos.column);
      if (deleteInfo) {
        entriesToDelete.push(deleteInfo);
      }
    }

    if (entriesToDelete.length === 0) {
      return;
    }

    if (entriesToDelete.length === 1) {
      const entry = entriesToDelete[0];
      this.dataManagementSchedule.deleteWorkScheduleEntry(entry.id, entry.sourceId, entry.clientId, entry.date, entry.entryId, entry.entryType);
    } else {
      this.dataManagementSchedule.bulkDeleteWorkScheduleEntries(entriesToDelete);
    }
  }

  private getDeleteInfoForPosition(
    scheduleDataService: ScheduleDataService,
    row: number,
    column: number
  ): { id: string; sourceId: string; clientId: string; date: Date; entryId: string; entryType: number } | null {
    const entry = scheduleDataService.getWorkScheduleEntryForCell(row, column);
    if (!entry) {
      return null;
    }

    const date = scheduleDataService.getDateForColumn(column);
    if (!date) {
      return null;
    }

    return {
      id: entry.id,
      sourceId: entry.sourceId,
      clientId: entry.clientId,
      date,
      entryId: entry.entryId,
      entryType: entry.entryType,
    };
  }

  private tryStartFillHandleDrag(event: MouseEvent): boolean {
    if (this.gridSurface.nameId !== 'surface') {
      return false;
    }

    if (!this.gridSurface.drawSchedule.showFillHandle) {
      return false;
    }

    const pos = this.cellManipulation.Position;

    if (pos.isEmpty() || !this.gridData.isCellDraggable(pos.row, pos.column)) {
      return false;
    }

    if (this.cellManipulation.PositionCollection.count() > 1) {
      return false;
    }

    if (!this.isOverFillHandle(event, pos)) {
      return false;
    }

    const scheduleDataService = this.gridData as ScheduleDataService;
    const entry = scheduleDataService.getWorkScheduleEntryForCell(pos.row, pos.column);

    if (!entry) {
      return false;
    }

    const date = scheduleDataService.getDateForColumn(pos.column);
    const shift = this.dataManagementSchedule.shiftSchedules.find(
      (s) => s.shiftId === entry.entryId && date && this.isSameDay(s.date, date)
    );
    const workTime = shift?.workTime ?? 0;

    this.fillHandleService.startDrag(pos, entry.entryId, workTime, entry.entryType);
    this.el.nativeElement.style.cursor = 'e-resize';
    return true;
  }

  private handleFillHandleDrag(event: MouseEvent): void {
    this.handleAutoScrollOnEdge(event);

    const pos = this.gridSurface.drawSchedule.calcCorrectCoordinate(event);

    if (!this.gridSurface.drawSchedule.isPositionValid(pos)) {
      return;
    }

    const startPos = this.fillHandleService.state.startPosition;
    if (!startPos || pos.row !== startPos.row) {
      return;
    }

    this.fillHandleService.updateDragColumn(pos.column);

    if (pos.column <= startPos.column) {
      this.gridSurface.drawSchedule.refresh();
    } else {
      this.drawFillHandleSelection();
    }
  }

  private handleAutoScrollOnEdge(event: MouseEvent): void {
    const rect = this.el.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const canvasWidth = rect.width;
    const edgeThreshold = 30;

    const isAtRightEdge = mouseX > canvasWidth - edgeThreshold;

    if (!isAtRightEdge) {
      this.stopAutoScroll();
      return;
    }

    if (!this.autoScrollTimer) {
      this.autoScrollStartTime = Date.now();
      this.startAutoScroll();
    }
  }

  private startAutoScroll(): void {
    this.doAutoScrollStep();
  }

  private doAutoScrollStep(): void {
    const maxScrollPos = this.gridData.columns - this.scrollGrid.visibleCols;
    if (this.scrollGrid.horizontalScrollPosition >= maxScrollPos) {
      this.stopAutoScroll();
      return;
    }

    this.gridSurface.valueHScrollbar.emit(
      this.scrollGrid.horizontalScrollPosition + 1
    );

    const currentCol = this.fillHandleService.state.currentColumn;
    const maxCol = this.gridData.columns - 1;
    if (currentCol < maxCol) {
      this.fillHandleService.updateDragColumn(currentCol + 1);
      this.drawFillHandleSelection();
    }

    const elapsed = Date.now() - this.autoScrollStartTime;
    const acceleration = Math.min(elapsed / 2000, 1);
    const delay =
      this.AUTO_SCROLL_INITIAL_DELAY -
      acceleration * (this.AUTO_SCROLL_INITIAL_DELAY - this.AUTO_SCROLL_MIN_DELAY);

    this.autoScrollTimer = setTimeout(() => this.doAutoScrollStep(), delay);
  }

  private stopAutoScroll(): void {
    if (this.autoScrollTimer) {
      clearTimeout(this.autoScrollTimer);
      this.autoScrollTimer = null;
    }
    this.autoScrollStartTime = 0;
  }

  private drawFillHandleSelection(): void {
    const state = this.fillHandleService.state;
    if (!state.startPosition) return;

    this.gridSurface.drawSchedule.refresh();

    const ctx = this.gridSurface.drawSchedule['canvasManager'].ctx;
    if (!ctx) return;

    const firstVisibleCol = this.scrollGrid.horizontalScrollPosition;
    const firstVisibleRow = this.scrollGrid.verticalScrollPosition;
    const cellWidth = this.gridSettings.cellWidth;
    const cellHeight = this.gridSettings.cellHeight;
    const headerHeight = this.gridSettings.cellHeaderHeight;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#4a90d9';

    for (let col = state.startPosition.column + 1; col <= state.currentColumn; col++) {
      const x = (col - firstVisibleCol) * cellWidth;
      const y = (state.startPosition.row - firstVisibleRow) * cellHeight + headerHeight;
      ctx.fillRect(x, y, cellWidth, cellHeight);
    }

    ctx.restore();

    const startCell = this.gridData.getCell(state.startPosition.row, state.startPosition.column);
    const previewText = startCell?.mainText;

    if (previewText) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#000000';
      ctx.font = this.gridFonts.mainFontStringZoom;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let col = state.startPosition.column + 1; col <= state.currentColumn; col++) {
        const isActive = this.gridData.isCellActive(state.startPosition.row, col);

        if (!isActive) {
          const x = (col - firstVisibleCol) * cellWidth + cellWidth / 2;
          const y = (state.startPosition.row - firstVisibleRow) * cellHeight + headerHeight + cellHeight / 2;
          ctx.fillText(previewText, x, y);
        }
      }

      ctx.restore();
    }
  }

  private async handleFillHandleDrop(): Promise<void> {
    this.stopAutoScroll();
    const result = this.fillHandleService.endDrag();
    this.el.nativeElement.style.cursor = 'default';

    if (!result || result.startColumn >= result.endColumn) {
      this.gridSurface.drawSchedule.refresh();
      return;
    }

    const scheduleDataService = this.gridData as ScheduleDataService;

    if (result.entryType === WorkScheduleEntryType.Break) {
      await this.handleFillHandleDropForBreak(scheduleDataService, result);
    } else {
      await this.handleFillHandleDropForWork(scheduleDataService, result);
    }

    this.gridSurface.drawSchedule.refresh();
  }

  private async handleFillHandleDropForBreak(
    scheduleDataService: ScheduleDataService,
    result: { startColumn: number; endColumn: number; row: number; entryId: string; workTime: number; entryType: number }
  ): Promise<void> {
    const sourceEntry = scheduleDataService.getWorkScheduleEntryForCell(result.row, result.startColumn);
    if (!sourceEntry) {
      return;
    }

    const breakEntriesToAdd: BreakCellParams[] = [];

    for (let col = result.startColumn + 1; col <= result.endColumn; col++) {
      if (scheduleDataService.isColumnSealed(col)) {
        continue;
      }

      if (scheduleDataService.isCellActive(result.row, col)) {
        continue;
      }

      const date = scheduleDataService.getDateForColumn(col);
      if (!date) {
        continue;
      }

      const clientIndex = scheduleDataService.rowGroupIndex[result.row];
      if (clientIndex === undefined) {
        continue;
      }

      const client = this.dataManagementSchedule.clients[clientIndex];
      if (!client?.id) {
        continue;
      }

      breakEntriesToAdd.push({
        clientId: client.id,
        absenceId: result.entryId,
        date: date,
        workTime: 0,
        startTime: sourceEntry.startTime ?? '00:00',
        endTime: sourceEntry.endTime ?? '00:00',
        description: sourceEntry.description ?? undefined,
      });
    }

    if (breakEntriesToAdd.length > 0) {
      await this.dataManagementSchedule.bulkAddBreakScheduleEntries(breakEntriesToAdd);
    }
  }

  private async handleFillHandleDropForWork(
    scheduleDataService: ScheduleDataService,
    result: { startColumn: number; endColumn: number; row: number; entryId: string; workTime: number; entryType: number }
  ): Promise<void> {
    const sourceEntry = scheduleDataService.getWorkScheduleEntryForCell(result.row, result.startColumn);

    const entriesToAdd: {
      clientId: string;
      date: Date;
      shiftId: string;
      workTime: number;
      startTime: string;
      endTime: string;
      information?: string;
    }[] = [];

    for (let col = result.startColumn + 1; col <= result.endColumn; col++) {
      if (scheduleDataService.isColumnSealed(col)) {
        continue;
      }

      if (scheduleDataService.isCellActive(result.row, col)) {
        continue;
      }

      const date = scheduleDataService.getDateForColumn(col);
      if (!date) {
        continue;
      }

      const shiftAvailable = this.dataManagementSchedule.shiftSchedules.find(
        (s) => s.shiftId === result.entryId && this.isSameDay(s.date, date)
      );

      if (!shiftAvailable) {
        continue;
      }

      const maxCapacity = shiftAvailable.sumEmployees * shiftAvailable.quantity;
      if (shiftAvailable.engaged >= maxCapacity) {
        continue;
      }

      const clientIndex = scheduleDataService.rowGroupIndex[result.row];
      if (clientIndex === undefined) {
        continue;
      }

      const client = this.dataManagementSchedule.clients[clientIndex];
      if (!client?.id) {
        continue;
      }

      entriesToAdd.push({
        clientId: client.id,
        date: date,
        shiftId: result.entryId,
        workTime: result.workTime,
        startTime: sourceEntry?.startTime || shiftAvailable.startShift,
        endTime: sourceEntry?.endTime || shiftAvailable.endShift,
        information: sourceEntry?.information ?? undefined,
      });
    }

    if (entriesToAdd.length > 0) {
      await this.dataManagementSchedule.bulkAddWorkScheduleEntries(entriesToAdd);
    }
  }

  private isSameDay(date1: Date | string, date2: Date | string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  private updateCursorForFillHandle(event: MouseEvent): void {
    if (this.gridSurface.nameId !== 'surface') {
      return;
    }

    if (!this.gridSurface.drawSchedule.showFillHandle) {
      return;
    }

    const pos = this.cellManipulation.Position;
    if (pos.isEmpty() || !this.gridData.isCellDraggable(pos.row, pos.column)) {
      this.el.nativeElement.style.cursor = 'default';
      return;
    }

    if (this.cellManipulation.PositionCollection.count() > 1) {
      this.el.nativeElement.style.cursor = 'default';
      return;
    }

    if (this.isOverFillHandle(event, pos)) {
      this.el.nativeElement.style.cursor = 'e-resize';
    } else {
      this.el.nativeElement.style.cursor = 'default';
    }
  }

  private isOverFillHandle(event: MouseEvent, selectedPos: MyPosition): boolean {
    const rect = this.el.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const firstVisibleCol = this.scrollGrid.horizontalScrollPosition;
    const firstVisibleRow = this.scrollGrid.verticalScrollPosition;
    const cellWidth = this.gridSettings.cellWidth;
    const cellHeight = this.gridSettings.cellHeight;
    const headerHeight = this.gridSettings.cellHeaderHeight;

    const cellX = (selectedPos.column - firstVisibleCol) * cellWidth;
    const cellY = (selectedPos.row - firstVisibleRow) * cellHeight + headerHeight;

    const handleCenterX = cellX + cellWidth;
    const handleCenterY = cellY + cellHeight;

    const dx = mouseX - handleCenterX;
    const dy = mouseY - handleCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const hitArea = this.FILL_HANDLE_HIT_AREA * this.gridSettings.zoom;

    return distance <= hitArea;
  }
}

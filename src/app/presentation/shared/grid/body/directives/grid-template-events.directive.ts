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

  @Output() rightClick = new EventEmitter<GridRightClickEvent>();

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

  @HostListener('mouseenter', ['$event']) onMouseEnter(event: MouseEvent) {}

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

    if (this.handleHeaderHover(event)) {
      return;
    }

    const pos: MyPosition =
      this.gridSurface.drawSchedule.calcCorrectCoordinate(event);

    this.updateHoveredCell(pos, event);

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
    // // Paste
    // if (e.Key == Key.V && IsCtrl) {
    //   try {
    //     zPaste();
    //     e.Handled = true;
    //     return;
    //   }
    //   catch (Exception ex)
    //   {
    //     Debug.Print("ucChildSimpleGrid.KeyDown: " + ex.Message);
    //   }
    // }

    // if (!(e.Key == Key.C && IsCtrl)) {
    //   if (!(e.Key == Key.V && IsCtrl)) {
    //     if (!(e.Key == Key.X && IsCtrl)) {
    //       if (!IsCtrl) {
    //         if (IsEditable) {
    //           if (EditMode == enEditableMode.Default | EditMode == enEditableMode.AnyKey) {
    //             if (p_PositionCollection.Count == 0 || ((p_PositionCollection.First.Row == p_PositionCollection.Last.Row) && (p_PositionCollection.First.Column == p_PositionCollection.Last.Column))) {
    //               if (!(e.OriginalSource) is System.Windows.Controls.TextBox)
    //               {
    //                 if (p_LastSelectedPositionState == enPositionState.None)
    //                   zEditSelectedCell();
    //               }
    //             }
    //           }
    //         }
    //       }
    //     }
    //   }
    // }
    event.stopPropagation();
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
    const entriesToDelete: { workId: string; clientId: string; date: Date; shiftId: string }[] = [];

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
      this.dataManagementSchedule.deleteWorkScheduleEntry(entry.workId, entry.clientId, entry.date, entry.shiftId);
    } else {
      this.dataManagementSchedule.bulkDeleteWorkScheduleEntries(entriesToDelete);
    }
  }

  private getDeleteInfoForPosition(
    scheduleDataService: ScheduleDataService,
    row: number,
    column: number
  ): { workId: string; clientId: string; date: Date; shiftId: string } | null {
    const entry = scheduleDataService.getWorkScheduleEntryForCell(row, column);
    if (!entry) {
      return null;
    }

    const date = scheduleDataService.getDateForColumn(column);
    if (!date) {
      return null;
    }

    return {
      workId: entry.workId,
      clientId: entry.clientId,
      date,
      shiftId: entry.shiftId,
    };
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Directive,
  ElementRef,
  HostListener,
  inject,
  NgZone,
} from '@angular/core';

import { AbsenceGanttSurfaceComponent } from '../absence-gantt-surface/absence-gantt-surface.component';
import { DrawCalendarGanttService } from 'src/app/presentation/workplace/absence-gantt/services/draw-calendar-gantt.service';

@Directive({
  selector: '[appAbsenceCalendar]',
  standalone: true,
})
export class AbsenceCalendarDirective {
  private el = inject(ElementRef);
  private gridBody = inject(AbsenceGanttSurfaceComponent);
  private drawCalendarGanttService = inject(DrawCalendarGanttService);

  private keyDown = false;
  private scrollByKey = false;
  private isDrawing = false;
  private hasCollection = false;
  private readonly SCROLL_THRESHOLD = 2;
  private readonly INDEX_CORRECTION = 1;
  private readonly PAGE_DOWN_SCROLL_OFFSET = 3;
  private readonly PAGE_UP_SCROLL_OFFSET = 0;

  // @HostListener('mouseenter', ['$event']) onMouseEnter(
  //   event: MouseEvent
  // ): void {}

  @HostListener('appClickOutside', ['$event']) onClickOutside(
    event: Event
  ): void {
    this.gridBody.destroyToolTip();
  }

  @HostListener('mouseleave', ['$event']) onMouseLeave(
    event: MouseEvent
  ): void {
    if (!this.isOwnElement(event)) {
      return;
    }

    this.gridBody.destroyToolTip();
  }

  @HostListener('mousewheel', ['$event']) onMouseWheel(
    event: Event
  ): void {
    if (!this.isOwnElement(event)) {
      return;
    }
    const wheelEvent = event as WheelEvent;
    const moveY: number = wheelEvent.deltaY === 0 ? 0 : wheelEvent.deltaY > 0 ? 1 : -1;
    const moveX: number = wheelEvent.deltaX === 0 ? 0 : wheelEvent.deltaX > 0 ? 1 : -1;

    if (moveX !== 0) {
      const newValue = this.gridBody.valueChangeHScrollbar + moveX;

      this.gridBody.valueHScrollbar.emit(newValue);
    }

    if (moveY !== 0) {
      const newValue = this.gridBody.valueChangeVScrollbar + moveY;

      this.gridBody.valueVScrollbar.emit(newValue);
    }

    this.stopEvent(event);
  }

  @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent): void {
    if (!this.isOwnElement(event)) {
      this.gridBody.drawCalendarGantt.isFocused = false;
      return;
    }

    this.gridBody.drawCalendarGantt.isFocused = true;

    if (event.buttons === 1) {
      this.gridBody.onSelectByMouse(event);
      this.gridBody.onMouseDown(event);
    }
    if (event.buttons === 2) {
      if (this.gridBody.contextMenu) {
        this.gridBody.contextMenu.closeMenu();
        this.stopEvent(event);
        if (this.gridBody.drawCalendarGantt.rows > 0) {
          this.gridBody.onSelectByMouse(event);
          this.gridBody.createContextMenu(event);
          this.gridBody.contextMenu.openMenu(event);
        }
      }
    }
    this.gridBody.setFocus();
  }

  @HostListener('click', ['$event']) onMouseClick(event: MouseEvent): void {
    this.gridBody.setFocus();
    this.stopEvent(event);
  }

  @HostListener('dblclick', ['$event']) onMouseDoubleClick(
    event: MouseEvent
  ): void {
    this.gridBody.setFocus();
  }

  @HostListener('mouseup', ['$event']) onMouseUp(event: MouseEvent): void {
    if (!this.gridBody.drawCalendarGantt.isFocused) {
      return;
    }

    this.gridBody.onMouseUp(event);

    this.stopEvent(event);
  }

  @HostListener('mousemove', ['$event']) onMouseMove(event: MouseEvent): void {
    if (!this.gridBody.drawCalendarGantt.isFocused) {
      return;
    }

    if (event.buttons === 0) {
      const col: number = this.gridBody.calcCorrectCoordinate(event).column;

      if (col < this.gridBody.drawCalendarGantt.columns && col >= 0) {
        const holiday = this.gridBody.holidayInfo(col);
        if (holiday) {
          this.gridBody.showToolTip(holiday!.currentName!, event);
          return;
        }
      }
      this.gridBody.hideToolTip();
    } else if (event.buttons === 1) {
      this.gridBody.onMouseMove(event);
    }
  }

  @HostListener('window:keydown', ['$event']) onKeyDown(
    event: KeyboardEvent
  ): void {
    if (!this.gridBody.dataManagementBreak.canReadBreaks) {
      return;
    }
    if (!this.isOwnElement(event)) {
      this.gridBody.drawCalendarGantt.isFocused = false;
      return;
    }

    this.gridBody.drawCalendarGantt.isFocused = true;

    this.keyDown = true;

    if (this.gridBody.contextMenu) {
      this.gridBody.contextMenu.closeMenu();
    }

    if (event.shiftKey) {
      this.gridBody.setShiftKey();
    }
    this.gridBody.isCtrl = event.ctrlKey;

    if (event.key === 'ArrowDown') {
      if (event.repeat) {
        if (this.gridBody.drawCalendarGantt.isBusy) {
          this.stopEvent(event);
          return;
        }
      }

      if (
        this.gridBody.drawCalendarGantt.selectedRow <
        this.gridBody.dataManagementBreak.rows - 1
      ) {
        const tmp =
          this.gridBody.drawCalendarGantt.selectedRow + this.INDEX_CORRECTION;

        const nextRow =
          tmp <= this.drawCalendarGanttService.rows - this.INDEX_CORRECTION
            ? tmp
            : this.drawCalendarGanttService.rows - this.INDEX_CORRECTION;

        this.drawCalendarGanttService.unDrawSelectionRow();
        this.drawCalendarGanttService.selectedRow = nextRow;

        if (
          this.drawCalendarGanttService.selectedRow >=
          this.drawCalendarGanttService.lastVisibleRow() - this.SCROLL_THRESHOLD
        ) {
          const newScrollPosition = this.gridBody.scroll.verticalScrollPosition + this.INDEX_CORRECTION;
          this.gridBody.valueVScrollbar.emit(newScrollPosition);
        }
      }

      this.stopEvent(event);
      return;
    }

    if (event.key === 'PageDown') {
      if (event.repeat) {
        if (this.gridBody.drawCalendarGantt.isBusy) {
          this.stopEvent(event);
          return;
        }
      }

      const visibleRows = this.gridBody.scroll.visibleRows;
      const currentSelectedRow = this.gridBody.drawCalendarGantt.selectedRow;
      const maxRows = this.gridBody.drawCalendarGantt.rows - 1;

      let newSelectedRow = currentSelectedRow + visibleRows;
      if (newSelectedRow > maxRows) {
        newSelectedRow = maxRows;
      }

      const firstVisible = this.drawCalendarGanttService.firstVisibleRow;
      const lastVisible = this.drawCalendarGanttService.lastVisibleRow();

      if (newSelectedRow >= lastVisible) {
        const newScrollPosition = newSelectedRow - visibleRows + this.PAGE_DOWN_SCROLL_OFFSET;
        this.gridBody.valueVScrollbar.emit(newScrollPosition);
      }

      this.drawCalendarGanttService.selectedRow = newSelectedRow;

      this.stopEvent(event);
      return;
    }

    if (event.key === 'ArrowUp') {
      if (event.repeat) {
        if (this.gridBody.drawCalendarGantt.isBusy) {
          this.stopEvent(event);
          return;
        }
      }

      if (this.gridBody.drawCalendarGantt.selectedRow > 0) {
        const tmp =
          this.gridBody.drawCalendarGantt.selectedRow - this.INDEX_CORRECTION;

        const nextRow =
          tmp <= this.drawCalendarGanttService.rows - this.INDEX_CORRECTION
            ? tmp
            : this.drawCalendarGanttService.rows - this.INDEX_CORRECTION;

        this.drawCalendarGanttService.unDrawSelectionRow();
        this.drawCalendarGanttService.selectedRow = nextRow;

        if (
          this.drawCalendarGanttService.firstVisibleRow >=
          this.drawCalendarGanttService.selectedRow
        ) {
          this.gridBody.valueVScrollbar.emit(nextRow);
        }
      }

      this.stopEvent(event);
      return;
    }

    if (event.key === 'PageUp') {
      if (event.repeat) {
        if (this.gridBody.drawCalendarGantt.isBusy) {
          this.stopEvent(event);
          return;
        }
      }

      const visibleRows = this.gridBody.scroll.visibleRows;
      const currentSelectedRow = this.gridBody.drawCalendarGantt.selectedRow;

      let newSelectedRow = currentSelectedRow - visibleRows;
      if (newSelectedRow < 0) {
        newSelectedRow = 0;
      }

      const firstVisible = this.drawCalendarGanttService.firstVisibleRow;

      if (newSelectedRow < firstVisible) {
        this.gridBody.valueVScrollbar.emit(newSelectedRow);
      }

      this.drawCalendarGanttService.selectedRow = newSelectedRow;

      this.stopEvent(event);
      return;
    }

    if (event.key === 'End') {
      const newValue = this.gridBody.scroll.maxRows;
      this.drawCalendarGanttService.selectedRow =
        this.drawCalendarGanttService.rows - 1;
      this.gridBody.valueVScrollbar.emit(newValue);

      this.stopEvent(event);
      return;
    }

    if (event.key === 'Home') {
      if (event.repeat) {
        if (this.gridBody.drawCalendarGantt.isBusy) {
          this.stopEvent(event);
          return;
        }
      }
      this.drawCalendarGanttService.selectedRow = 0;
      this.gridBody.valueVScrollbar.emit(0);

      this.stopEvent(event);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
      if (event.repeat) {
        if (this.gridBody.drawCalendarGantt.isBusy) {
          this.stopEvent(event);
          return;
        }
      }

      if (
        this.gridBody.drawCalendarGantt.selectedBreakIndex > -1 &&
        this.gridBody.drawCalendarGantt.selectedBreakIndex > 0
      ) {
        this.gridBody.drawCalendarGantt.selectedBreakIndex--;
        this.gridBody.showSelectedBreak();
      } else if (
        this.gridBody.drawCalendarGantt.selectedBreakIndex === -1 &&
        this.gridBody.drawCalendarGantt.selectedRowBreaksMaxIndex > -1
      ) {
        this.gridBody.drawCalendarGantt.selectedBreakIndex =
          this.gridBody.drawCalendarGantt.selectedRowBreaksMaxIndex;
        this.gridBody.showSelectedBreak();
      }

      this.stopEvent(event);
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'Tab') {
      if (event.repeat) {
        if (this.gridBody.drawCalendarGantt.isBusy) {
          this.stopEvent(event);
          return;
        }
      }

      if (
        this.gridBody.drawCalendarGantt.selectedBreakIndex > -1 &&
        this.gridBody.drawCalendarGantt.selectedRowBreaksMaxIndex >
          this.gridBody.drawCalendarGantt.selectedBreakIndex
      ) {
        this.gridBody.drawCalendarGantt.selectedBreakIndex++;
        this.gridBody.showSelectedBreak();
      } else if (
        this.gridBody.drawCalendarGantt.selectedBreakIndex === -1 &&
        this.gridBody.drawCalendarGantt.selectedRowBreaksMaxIndex > -1
      ) {
        this.gridBody.drawCalendarGantt.selectedBreakIndex = 0;
        this.gridBody.showSelectedBreak();
      }

      // if (this.gridBody.isShift) {
      //   if (this.gridBody.AnchorKeyPosition) { this.gridBody.drawSelectionDynamically(this.gridBody.AnchorKeyPosition as Position); }
      // }

      this.stopEvent(event);
      return;
    }

    // Delete
    if (event.key === 'Delete') {
      this.keyDown = false;
      this.stopEvent(event);
      this.gridBody.Delete();
      return;
    }

    // Cut
    if (event.key.toLocaleLowerCase() === 'x' && event.ctrlKey) {
      this.keyDown = false;
      this.stopEvent(event);
      this.gridBody.cut();
      return;
    }

    // Copy
    if (event.key === 'c' && event.ctrlKey) {
      this.keyDown = false;
      this.stopEvent(event);
      this.gridBody.copy();
      return;
    }

    // Paste
    if (event.key.toLocaleLowerCase() === 'v' && event.ctrlKey) {
      this.keyDown = false;
      this.stopEvent(event);
      this.gridBody.paste();
      return;
    }
  }

  @HostListener('window:keyup', ['$event']) onKeyUp(
    event: KeyboardEvent
  ): void {
    // if (!this.gridBody.isFocused) {
    //   return;
    // }

    this.keyDown = false;
    this.scrollByKey = false;
    if (!event.shiftKey) {
      this.gridBody.unSetShiftKey();
    }
    this.gridBody.isCtrl = false;
  }

  @HostListener('contextmenu', ['$event']) onContextMenu(event: Event): void {
    if (!this.isOwnElement(event)) {
      return;
    }
    this.stopEvent(event);
  }

  @HostListener('focus', ['$event']) onFocus(event: Event): void {
    if (!this.isOwnElement(event)) {
      return;
    }
    this.gridBody.drawCalendarGantt.isFocused = true;
  }

  @HostListener('blur', ['$event']) onBlur(event: Event): void {
    if (!this.isOwnElement(event)) {
      return;
    }

    this.gridBody.drawCalendarGantt.isFocused = false;
  }

  private stopEvent(event: Event): void {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
  }

  private isOwnElement(event: Event): boolean {
    const targetElement = event.target as HTMLElement;

    const hasId = targetElement.hasAttribute('id');
    const idValue = hasId ? targetElement.getAttribute('id') : '';

    if (idValue === 'absence-gantt-surface-id') {
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
}

import { Directive, ElementRef, HostListener, NgZone } from '@angular/core';

import { AbsenceGanttSurfaceComponent } from '../absence-gantt-surface/absence-gantt-surface.component';
import { Rectangle } from '../../../grid/classes/geometry';
import { DrawCalendarGanttService } from 'src/app/workplace/absence-gantt/services/draw-calendar-gantt.service';

@Directive({
    selector: '[appAbsenceCalendar]',
    standalone: false
})
export class AbsenceCalendarDirective {
  private keyDown = false;
  private scrollByKey = false;
  private isDrawing = false;
  private hasCollection = false;

  constructor(
    private el: ElementRef,
    private zone: NgZone,
    private gridBody: AbsenceGanttSurfaceComponent,
    private drawCalendarGanttService: DrawCalendarGanttService
  ) {}

  // @HostListener('mouseenter', ['$event']) onMouseEnter(
  //   event: MouseEvent
  // ): void {}

  @HostListener('clickOutside', ['$event']) onClickOutside(
    event: MouseEvent
  ): void {
    this.gridBody.destroyToolTip();

    const rect = new Rectangle();
    // this.gridBody.clientLeft,
    // this.gridBody.clientTop,
    // this.gridBody.clientWidth,
    // this.gridBody.clientHeight
    if (!rect.pointInRect(event.clientX, event.clientY)) {
      this.gridBody.contextMenu!.closeMenu();
    }
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
    event: WheelEvent
  ): void {
    if (!this.isOwnElement(event)) {
      return;
    }

    const moveY: number = event.deltaY === 0 ? 0 : event.deltaY > 0 ? 1 : -1;
    const moveX: number = event.deltaX === 0 ? 0 : event.deltaX > 0 ? 1 : -1;

    this.gridBody.drawCalendarGantt.moveCalendar(moveX, moveY);

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
      this.gridBody.contextMenu!.closeMenu();
      this.stopEvent(event);
      if (this.gridBody.drawCalendarGantt.rows > 0) {
        this.gridBody.onSelectByMouse(event);
        this.gridBody.createContextMenu(event);
        this.gridBody.contextMenu!.openMenu(event);
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
    this.gridBody.contextMenu!.closeMenu();

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
        this.gridBody.drawCalendarGantt.selectedRow =
          this.gridBody.drawCalendarGantt.selectedRow + 1;
        const lastRow = this.gridBody.drawCalendarGantt.lastVisibleRow() - 3;
        if (this.gridBody.drawCalendarGantt.selectedRow >= lastRow) {
          const diff = this.gridBody.drawCalendarGantt.selectedRow - lastRow;

          this.gridBody.scroll.verticalScrollPosition += diff;

          this.gridBody.drawCalendarGantt.moveCalendar(0, diff);
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

      let nextVisibleRow: number =
        this.gridBody.scroll.verticalScrollPosition +
        this.gridBody.scroll.visibleRows -
        1;

      if (nextVisibleRow > this.gridBody.drawCalendarGantt.rows) {
        nextVisibleRow = this.gridBody.drawCalendarGantt.rows - 1;
      }

      if (this.gridBody.scroll.maxRows <= 1) {
        this.gridBody.scroll.verticalScrollPosition = 0;
      } else if (this.gridBody.scroll.maxRows >= nextVisibleRow) {
        this.gridBody.scroll.verticalScrollPosition = nextVisibleRow;
      } else {
        this.gridBody.scroll.verticalScrollPosition =
          this.gridBody.scroll.maxRows;
      }

      this.drawCalendarGanttService.selectedRow = nextVisibleRow;

      this.gridBody.drawCalendarGantt.renderCalendar();

      if (this.gridBody.absenceRowHeader) {
        this.gridBody.drawRowHeader.createRuler();
        this.gridBody.drawRowHeader.drawCalendar();
      }

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
        this.gridBody.drawCalendarGantt.selectedRow =
          this.gridBody.drawCalendarGantt.selectedRow - 1;

        if (this.gridBody.scroll.maxRows <= 1) {
          this.gridBody.scroll.verticalScrollPosition = 0;
        } else {
          if (
            this.gridBody.scroll.verticalScrollPosition >
            this.gridBody.drawCalendarGantt.selectedRow
          ) {
            this.gridBody.scroll.verticalScrollPosition += -1;
            this.gridBody.drawCalendarGantt.moveCalendar(0, -1);
          }
        }

        this.stopEvent(event);
      }
      return;
    }

    if (event.key === 'PageUp') {
      if (event.repeat) {
        if (this.gridBody.drawCalendarGantt.isBusy) {
          this.stopEvent(event);
          return;
        }
      }

      let previousVisibleRow: number =
        this.gridBody.scroll.verticalScrollPosition -
        this.gridBody.scroll.visibleRows +
        1;

      if (previousVisibleRow < 0) {
        previousVisibleRow = 0;
      }

      if (this.gridBody.scroll.maxRows <= 1) {
        this.gridBody.scroll.verticalScrollPosition = 0;
      } else {
        this.gridBody.scroll.verticalScrollPosition = previousVisibleRow;
      }

      this.gridBody.drawCalendarGantt.selectedRow = previousVisibleRow;

      this.gridBody.drawCalendarGantt.renderCalendar();

      if (this.gridBody.absenceRowHeader) {
        this.gridBody.drawRowHeader.createRuler();
        this.gridBody.drawRowHeader.drawCalendar();
      }

      this.stopEvent(event);
      return;
    }

    if (event.key === 'End') {
      if (event.repeat) {
        if (this.gridBody.drawCalendarGantt.isBusy) {
          this.stopEvent(event);
          return;
        }
      }

      this.gridBody.scroll.verticalScrollPosition =
        this.gridBody.scroll.maxRows;

      this.gridBody.drawCalendarGantt.selectedRow =
        this.gridBody.dataManagementBreak.rows - 1;
      //this.gridBody.vScrollbar!.value = this.gridBody.scroll.maxRows;

      this.gridBody.drawCalendarGantt.renderCalendar();

      if (this.gridBody.absenceRowHeader) {
        this.gridBody.drawRowHeader.createRuler();
        this.gridBody.drawRowHeader.drawCalendar();
      }

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

      this.gridBody.scroll.verticalScrollPosition = 0;
      this.gridBody.drawCalendarGantt.selectedRow = 0;
      //this.gridBody.vScrollbar!.value = 0;

      this.gridBody.drawCalendarGantt.renderCalendar();

      if (this.gridBody.absenceRowHeader) {
        this.gridBody.drawRowHeader.createRuler();
        this.gridBody.drawRowHeader.drawCalendar();
      }

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
        this.gridBody.showBreak();
      } else if (
        this.gridBody.drawCalendarGantt.selectedBreakIndex === -1 &&
        this.gridBody.drawCalendarGantt.selectedRowBreaksMaxIndex > -1
      ) {
        this.gridBody.drawCalendarGantt.selectedBreakIndex =
          this.gridBody.drawCalendarGantt.selectedRowBreaksMaxIndex;
        this.gridBody.showBreak();
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
        this.gridBody.showBreak();
      } else if (
        this.gridBody.drawCalendarGantt.selectedBreakIndex === -1 &&
        this.gridBody.drawCalendarGantt.selectedRowBreaksMaxIndex > -1
      ) {
        this.gridBody.drawCalendarGantt.selectedBreakIndex = 0;
        this.gridBody.showBreak();
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
      return;
    }

    // Copy
    // if (event.key === 'c' && event.ctrlKey) {
    //   this.gridBody.cellManipulation!.copy();
    //   this.keyDown = false;
    //   this.stopEvent(event);
    //   return;
    // }

    // // Paste
    // if (event.key.toLocaleLowerCase() === 'v' && event.ctrlKey) {
    //   this.keyDown = false;
    //   this.stopEvent(event);
    //   return;
    // }

    // if (event.key === 'Enter' ) {
    //   this.keyDown = false;
    //   this.stopEvent(event);
    //   this.gridBody.closeEditableCell();
    //   if(this.gridBody.position.column < this.gridBody.calendarSetting.columns!){
    //     const pos = new Position(this.gridBody.position.row, this.gridBody.position.column +1);
    //     this.gridBody.position = pos;
    //     if (
    //       this.gridBody.position.column >
    //       this.gridBody.scroll.horizontalScrollPosition + this.gridBody.scroll.visibleCols
    //     ) {
    //       this.gridBody.moveCalendar(1, 0);
    //     }
    //   }
    //   return;
    // }

    // if (!event.ctrlKey) {
    //   if (this.gridBody.calendarSetting.gridSetting.isEditabled) {
    //     const pos = this.gridBody.position;
    //     if (pos) {
    //       const mode = this.gridBody.calendarSetting.cellMode(pos.row, pos.column);
    //       if (mode == EditableModeEnum.Default || mode == EditableModeEnum.AnyKey) {

    //         if (this.gridBody.calendarSetting.cellMode(pos.row, pos.column) != EditableModeEnum.None) {
    //           if (this.gridBody.isActivCellVisible()) {
    //             this.gridBody.createEditableCell();
    //           }

    //         }
    //       }
    //     }
    //   }
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

  // @HostListener('window:keypress', ['$event']) onKeyPress(
  //   event: KeyboardEvent
  // ): void {}

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

  // scrollOnPoint(pos: Position) {
  //   if (pos.column < this.gridBody.scroll.horizontalScrollPosition) {
  //     this.gridBody.moveCalendar(-1, 0);
  //     return;
  //   }

  //   const lastVisibleColum =
  //     this.gridBody.scroll.visibleCols + this.gridBody.scroll.horizontalScrollPosition;

  //   if (pos.column > lastVisibleColum) {
  //     this.gridBody.moveCalendar(1, 0);
  //     return;
  //   }

  //   if (pos.row < this.gridBody.scroll.verticalScrollPosition) {
  //     this.gridBody.moveCalendar(0, -1);
  //     return;
  //   }

  //   const lastVisibleRow =
  //     this.gridBody.scroll.visibleRows + this.gridBody.scroll.verticalScrollPosition;

  //   if (pos.row >= lastVisibleRow) {
  //     this.gridBody.moveCalendar(0, 1);
  //     return;
  //   }
  // }

  // private respondToLeftMouseDown(event: MouseEvent): void {
  //   this.gridBody.destroySelection();

  //   const pos: Position = this.gridBody.calcCorrectCoordinate(event);

  //   this.isDrawing = true;

  //   if (this.gridBody.position !== pos) {
  //     this.gridBody.closeEditableCell();
  //     this.gridBody.position = pos;
  //   }
  // }

  // private respondToRightMouseDown(event: MouseEvent): void {
  //   this.gridBody.closeEditableCell();
  //   this.gridBody.simpleContextMenu!.showContextMenu(event);
  // }

  private stopEvent(event: Event): void {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
    if (event.cancelBubble) event.cancelBubble = true;
  }

  private isOwnElement(event: Event): boolean {
    const targetElement = event.target as HTMLElement;
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

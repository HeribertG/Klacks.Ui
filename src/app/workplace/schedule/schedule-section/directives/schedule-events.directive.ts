/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Directive,
  ElementRef,
  HostListener,
  inject,
  ViewContainerRef,
} from '@angular/core';

import { Overlay } from '@angular/cdk/overlay';
import { MyPosition } from 'src/app/shared/grid/classes/position';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { BaseDataService } from 'src/app/shared/grid/services/data-setting/data.service';
import { BaseCellManipulationService } from 'src/app/shared/grid/services/body/cell-manipulation.service';
import { ScheduleScheduleSurfaceComponent } from '../schedule-schedule-surface/schedule-schedule-surface.component';

@Directive({
  selector: '[appScheduleEvents]',
  standalone: true,
})
export class ScheduleEventsDirective {
  private readonly el = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private gridSurface = inject(ScheduleScheduleSurfaceComponent);
  public overlay = inject(Overlay);
  public viewContainerRef = inject(ViewContainerRef);
  private gridData = inject(BaseDataService);
  private scrollGrid = inject(ScrollService);
  private cellManipulation = inject(BaseCellManipulationService);

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

  @HostListener('mouseenter', ['$event']) onMouseEnter(event: MouseEvent) {}

  @HostListener('mouseleave', ['$event']) onMouseLeave(event: MouseEvent) {
    if (!this.isOwnElement(event)) {
      return;
    }
    this.gridSurface.destroyToolTip();
  }

  @HostListener('mousewheel', ['$event']) onMouseWheel(
    event: WheelEvent
  ): void {
    const moveY: number = event.deltaY === 0 ? 0 : event.deltaY > 0 ? 1 : -1;
    const moveX: number = event.deltaX === 0 ? 0 : event.deltaX > 0 ? 1 : -1;

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
    event: MouseEvent
  ): void {
    this.gridSurface.destroyToolTip();
  }

  @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent): void {
    if (event.buttons === 1) {
      this.respondToLeftButtonMouseDown(event);
    } else if (event.buttons === 2) {
      this.respondToRightButtonMouseDown(event);
    }
  }

  @HostListener('mouseup', ['$event']) onMouseUp(event: MouseEvent): void {
    this.isDrawing = false;
    this.lastGoRightTime = 0;
    this.lastGoLeftTime = 0;
    this.lastGoUpTime = 0;
    this.lastGoDownTime = 0;
    this.lastPageDownTime = 0;
    this.lastPageUpTime = 0;

    if (this.hasCollection) {
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
    if (event.buttons === 1 && this.isDrawing) {
      const pos: MyPosition =
        this.gridSurface.drawSchedule.calcCorrectCoordinate(event);

      this.scrollOnPoint(pos);
      if (!this.gridSurface.drawSchedule.isPositionValid(pos)) {
        return;
      }

      this.gridSurface.drawSchedule.drawSelectionDynamically(pos);

      this.hasCollection = true;
    }

    if (event.buttons === 0) {
      const col: number =
        this.gridSurface.drawSchedule.calcCorrectCoordinate(event).column;

      if (col < this.gridData.columns && col >= 0) {
        const holiday = this.gridData.holidayInfo(col);
        if (holiday) {
          const holidayName = holiday.currentName;
          this.gridSurface.showToolTip({ value: holidayName, event });
          return;
        }
      }
      this.gridSurface.hideToolTip();
    }
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

    if (event.key === 'ArrowRight' || event.key === 'Tab') {
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

    // if (e.Key == Input.Key.Delete) {
    //   zDelete();
    //   e.Handled = true;
    //   p_KeyDown = false;
    //   return;
    // }

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    event: KeyboardEvent
  ): void {
    this.keyDown = false;
    this.scrollByKey = false;
  }

  @HostListener('window:keypress', ['$event']) onKeyPress(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    this.gridSurface.showContextMenu(event);
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
        this.gridSurface.drawSchedule.drawGridSelectedHeaderCell();
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
    this.gridSurface.drawSchedule.drawGridSelectedHeaderCell();
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
    this.gridSurface.drawSchedule.drawGridSelectedHeaderCell();
    this.gridSurface.drawSchedule.drawGridSelectedCell();
  }
}

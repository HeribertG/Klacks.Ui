import {
  Directive,
  HostListener,
  inject,
  ViewContainerRef,
} from '@angular/core';

import { Overlay } from '@angular/cdk/overlay';
import { ScheduleScheduleSurfaceComponent } from '../../schedule-schedule-surface/schedule-schedule-surface.component';
import { DataService } from '../services/data.service';
import { MyPosition } from 'src/app/grid/classes/position';
import { CellManipulationService } from '../services/cell-manipulation.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';

@Directive({
  selector: '[appCellEvents]',
  standalone: true,
})
export class CellEventsDirective {
  private gridSurface = inject(ScheduleScheduleSurfaceComponent);
  public overlay = inject(Overlay);
  public viewContainerRef = inject(ViewContainerRef);
  private gridData = inject(DataService);
  private scrollGrid = inject(ScrollService);
  private cellManipulation = inject(CellManipulationService);

  private keyDown = false;
  private scrollByKey = false;
  private isDrawing = false;
  private hasCollection = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  @HostListener('mouseenter', ['$event']) onMouseEnter(event: MouseEvent) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  @HostListener('mouseleave', ['$event']) onMouseLeave(event: MouseEvent) {
    this.gridSurface.destroyToolTip();
  }

  @HostListener('mousewheel', ['$event']) onMouseWheel(
    event: WheelEvent
  ): void {
    const moveY: number = event.deltaY === 0 ? 0 : event.deltaY > 0 ? 1 : -1;
    const moveX: number = event.deltaX === 0 ? 0 : event.deltaX > 0 ? 1 : -1;

    this.gridSurface.drawSchedule.moveGrid(moveX, moveY);

    if (this.gridSurface && this.gridSurface.vScrollbar) {
      this.gridSurface.vScrollbar.refresh();
    }

    if (this.gridSurface && this.gridSurface.hScrollbar) {
      this.gridSurface.hScrollbar.refresh();
    }
  }

  @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent): void {
    if (event.buttons === 1) {
      this.respondToLeftMouseDown(event);
    } else if (event.buttons === 2) {
      this.respondToRightMouseDown(event);
    }
  }

  @HostListener('mouseup', ['$event']) onMouseUp(event: MouseEvent): void {
    this.isDrawing = false;

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

    // const _isShift: boolean = event.shiftKey;
    // const _isCtrl = event.ctrlKey;

    if (event.key === 'ArrowDown') {
      if (event.repeat) {
        event.preventDefault();
        return;
      }

      if (
        this.gridSurface.drawSchedule.position &&
        this.gridSurface.drawSchedule.position.row < this.gridData.rows
      ) {
        this.gridSurface.drawSchedule.position = new MyPosition(
          this.gridSurface.drawSchedule.position.row + 1,
          this.gridSurface.drawSchedule.position.column
        );

        if (this.scrollGrid.maxRows <= 1) {
          this.scrollGrid.verticalScrollPosition = 0;
        } else {
          if (
            this.scrollGrid.verticalScrollPosition +
              this.scrollGrid.visibleRows -
              3 <
            this.gridSurface.drawSchedule.position.row
          ) {
            this.gridSurface.drawSchedule.moveGrid(0, 1);
          }
        }

        if (this.gridSurface && this.gridSurface.vScrollbar) {
          this.gridSurface.vScrollbar.refresh();
        }

        event.preventDefault();
        return;
      }
    }

    if (event.key === 'PageDown') {
      if (event.repeat) {
        event.preventDefault();
        return;
      }

      let nextVisibleRow: number =
        this.scrollGrid.verticalScrollPosition +
        this.scrollGrid.visibleRows -
        1;

      if (nextVisibleRow > this.gridData.rows) {
        nextVisibleRow = this.gridData.rows - 1;
      }

      if (this.scrollGrid.maxRows <= 1) {
        this.scrollGrid.verticalScrollPosition = 0;
      } else if (this.scrollGrid.maxRows >= nextVisibleRow) {
        this.scrollGrid.verticalScrollPosition = nextVisibleRow;
      } else {
        this.scrollGrid.verticalScrollPosition = this.scrollGrid.maxRows;
      }

      if (this.gridSurface.drawSchedule.position) {
        this.gridSurface.drawSchedule.position = new MyPosition(
          nextVisibleRow,
          this.gridSurface.drawSchedule.position.column
        );
      }

      this.gridSurface.drawSchedule.drawGrid();

      if (this.gridSurface && this.gridSurface.vScrollbar) {
        this.gridSurface.vScrollbar.refresh();
      }

      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowUp') {
      if (event.repeat) {
        event.preventDefault();
        return;
      }

      if (
        this.gridSurface.drawSchedule.position &&
        this.gridSurface.drawSchedule.position.row > 0
      ) {
        const tmpRow: number = this.gridSurface.drawSchedule.position.row - 1;

        this.gridSurface.drawSchedule.position = new MyPosition(
          tmpRow,
          this.gridSurface.drawSchedule.position.column
        );

        if (this.scrollGrid.maxRows <= 1) {
          this.scrollGrid.verticalScrollPosition = 0;
        } else {
          if (
            this.scrollGrid.verticalScrollPosition >
            this.gridSurface.drawSchedule.position.row
          ) {
            this.gridSurface.drawSchedule.moveGrid(0, -1);
          }
        }

        if (this.gridSurface && this.gridSurface.vScrollbar) {
          this.gridSurface.vScrollbar.refresh();
        }

        event.preventDefault();
        return;
      }
    }

    if (event.key === 'PageUp') {
      if (event.repeat) {
        event.preventDefault();
        return;
      }

      let previousVisibleRow: number =
        this.scrollGrid.verticalScrollPosition -
        this.scrollGrid.visibleRows +
        1;

      if (previousVisibleRow < 0) {
        previousVisibleRow = 0;
      }

      if (this.scrollGrid.maxRows <= 1) {
        this.scrollGrid.verticalScrollPosition = 0;
      } else {
        this.scrollGrid.verticalScrollPosition = previousVisibleRow;
      }

      if (this.gridSurface.drawSchedule.position) {
        this.gridSurface.drawSchedule.position = new MyPosition(
          previousVisibleRow,
          this.gridSurface.drawSchedule.position.column
        );
      }

      this.gridSurface.drawSchedule.drawGrid();
      event.preventDefault();
      return;
    }

    if (event.key === 'End') {
      if (event.repeat) {
        // const isOkToWrite :boolean = event
        event.preventDefault();
        return;
      }

      if (this.scrollGrid.maxRows <= 1) {
        this.scrollGrid.verticalScrollPosition = 0;
      } else {
        this.scrollGrid.verticalScrollPosition = this.scrollGrid.maxRows;
      }

      if (this.gridSurface.drawSchedule.position) {
        this.gridSurface.drawSchedule.position = new MyPosition(
          this.gridData.rows - 1,
          this.gridSurface.drawSchedule.position.column
        );
      }

      this.gridSurface.drawSchedule.drawGrid();

      if (this.gridSurface && this.gridSurface.vScrollbar) {
        this.gridSurface.vScrollbar.refresh();
      }

      event.preventDefault();
      return;
    }

    if (event.key === 'Home') {
      if (event.repeat) {
        event.preventDefault();
        return;
      }

      this.scrollGrid.verticalScrollPosition = 0;

      if (this.gridSurface.drawSchedule.position) {
        this.gridSurface.drawSchedule.position = new MyPosition(
          0,
          this.gridSurface.drawSchedule.position.column
        );
      }

      this.gridSurface.drawSchedule.drawGrid();
      if (this.gridSurface && this.gridSurface.vScrollbar) {
        this.gridSurface.vScrollbar.refresh();
      }
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
      if (event.repeat) {
        event.preventDefault();
        return;
      }

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
          this.gridSurface.drawSchedule.moveGrid(-1, 0);
        }
      }
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'Tab') {
      if (event.repeat) {
        event.preventDefault();
        return;
      }

      if (
        this.gridSurface.drawSchedule.position &&
        this.gridSurface.drawSchedule.position.column <
          this.gridData.columns - 1
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
          this.gridSurface.drawSchedule.moveGrid(1, 0);
        }
      }
      event.preventDefault();
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      this.gridSurface.drawSchedule.moveGrid(-1, 0);
      return;
    }

    const lastVisibleColum =
      this.scrollGrid.visibleCols + this.scrollGrid.horizontalScrollPosition;

    if (pos.column > lastVisibleColum) {
      this.gridSurface.drawSchedule.moveGrid(1, 0);
      return;
    }

    if (pos.row < this.scrollGrid.verticalScrollPosition) {
      this.gridSurface.drawSchedule.moveGrid(0, -1);
      return;
    }

    const lastVisibleRow =
      this.scrollGrid.visibleRows + this.scrollGrid.verticalScrollPosition;

    if (pos.row >= lastVisibleRow) {
      this.gridSurface.drawSchedule.moveGrid(0, 1);
      return;
    }
  }

  private respondToLeftMouseDown(event: MouseEvent): void {
    this.gridSurface.drawSchedule.destroySelection();

    const pos: MyPosition =
      this.gridSurface.drawSchedule.calcCorrectCoordinate(event);
    this.isDrawing = true;

    if (this.gridSurface.drawSchedule.position !== pos) {
      this.gridSurface.drawSchedule.position = pos;
    }
  }

  private respondToRightMouseDown(event: MouseEvent): void {
    this.gridSurface.showContextMenu(event);
  }
}

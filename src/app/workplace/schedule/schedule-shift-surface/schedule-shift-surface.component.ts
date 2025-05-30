import { Component, ElementRef, inject, Input } from '@angular/core';
import { ContextMenuComponent } from 'src/app/shared/context-menu/context-menu.component';
import { SelectedArea } from 'src/app/grid/enums/breaks_enums';
import { Subject } from 'rxjs';
import { HolidayCollectionService } from 'src/app/grid/services/holiday-collection.service';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/shared.module';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';

@Component({
  selector: 'app-schedule-shift-surface',
  templateUrl: './schedule-shift-surface.component.html',
  styleUrls: ['./schedule-shift-surface.component.scss'],
  standalone: true,
  imports: [CommonModule, SharedModule],
})
export class ScheduleShiftSurfaceComponent {
  @Input() contextMenu: ContextMenuComponent | undefined;

  public holidayCollection = inject(HolidayCollectionService);
  public scroll = inject(ScrollService);
  private el = inject(ElementRef);

  resizeWindow: (() => void) | undefined;
  visibilitychangeWindow: (() => void) | undefined;

  private ctx: CanvasRenderingContext2D | undefined;
  private canvas: HTMLCanvasElement | undefined;
  private renderCanvasCtx: CanvasRenderingContext2D | undefined;
  private renderCanvas: HTMLCanvasElement | undefined;
  private headerCanvas: HTMLCanvasElement | undefined;
  private headerCtx: CanvasRenderingContext2D | undefined;
  private backgroundRowCanvas: HTMLCanvasElement | undefined;
  private backgroundRowCtx: CanvasRenderingContext2D | undefined;
  private rowCanvas: HTMLCanvasElement | undefined;
  private rowCtx: CanvasRenderingContext2D | undefined;
  private tooltip: HTMLDivElement | undefined;
  private startDate: Date = new Date();
  private _pixelRatio = 1;
  private _columns = 365;
  private _isFocused = false;
  private mouseToBarAlpha: { x: number; y: number } | undefined;

  public selectedArea: SelectedArea = SelectedArea.None;
  public isLeftMouseDown = false;

  isBusy = false;
  isShift = false;
  isCtrl = false;

  private ngUnsubscribe = new Subject<void>();

  /* #region ng */

  /* #endregion ng */

  /* #region   resize+visibility */

  setFocus(): void {
    const x = this.el.nativeElement as HTMLDivElement;
    if (x) {
      x.autofocus === true;
      x.focus();
      this._isFocused = true;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  private resize = (event: any): void => {
    const pixelRatio = DrawHelper.pixelRatio();
    if (this._pixelRatio !== pixelRatio) {
      this._pixelRatio = pixelRatio;

      this.deleteCanvas();
      this.createCanvas();
    }

    this.onResize();
  };

  onResize(): void {
    // this.setMetrics();
    // this.refreshCalendar();
    // this.drawCalendar();
    // this.resetAll();
  }

  /* #endregion   resize+visibility */

  /* #region   render */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  moveGrid(directionX: number, directionY: number): void {}

  /* #endregion   render */

  /* #region   create */

  private createCanvas() {
    this.canvas = document.getElementById(
      'calendarCanvas'
    ) as HTMLCanvasElement;
    this.ctx = DrawHelper.createHiDPICanvas(
      this.canvas,
      this.canvas.clientWidth,
      this.canvas.clientHeight
    );
    DrawHelper.setAntiAliasing(this.ctx);

    this.renderCanvas = document.createElement('canvas') as HTMLCanvasElement;
    this.renderCanvasCtx = DrawHelper.createHiDPICanvas(
      this.renderCanvas,
      this.canvas.clientWidth,
      this.canvas.clientHeight,
      true
    );
    DrawHelper.setAntiAliasing(this.renderCanvasCtx);

    this.headerCanvas = document.createElement('canvas') as HTMLCanvasElement;
    this.headerCtx = DrawHelper.createHiDPICanvas(
      this.headerCanvas,
      this.canvas.clientWidth,
      24, //this.calendarSetting.cellHeaderHeight,
      true
    );
    DrawHelper.setAntiAliasing(this.headerCtx);

    this.backgroundRowCanvas = document.createElement(
      'canvas'
    ) as HTMLCanvasElement;
    this.backgroundRowCtx = DrawHelper.createHiDPICanvas(
      this.backgroundRowCanvas,
      this.canvas.clientWidth,
      24, //this.calendarSetting.cellHeight,
      true
    );
    DrawHelper.setAntiAliasing(this.backgroundRowCtx);

    this.rowCanvas = document.createElement('canvas') as HTMLCanvasElement;
    this.rowCtx = DrawHelper.createHiDPICanvas(
      this.rowCanvas,
      this.canvas.clientWidth,
      24, //this.calendarSetting.cellHeight,
      true
    );
    DrawHelper.setAntiAliasing(this.rowCtx);
  }

  private deleteCanvas() {
    this.ctx = undefined;
    this.canvas = undefined;
    this.renderCanvasCtx = undefined;
    this.renderCanvas = undefined;
    this.headerCanvas = undefined;
    this.headerCtx = undefined;
    this.backgroundRowCanvas = undefined;
    this.backgroundRowCtx = undefined;
    this.rowCanvas = undefined;
    this.rowCtx = undefined;
  }

  isCanvasAvailable(): boolean {
    // if (!this.calendarSetting) {
    //   return false;
    // }
    if (!this.canvas) {
      return false;
    }
    if (!(this.canvas!.clientHeight || this.canvas!.clientWidth)) {
      return false;
    }
    return true;
  }

  /* #region   create */

  /* #region   drag-drop */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  dragOver(ev: DragEvent) {
    // ev.preventDefault();
    // if (ev.dataTransfer) {
    //   const position = this.calcDroppedCell(ev.offsetX, ev.offsetY);
    //   if (this.dragRow !== position[1]) {
    //     this.unDrawDragRow();
    //     this.dragRow = position[1];
    //     this.drawDragRow();
    //     this.unDrawSelectionRow();
    //     this.drawSelectionRow();
    //   }
    // }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  drop(ev: any) {
    // ev.preventDefault();
    // if (ev.dataTransfer) {
    //   const absenceId = ev.dataTransfer.getData('text/plain');
    //   const position = this.calcDroppedCell(ev.offsetX, ev.offsetY);
    //   this.unDrawDragRow();
    //   this.selectedRow = position[1];
    //   this.addBreak(position, absenceId);
    // }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private calcDroppedCell(offsetX: number, offsetY: number): number[] {
    // if (this.canvas) {
    //   let deltaX = Math.ceil(offsetX / this.calendarSetting.cellWidth) - 1;
    //   let deltaY =
    //     Math.ceil(
    //       (offsetY - this.calendarSetting.cellHeaderHeight) /
    //         this.calendarSetting.cellHeight
    //     ) - 1;

    //   deltaX += this.scroll.horizontalScrollPosition;
    //   deltaY += this.scroll.verticalScrollPosition;

    //   return [deltaX, deltaY];
    // }
    return [-1, -1];
  }

  /* #endregion   drag-drop */
}

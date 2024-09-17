import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Renderer2,
} from '@angular/core';
import { ContextMenuComponent } from 'src/app/shared/context-menu/context-menu.component';
import { ScheduleVScrollbarComponent } from '../schedule-v-scrollbar/schedule-v-scrollbar.component';
import { SelectedArea } from 'src/app/grid/enums/breaks_enums';
import { Subject } from 'rxjs';
import { CalendarSettingService } from 'src/app/workplace/absence-gantt/services/calendar-setting.service';
import { HolidayCollectionService } from 'src/app/grid/services/holiday-collection.service';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { Clipboard } from '@angular/cdk/clipboard';
import { ScrollService } from '../services/scroll.service';
import { DataScheduleService } from 'src/app/data/data-schedule.service';

@Component({
  selector: 'app-schedule-shift-surface',
  templateUrl: './schedule-shift-surface.component.html',
  styleUrls: ['./schedule-shift-surface.component.scss'],
})
export class ScheduleShiftSurfaceComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() contextMenu: ContextMenuComponent | undefined;
  @Input() vScrollbar: ScheduleVScrollbarComponent | undefined;

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
  private _columns: number = 365;
  private _isFocused = false;
  private mouseToBarAlpha: { x: number; y: number } | undefined;

  public selectedArea: SelectedArea = SelectedArea.None;
  public isLeftMouseDown = false;

  isBusy = false;
  isShift = false;
  isCtrl = false;

  private ngUnsubscribe = new Subject<void>();

  constructor(
    public holidayCollection: HolidayCollectionService,
    public calendarSetting: CalendarSettingService,
    public scroll: ScrollService,
    private el: ElementRef
  ) {}

  /* #region ng */
  ngOnInit(): void {}

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {}
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

  private resize = (event: any): void => {
    const pixelRatio = DrawHelper.pixelRatio();
    if (this._pixelRatio !== pixelRatio) {
      this._pixelRatio = pixelRatio;

      this.deleteCanvas();
      this.createCanvas();
    }

    if (this.vScrollbar) {
      this.vScrollbar.resize();
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
      this.calendarSetting.cellHeaderHeight,
      true
    );
    DrawHelper.setAntiAliasing(this.headerCtx);

    this.backgroundRowCanvas = document.createElement(
      'canvas'
    ) as HTMLCanvasElement;
    this.backgroundRowCtx = DrawHelper.createHiDPICanvas(
      this.backgroundRowCanvas,
      this.canvas.clientWidth,
      this.calendarSetting.cellHeight,
      true
    );
    DrawHelper.setAntiAliasing(this.backgroundRowCtx);

    this.rowCanvas! = document.createElement('canvas') as HTMLCanvasElement;
    this.rowCtx = DrawHelper.createHiDPICanvas(
      this.rowCanvas,
      this.canvas.clientWidth,
      this.calendarSetting.cellHeight,
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
    if (!this.calendarSetting) {
      return false;
    }
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

  private calcDroppedCell(offsetX: number, offsetY: number): number[] {
    // if (this.canvas) {
    //   let deltaX = Math.ceil(offsetX / this.calendarSetting.cellWidth) - 1;
    //   let deltaY =
    //     Math.ceil(
    //       (offsetY - this.calendarSetting.cellHeaderHeight) /
    //         this.calendarSetting.cellHeight
    //     ) - 1;

    //   deltaX += this.scroll.hScrollValue;
    //   deltaY += this.scroll.vScrollValue;

    //   return [deltaX, deltaY];
    // }
    return [-1, -1];
  }

  /* #endregion   drag-drop */
}

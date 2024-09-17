import {
  AfterViewInit,
  Component,
  HostListener,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';

import { AbsenceGanttSurfaceComponent } from '../absence-gantt-surface/absence-gantt-surface.component';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { Gradient3DBorderStyleEnum } from 'src/app/grid/enums/gradient-3d-border-style';
import { ScrollService } from 'src/app/workplace/absence-gantt/services/scroll.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-absence-gantt-v-scrollbar',
  templateUrl: './absence-gantt-v-scrollbar.component.html',
  styleUrls: ['./absence-gantt-v-scrollbar.component.scss'],
})
export class AbsenceGanttVScrollbarComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  public maximumRow: number = 0;

  private ctx: CanvasRenderingContext2D | undefined;
  private canvas: HTMLCanvasElement | undefined;

  private _scrollValue = 0;
  private thumbLength = 0;
  private tickSize = 0;
  private MouseEnterThumb = false;
  private MousePointThumb = false;
  private MouseYToThumbY = 0;
  private MouseOverThumb = false;
  private imgThumb: ImageData | undefined;
  private imgSelectedThumb: ImageData | undefined;
  public isDirty = false;
  private requestID: number | undefined;
  private moveAnimationValue = 0;
  private ngUnsubscribe = new Subject<void>();

  @Input() absenceBody: AbsenceGanttSurfaceComponent | undefined;

  constructor(private zone: NgZone, private scroll: ScrollService) {}

  /* #region ng */

  ngOnInit() {
    this.createCanvas();
  }

  ngAfterViewInit() {
    this.scrollTop = 0;
    this.refresh();

    this.scroll!.moveVerticalEvent.pipe(
      takeUntil(this.ngUnsubscribe)
    ).subscribe(() => {
      this.zone.runOutsideAngular(() => {
        this.refresh();
      });
    });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    this.deleteCanvas();

    this.imgThumb = undefined;
    this.imgSelectedThumb = undefined;
  }

  /* #endregion ng */

  init(): void {
    this.scrollTop = 0;
    this.refresh();
  }

  resize(): void {
    this.deleteCanvas();
    this.createCanvas();
    this.refresh();
  }

  // tslint:disable-next-line:variable-name
  private set scrollTop(_value: number) {
    if (this.isDirty) {
      return;
    }

    if (_value === undefined || Number.isNaN(_value)) {
      _value = 0;
    }

    if (this._scrollValue !== _value) {
      this._scrollValue = _value;

      let res: number = Math.ceil(this._scrollValue / this.tickSize);
      if (res === undefined || Number.isNaN(res)) {
        res = 0;
      }

      const diff: number = res - this.scroll!.vScrollValue;

      this.isDirty = true;
      if (diff !== 0) {
        this.absenceBody!.moveCalendar(0, diff);
        this.scroll!.isMoveVertical(diff);
      }

      this.isDirty = false;
    }
  }
  private get scrollTop(): number {
    let res: number = Math.ceil(this.scroll!.vScrollValue * this.tickSize);
    if (res === undefined || Number.isNaN(res)) {
      res = 0;
    }
    return res;
  }

  // tslint:disable-next-line:variable-name
  set value(_value: number) {
    if (_value === undefined || Number.isNaN(_value)) {
      _value = 0;
    }

    let res: number = Math.ceil(this.scroll!.vScrollValue * this.tickSize);
    if (res === undefined || Number.isNaN(res)) {
      res = 0;
    }

    this._scrollValue = res;

    this.reDraw();
  }
  get value(): number {
    return this.scroll!.vScrollValue;
  }

  refresh() {
    this.calcMetrics();
    this.reDraw();
  }

  private reDraw() {
    if (!this.scroll) {
      return;
    }
    if (this.thumbLength === Infinity) {
      return;
    }
    if (this.tickSize === Infinity) {
      return;
    }

    if (this.canvas && this.ctx && this.imgSelectedThumb && this.imgThumb) {
      this.canvas.width = this.canvas.clientWidth;
      this.canvas.height = this.canvas.clientHeight;

      this.ctx.save();

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (this.MouseOverThumb) {
        this.ctx.putImageData(this.imgSelectedThumb, 3, this.scrollTop);
      } else {
        this.ctx.putImageData(this.imgThumb, 3, this.scrollTop);
      }
      this.ctx.restore();
    }
  }

  private createThumb(): void {
    if (this.thumbLength === -Infinity) {
      return;
    }
    if (this.thumbLength === Infinity) {
      return;
    }

    this.imgThumb = undefined;
    this.imgSelectedThumb = undefined;

    const canvas = document.createElement('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d', {
      willReadFrequently: true,
    }) as CanvasRenderingContext2D;

    canvas.width = this.canvas!.clientWidth - 6;
    canvas.height = this.thumbLength;

    ctx.fillStyle = '#A9A9A9';

    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.imgThumb = ctx.getImageData(0, 0, canvas.width, canvas.height);

    DrawHelper.drawBorder(
      ctx,
      0,
      0,
      canvas.width,
      canvas.height,
      ctx.fillStyle,
      3,
      Gradient3DBorderStyleEnum.Raised
    );

    this.imgSelectedThumb = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  private calcMetrics(): void {
    if (!this.scroll) {
      return;
    }

    if (this.canvas) {
      const h: number = this.canvas!.clientHeight;
      let moveZoneLength = h / this.scroll!.rowPercent;

      this.thumbLength = this.canvas!.clientHeight - moveZoneLength;

      if (this.thumbLength < 10) {
        this.thumbLength = 10;
        moveZoneLength -= 10;
      }

      this.tickSize = moveZoneLength / this.scroll!.maxRows;
      this.createThumb();
    }
  }
  /* #region Events */

  @HostListener('click', ['$event']) onClick(event: MouseEvent): void {}

  @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent): void {
    this.MouseEnterThumb = this.isMouseOverThumb(event);
    this.MouseOverThumb = this.MouseEnterThumb;

    if (this.MouseEnterThumb) {
    } else {
      if (event.clientY < this.scrollTop + this.canvas!.offsetTop) {
        this.moveAnimationValue = -1;
      } else {
        this.moveAnimationValue = 1;
      }
      this.moveAnimation();
    }
  }

  @HostListener('mouseup', ['$event']) onMouseUp(event: MouseEvent): void {
    this.MouseEnterThumb = false;
    this.MouseYToThumbY = 0;
    this.canvas!.onpointermove = null;
    this.stopMoveAnimation();
  }

  @HostListener('pointerdown', ['$event']) onPointerDown(
    event: PointerEvent
  ): void {
    if (this.isMouseOverThumb(event) && event.buttons === 1) {
      this.MousePointThumb = true;
      this.MouseYToThumbY = event.clientY - this.scrollTop;
      this.canvas!.setPointerCapture(event.pointerId);
    }
  }
  @HostListener('pointerup', ['$event']) onPointerUp(
    event: PointerEvent
  ): void {
    this.MousePointThumb = false;
    this.canvas!.releasePointerCapture(event.pointerId);
  }
  @HostListener('pointermove', ['$event']) onPointerMove(
    event: PointerEvent
  ): void {
    const y = event.clientY - this.MouseYToThumbY;
    this.zone.runOutsideAngular(() => {
      if (this.MousePointThumb) {
        this.scrollTop = y;
      }
    });
  }

  @HostListener('mousemove', ['$event']) onMouseMove(event: MouseEvent): void {
    this.MouseOverThumb = this.isMouseOverThumb(event);

    this.refresh();
  }

  @HostListener('mouseleave', ['$event']) onMouseLeave(
    event: MouseEvent
  ): void {
    this.MouseOverThumb = false;
  }

  @HostListener('mouseenter', ['$event']) onMouseEnter(
    event: MouseEvent
  ): void {
    this.MouseOverThumb = this.isMouseOverThumb(event);
    this.refresh();
  }

  @HostListener('mouseover', ['$event']) onMouseOver(event: MouseEvent): void {}

  /* #endregion events */

  isMouseOverThumb(event: MouseEvent): boolean {
    const y: number = event.clientY - this.canvas!.offsetTop;

    if (y >= this.scrollTop && y <= this.scrollTop + this.thumbLength) {
      return true;
    }

    return false;
  }

  moveAnimation() {
    if (this.moveAnimationValue < 0) {
      this.absenceBody!.moveCalendar(0, -5);
      this.scroll!.isMoveVertical(-5);
    } else if (this.moveAnimationValue > 0) {
      this.absenceBody!.moveCalendar(0, 5);
      this.scroll!.isMoveVertical(5);
    }

    this.requestID = window.requestAnimationFrame((x) => {
      this.moveAnimation();
    });
  }
  stopMoveAnimation(): void {
    this.moveAnimationValue = 0;
    window.cancelAnimationFrame(this.requestID!);
  }

  private deleteCanvas() {
    this.ctx = undefined;
    this.canvas = undefined;
  }
  private createCanvas() {
    this.canvas = document.getElementById(
      'cal-vScrollbar'
    ) as HTMLCanvasElement;
    this.ctx = DrawHelper.createHiDPICanvas(
      this.canvas,
      this.canvas.clientWidth,
      this.canvas.clientHeight
    );
  }
}

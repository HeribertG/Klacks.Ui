import {
  AfterViewInit,
  Component,
  HostListener,
  Input,
  NgZone,
  OnDestroy,
} from '@angular/core';

import { DrawHelper } from 'src/app/helpers/draw-helper';
import { AbsenceGanttSurfaceComponent } from '../absence-gantt-surface/absence-gantt-surface.component';
import { Subject, takeUntil } from 'rxjs';
import { ScrollService } from '../services/scroll.service';
import { GridColorService } from 'src/app/grid/services/grid-color.service';

@Component({
  selector: 'app-absence-gantt-h-scrollbar',
  templateUrl: './absence-gantt-h-scrollbar.component.html',
  styleUrls: ['./absence-gantt-h-scrollbar.component.scss'],
})
export class AbsenceGanttHScrollbarComponent
  implements AfterViewInit, OnDestroy
{
  public maximumCol: number = 0;

  private ctx: CanvasRenderingContext2D | undefined;
  private canvas: HTMLCanvasElement | undefined;
  private _scrollValue = 0;
  private thumbLength = 0;
  private tickSize = 0;
  private mouseEnterThumb = false;
  private MousePointThumb = false;
  private MouseXToThumbX = 0;
  private mouseOverThumb = false;
  private imgThumb!: ImageData | undefined;
  private imgSelectedThumb!: ImageData | undefined;
  public isDirty = false;
  private moveAnimationValue = 0;
  private margin = 3;
  private scrollTrackColor = this.gridColor.scrollTrack;
  private scrollTrackColorDark = DrawHelper.GetDarkColor(
    this.gridColor.scrollTrack,
    20
  );

  private maxFrameModuloNumber = 10;
  private minimumThumbLength = 15;
  private moveAnimationFrameCount = 0;
  private moveAnimationFrameModulo = this.maxFrameModuloNumber;
  private frameRequests: number[] = [];
  private shouldStopAnimation = false;

  private ngUnsubscribe = new Subject<void>();

  @Input() absenceBody: AbsenceGanttSurfaceComponent | undefined;

  constructor(
    private zone: NgZone,
    private scroll: ScrollService,
    private gridColor: GridColorService
  ) {}

  /* #region ng */

  ngAfterViewInit() {
    this.createCanvas();

    this.scroll?.moveHorizontalEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.zone.runOutsideAngular(() => {
          this.refresh();
        });
      });

    this.init();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    this.deleteCanvas();

    this.imgThumb = undefined;
    this.imgSelectedThumb = undefined;
  }

  /* #endregion ng */

  init() {
    this.scrollLeft = 0;
    this.refresh();
  }

  resize(): void {
    this.deleteCanvas();
    this.createCanvas();
    this.refresh();
  }

  private set scrollLeft(_value: number) {
    if (this.isDirty) {
      return;
    }

    if (_value === undefined || Number.isNaN(_value)) {
      _value = 0;
    }

    if (this._scrollValue !== _value && this.scroll) {
      this._scrollValue = _value;

      let res: number = Math.ceil(this._scrollValue / this.tickSize);
      if (res === undefined || Number.isNaN(res)) {
        res = 0;
      }

      const diff: number = res - this.scroll.hScrollValue;

      try {
        this.isDirty = true;
        if (diff !== 0) {
          if (this.absenceBody) {
            this.absenceBody.moveCalendar(diff, 0);
            this.scroll.isMoveHorizontal(diff);
          }
        }
      } catch (e) {
        console.error('scrollLeft hScroll', e);
      } finally {
        this.isDirty = false;
      }
    }
  }

  private get scrollLeft(): number {
    if (this.scroll) {
      let res: number = Math.ceil(this.scroll.hScrollValue * this.tickSize);
      if (!res || Number.isNaN(res)) {
        res = 0;
      }
      return res;
    }
    return 0;
  }

  set value(_value: number) {
    if (!_value || Number.isNaN(_value)) {
      _value = 0;
    }

    let res: number = Math.ceil(_value * this.tickSize);
    if (!res || Number.isNaN(res)) {
      res = 0;
    }

    this._scrollValue = res;

    this.reDraw();
  }

  get value(): number {
    if (this.scroll) {
      return this.scroll.hScrollValue;
    }
    return 0;
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

      if (this.mouseOverThumb) {
        this.ctx.putImageData(
          this.imgSelectedThumb,
          this.scrollLeft,
          this.margin
        );
      } else {
        this.ctx.putImageData(this.imgThumb, this.scrollLeft, this.margin);
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

    if (this.canvas) {
      this.imgThumb = undefined;
      this.imgSelectedThumb = undefined;

      const canvas = document.createElement('canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d', {
        willReadFrequently: true,
      }) as CanvasRenderingContext2D;

      canvas.width = this.thumbLength;
      canvas.height = this.canvas.clientHeight - this.margin * 2;

      DrawHelper.roundRect(
        ctx,
        0,
        0,
        canvas.width - this.margin,
        canvas.height - this.margin,
        this.margin * 2
      );

      ctx.fillStyle = this.scrollTrackColor;
      ctx.fill();

      this.imgThumb = ctx.getImageData(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = this.scrollTrackColorDark;
      ctx.fill();

      this.imgSelectedThumb = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );
    }
  }

  private calcMetrics(): void {
    if (this.canvas && this.scroll) {
      const w: number = this.canvas.width;
      let moveZoneLength = 0;
      if (this.scroll.colPercent > 0) {
        moveZoneLength = w / this.scroll.colPercent;
      }

      this.thumbLength = this.canvas.clientWidth - moveZoneLength;

      if (this.thumbLength < this.minimumThumbLength) {
        this.thumbLength = this.minimumThumbLength;
        moveZoneLength -= this.minimumThumbLength;
      }

      this.tickSize = moveZoneLength / this.scroll.maxCols;
      this.createThumb();
    }
  }

  /* #region Events */

  @HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent): void {
    this.mouseEnterThumb = this.isMouseOverThumb(event);
    this.mouseOverThumb = this.mouseEnterThumb;

    if (this.canvas) {
      if (this.mouseEnterThumb) {
      } else {
        if (event.clientX < this.scrollLeft + this.canvas.offsetLeft) {
          this.moveAnimationValue = -1;
        } else {
          this.moveAnimationValue = 1;
        }
        this.moveAnimationFrameModulo = this.maxFrameModuloNumber;
        this.shouldStopAnimation = false;
        this.moveAnimation(5);
      }
    }
  }

  @HostListener('mouseup', ['$event']) onMouseUp(event: MouseEvent): void {
    this.mouseEnterThumb = false;
    this.MouseXToThumbX = 0;
    if (this.canvas) {
      this.canvas.onpointermove = null;
    }
    this.stopMoveAnimation();
  }

  @HostListener('mousemove', ['$event']) onMouseMove(event: MouseEvent): void {
    this.mouseOverThumb = this.isMouseOverThumb(event);

    if (this.mouseOverThumb) {
      this.stopMoveAnimation();
    }

    this.refresh();
  }

  @HostListener('mouseleave', ['$event']) onMouseLeave(
    event: MouseEvent
  ): void {
    this.mouseOverThumb = false;
    this.stopMoveAnimation();
    this.refresh();
  }

  @HostListener('mouseenter', ['$event']) onMouseEnter(
    event: MouseEvent
  ): void {
    if (this.MouseXToThumbX > 0) {
      this.mouseOverThumb = this.isMouseOverThumb(event);
      this.refresh();
    }
  }

  @HostListener('pointerdown', ['$event']) onPointerDown(
    event: PointerEvent
  ): void {
    this.MousePointThumb = this.isMouseOverThumb(event);
    if (this.MousePointThumb && event.buttons === 1) {
      this.MouseXToThumbX = event.clientX - this.scrollLeft;
      if (this.canvas) {
        this.canvas.setPointerCapture(event.pointerId);
      }
    }
  }

  @HostListener('pointerup', ['$event']) onPointerUp(
    event: PointerEvent
  ): void {
    this.MousePointThumb = false;
    if (this.canvas) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  }

  @HostListener('pointermove', ['$event']) onPointerMove(
    event: PointerEvent
  ): void {
    if (this.MousePointThumb) {
      const x = event.clientX - this.MouseXToThumbX;
      this.zone.runOutsideAngular(() => {
        if (this.MousePointThumb) {
          this.scrollLeft = x;
        }
      });
    }
  }

  onArrowThumbMouseDown(event: MouseEvent, type: number) {
    if (type === 0) {
      this.moveAnimationValue = -1;
    } else if (type === 1) {
      this.moveAnimationValue = 1;
    }
    event.preventDefault();
    event.stopPropagation();

    this.moveAnimationFrameModulo = 1;
    this.shouldStopAnimation = false;
    this.moveAnimation(1);
  }

  onArrowThumbMouseUp(event: MouseEvent) {
    this.stopMoveAnimation();
    event.preventDefault();
    event.stopPropagation();
  }

  /* #endregion Events */

  isMouseOverThumb(event: MouseEvent): boolean {
    if (this.canvas) {
      const x: number = event.clientX - this.canvas.offsetLeft;
      return this.isMouseOverThumbSub(x);
    }

    return false;
  }

  private isMouseOverThumbSub(x: number): boolean {
    if (this.canvas) {
      if (x >= this.scrollLeft && x <= this.scrollLeft + this.thumbLength) {
        return true;
      }
    }

    return false;
  }

  moveAnimation(steps: number) {
    this.zone.runOutsideAngular(() => {
      this.moveAnimationFrameCount++;

      if (this.shouldStopAnimation) {
        return;
      }

      if (
        this.moveAnimationFrameModulo <= 1 ||
        this.moveAnimationFrameCount % this.moveAnimationFrameModulo === 0
      ) {
        if (this.moveAnimationFrameModulo > 1) {
          this.moveAnimationFrameModulo--;
        }
        this.animationSteps(steps);
      }

      const requestId = window.requestAnimationFrame((x) => {
        this.frameRequests.push(requestId);
        this.moveAnimation(steps);
      });
    });
  }

  stopMoveAnimation(): void {
    this.shouldStopAnimation = true;
    this.moveAnimationFrameCount = 0;
    this.moveAnimationValue = 0;
    this.frameRequests.forEach((requestId) =>
      window.cancelAnimationFrame(requestId)
    );
    this.frameRequests = [];
  }

  animationSteps(steps: number) {
    if (this.absenceBody && this.scroll) {
      if (this.moveAnimationValue < 0) {
        this.absenceBody.moveCalendar(steps * -1, 0);
        this.scroll.isMoveHorizontal(steps * -1);
      } else if (this.moveAnimationValue > 0) {
        this.absenceBody.moveCalendar(steps, 0);
        this.scroll.isMoveHorizontal(steps);
      }
    }
  }

  private deleteCanvas() {
    this.ctx = undefined;
    this.canvas = undefined;
  }
  private createCanvas() {
    this.canvas = document.getElementById(
      'cal-hScrollbar'
    ) as HTMLCanvasElement;
    this.ctx = DrawHelper.createHiDPICanvas(
      this.canvas,
      this.canvas.clientWidth,
      this.canvas.clientHeight,
      false
    );
  }
}

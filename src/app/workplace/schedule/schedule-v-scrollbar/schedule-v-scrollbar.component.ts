import {
  AfterViewInit,
  Component,
  HostListener,
  Input,
  NgZone,
  OnDestroy,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { ScheduleScheduleSurfaceComponent } from '../schedule-schedule-surface/schedule-schedule-surface.component';
import { ScrollService } from '../services/scroll.service';
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-schedule-v-scrollbar',
  templateUrl: './schedule-v-scrollbar.component.html',
  styleUrls: ['./schedule-v-scrollbar.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class ScheduleVScrollbarComponent implements AfterViewInit, OnDestroy {
  public maximumRow = 0;

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
  private moveAnimationValue = 0;
  private margin = 3;
  private scrollTrackColor = this.gridColor.scrollTrack;
  private scrollTrackColorDark = DrawHelper.GetDarkColor(
    this.gridColor.scrollTrack,
    40
  );

  private maxFrameModuloNumber = 10;
  private minimumThumbLength = 15;
  private moveAnimationFrameCount = 0;
  private moveAnimationFrameModulo = this.maxFrameModuloNumber;
  private frameRequests: number[] = [];
  private shouldStopAnimation = false;

  private ngUnsubscribe = new Subject<void>();

  @Input() scheduleBody: ScheduleScheduleSurfaceComponent | undefined;

  constructor(
    private zone: NgZone,
    private scroll: ScrollService,
    private gridColor: GridColorService
  ) {}

  /* #region ng */

  ngAfterViewInit() {
    this.createCanvas();

    this.scroll!.moveVerticalEvent.pipe(
      takeUntil(this.ngUnsubscribe)
    ).subscribe(() => {
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

  init(): void {
    this.scrollTop = 0;
    this.refresh();
  }

  resize(): void {
    this.refresh();
  }

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

      const diff: number = res - this.scroll!.verticalScrollPosition;

      try {
        this.isDirty = true;
        if (diff !== 0) {
          this.scheduleBody!.drawSchedule.moveGrid(0, diff);
          this.scroll!.updateVerticalScrollPosition(diff);
        }
      } catch (e) {
        console.error('scrollTop vScroll', e);
      } finally {
        this.isDirty = false;
      }
    }
  }

  private get scrollTop(): number {
    let res: number = Math.ceil(
      this.scroll!.verticalScrollPosition * this.tickSize
    );
    if (res === undefined || Number.isNaN(res)) {
      res = 0;
    }
    return res;
  }

  set value(_value: number) {
    if (_value === undefined || Number.isNaN(_value)) {
      _value = 0;
    }

    let res: number = Math.ceil(
      this.scroll!.verticalScrollPosition * this.tickSize
    );
    if (res === undefined || Number.isNaN(res)) {
      res = 0;
    }

    this._scrollValue = res;

    this.reDraw();
  }

  get value(): number {
    return this.scroll!.verticalScrollPosition;
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
        this.ctx.putImageData(
          this.imgSelectedThumb,
          this.margin,
          this.scrollTop
        );
      } else {
        this.ctx.putImageData(this.imgThumb, this.margin, this.scrollTop);
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

    canvas.width = this.canvas!.clientWidth - this.margin * 2;
    canvas.height = this.thumbLength;

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

    this.imgSelectedThumb = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  private calcMetrics(): void {
    if (!this.scroll) {
      return;
    }

    if (this.canvas) {
      const h: number = this.canvas!.clientHeight;
      let moveZoneLength = 0;
      if (this.scroll!.colPercent > 0) {
        moveZoneLength = h / this.scroll!.rowPercent;
      }

      this.thumbLength = this.canvas!.clientHeight - moveZoneLength;

      if (this.thumbLength < this.minimumThumbLength) {
        this.thumbLength = this.minimumThumbLength;
        moveZoneLength -= this.minimumThumbLength;
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

      this.moveAnimationFrameModulo = this.maxFrameModuloNumber;
      this.shouldStopAnimation = false;
      this.moveAnimation(5);
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
    this.stopMoveAnimation();
  }
  @HostListener('focusout', ['$event'])
  onFocusOut(event: FocusEvent): void {
    this.MouseOverThumb = false;
    this.stopMoveAnimation();
  }

  @HostListener('mouseenter', ['$event']) onMouseEnter(
    event: MouseEvent
  ): void {
    this.MouseOverThumb = this.isMouseOverThumb(event);
    this.refresh();
  }

  @HostListener('mouseover', ['$event']) onMouseOver(event: MouseEvent): void {}

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
  }

  /* #endregion events */

  isMouseOverThumb(event: MouseEvent): boolean {
    const y: number = event.clientY - this.canvas!.offsetTop;

    if (y >= this.scrollTop && y <= this.scrollTop + this.thumbLength) {
      return true;
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
    if (this.scheduleBody && this.scroll) {
      if (this.moveAnimationValue < 0) {
        this.scheduleBody.drawSchedule.moveGrid(0, steps * -1);
        this.scroll.updateVerticalScrollPosition(steps * -1);
      } else if (this.moveAnimationValue > 0) {
        this.scheduleBody.drawSchedule.moveGrid(0, steps);
        this.scroll.updateVerticalScrollPosition(steps);
      }
    }
  }

  private deleteCanvas() {
    this.ctx = undefined;
    this.canvas = undefined;
  }
  private createCanvas() {
    this.canvas = document.getElementById(
      'sch-vScrollbar'
    ) as HTMLCanvasElement;
    this.ctx = DrawHelper.createHiDPICanvas(
      this.canvas,
      this.canvas.clientWidth,
      this.canvas.clientHeight,
      false
    );
  }
}

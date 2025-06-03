import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  NgZone,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  Metrics,
  IMetrics,
  ScrollbarService,
} from '../scrollbar/scrollbar.service';
import { CheckContext } from 'src/app/services/check-context.decorator';
import { SCROLLBAR_CONSTANTS } from '../scrollbar/constants';
import {
  Subject,
  debounceTime,
  fromEvent,
  takeUntil,
  throttleTime,
} from 'rxjs';
import { CommonModule } from '@angular/common';

enum ArrowDirection {
  NONE = 0,
  UP = -1,
  DOWN = 1,
}

@Component({
  selector: 'app-v-scrollbar',
  templateUrl: './v-scrollbar.component.html',
  styleUrls: ['./v-scrollbar.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class VScrollbarComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @Input()
  get value(): number {
    return this._value;
  }

  set value(newValue: number) {
    const clampedValue = Math.max(
      0,
      Math.min(
        newValue,
        this.maxValue -
          this.visibleValue +
          SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE
      )
    );

    if (this._value !== clampedValue) {
      this._value = clampedValue;
      this.valueChange.emit(this._value);
      this.reDraw();
      this.updateArrowButtonsState();
    }
  }

  @Input() maxValue = 365;
  @Input() visibleValue = 180;

  @Output() valueChange = new EventEmitter<number>();

  @ViewChild('canvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;
  public safeTriangleSvgTop!: SafeHtml;
  public safeTriangleSvgBottom!: SafeHtml;
  public disableTopArrow = false;
  public disableBottomArrow = false;

  private _value = 0;
  private readonly CANVAS_PADDING = 50;
  private readonly INITIAL_ANIMATION_FRAME_MODULO = 10;
  private readonly Y_POSITION_OFFSET = 1;
  private readonly FPS_THROTTLE = 16; // ~60fps for mousemove
  private readonly MOUSE_PRIMARY_BUTTON = 1;

  private destroy$ = new Subject<void>();

  private imagesThumps: ImagesThumps = new ImagesThumps();
  private metrics: IMetrics = new Metrics(); // Contains metrics for the scrollbar (e.g. size, position)
  private ctx: CanvasRenderingContext2D | null = null;
  private moveAnimationValue = ArrowDirection.NONE;
  private moveAnimationFrameCount = 0;
  private moveAnimationFrameModulo = this.INITIAL_ANIMATION_FRAME_MODULO; // Determines how often the value is updated during the animation
  private frameRequests: number[] = [];
  private shouldStopAnimation = false;
  private mouseEnterThumb = false;
  private mousePointThumb = false;
  private mouseYToThumbY = 0;
  private mouseOverThumb = false;
  private lastMouseEvent: MouseEvent | null = null;
  private isScrollbarClick = false;

  private arrowHoldTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private zone: NgZone,
    private sanitizer: DomSanitizer,
    private scrollbarService: ScrollbarService,
    private cdr: ChangeDetectorRef
  ) {}

  /* #region Lifecycle Hooks */

  ngOnInit() {
    this.safeTriangleSvgTop = this.sanitizer.bypassSecurityTrustHtml(
      this.scrollbarService.triangleTopSvg
    );
    this.safeTriangleSvgBottom = this.sanitizer.bypassSecurityTrustHtml(
      this.scrollbarService.triangleBottomSvg
    );
  }

  ngAfterViewInit() {
    this.initCanvas();
    this.setupEventListeners();
    this.refresh();
  }

  @CheckContext
  ngOnChanges(changes: SimpleChanges) {
    this.handleMaxValueOrVisibleValueChanges(changes);
    this.handleValueChanges(changes);
    this.updateArrowButtonsState();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopMoveAnimation();
    this.cancelAnimationFrames();
    this.ctx = null;
    this.lastMouseEvent = null;
  }

  private handleMaxValueOrVisibleValueChanges(changes: SimpleChanges): void {
    if (changes['maxValue'] || changes['visibleValue']) {
      this.refresh();
    }
  }

  private handleValueChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.reDraw();
    }
  }

  private setupEventListeners(): void {
    const canvas = this.canvasRef.nativeElement;
    if (!canvas) return;

    fromEvent<MouseEvent>(canvas, 'mousedown')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => this.onMouseDown(event));

    fromEvent<MouseEvent>(canvas, 'mouseup')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.onMouseUp());

    fromEvent<MouseEvent>(canvas, 'mousemove')
      .pipe(throttleTime(this.FPS_THROTTLE), takeUntil(this.destroy$))
      .subscribe((event) => this.onMouseMove(event));

    fromEvent<MouseEvent>(canvas, 'mouseleave')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.onMouseLeave());

    fromEvent<MouseEvent>(canvas, 'mouseenter')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => this.onMouseEnter(event));

    fromEvent<PointerEvent>(canvas, 'pointerdown')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => this.onPointerDown(event));

    fromEvent<PointerEvent>(canvas, 'pointerup')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => this.onPointerUp(event));

    fromEvent<PointerEvent>(canvas, 'pointermove')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => this.onPointerMove(event));

    fromEvent(window, 'resize')
      .pipe(debounceTime(150), takeUntil(this.destroy$))
      .subscribe(() => this.handleWindowResize());
  }

  /* #endregion Lifecycle Hooks */

  /* #region Initialization and updating */

  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');

    if (!this.ctx) {
      console.error('Canvas context could not be initialized');
      return;
    }

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    this.refresh();
  }

  refresh(): void {
    this.updateMetrics();
    this.createThumb();
    this.reDraw();
    this.updateArrowButtonsState();
  }

  private updateMetrics(): void {
    const percent = Math.round((this.visibleValue / this.maxValue) * 100);
    const canvas = this.canvasRef.nativeElement;
    this.metrics = this.scrollbarService.calcMetrics(
      canvas.height,
      percent,
      this.visibleValue,
      this.maxValue
    );
  }

  private createThumb(): void {
    this.scrollbarService.createThumbVertical(this.metrics, this.imagesThumps);
  }

  /* #endregion Initialization and updating */

  /* #region Redraw */
  @CheckContext
  private reDraw(): void {
    if (!this.isDrawingPossible()) {
      return;
    }

    if (!this.ctx) {
      return;
    }

    this.ctx.save();
    this.clearCanvas(this.canvasRef.nativeElement);
    this.drawThumb(this.canvasRef.nativeElement);
    this.ctx.restore();
  }

  private isDrawingPossible(): boolean {
    return (
      (!!this.imagesThumps.imgThumb || !!this.imagesThumps.imgSelectedThumb) &&
      this.metrics.thumbLength !== Infinity &&
      this.metrics.tickSize !== Infinity
    );
  }

  private assertContext(): CanvasRenderingContext2D {
    if (!this.ctx) {
      throw new Error('Canvas context not initialized');
    }
    return this.ctx;
  }

  private clearCanvas(canvas: HTMLCanvasElement): void {
    const ctx = this.assertContext();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  private drawThumb(canvas: HTMLCanvasElement): void {
    const ctx = this.assertContext();
    const thumbImage = this.getThumbImage();
    if (!thumbImage) {
      return;
    }
    const yPosition = this.calculateYPosition(
      canvas,
      this.value,
      this.metrics.tickSize,
      thumbImage.height
    );
    const xPosition = this.calculateXPosition(canvas, thumbImage);

    ctx.putImageData(thumbImage, xPosition, yPosition);
  }

  private getThumbImage(): ImageData | undefined {
    return this.mouseOverThumb
      ? this.imagesThumps.imgSelectedThumb
      : this.imagesThumps.imgThumb;
  }

  private calculateXPosition(
    canvas: HTMLCanvasElement,
    thumbImage: ImageData
  ): number {
    const canvasWidth = canvas?.width ?? 0;
    const thumbWidth = thumbImage?.width ?? 0;

    if (canvasWidth === 0 || thumbWidth === 0) {
      return 0;
    }

    return (canvasWidth - thumbWidth) / 2 + this.Y_POSITION_OFFSET;
  }

  private calculateYPosition(
    canvas: HTMLCanvasElement,
    value: number,
    tickSize: number,
    trackHeight: number
  ): number {
    const canvasHeight = canvas?.height ?? 0;
    const safeValue = value ?? 0;
    const safeTickSize = tickSize ?? 0;
    const safeTrackHeight = trackHeight ?? 0;

    if (safeTickSize === 0) {
      return 0;
    }

    let tmpY = safeValue * safeTickSize;

    if (canvasHeight > 0 && tmpY + safeTrackHeight > canvasHeight) {
      tmpY = canvasHeight - safeTrackHeight;
    }

    return Math.max(0, tmpY);
  }

  /* #endregion Redraw */

  /* #region Events */

  private updateCanvasSize(width: number, height?: number): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.zone.run(() => {
      canvas.width = width;
      canvas.height = height ?? canvas.offsetHeight;
      this.refresh();
    });
  }

  private handleWindowResize(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.updateCanvasSize(canvas.offsetWidth);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onResize(event: any): void {
    const entries = Array.isArray(event)
      ? (event as ResizeObserverEntry[])
      : [];
    if (entries?.[0]) {
      this.updateCanvasSize(
        entries[0].contentRect.width,
        entries[0].contentRect.height - this.CANVAS_PADDING
      );
    }
  }

  private onMouseDown(event: MouseEvent): void {
    this.updateMouseState(event);

    this.handleNonThumbClick(event);
  }

  private updateMouseState(event: MouseEvent): void {
    this.mouseEnterThumb = this.isMouseOverThumb(event);
    this.mouseOverThumb = this.mouseEnterThumb;
  }

  private handleNonThumbClick(event: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    if (canvas && !this.mouseEnterThumb) {
      this.lastMouseEvent = event;
      this.isScrollbarClick = true;
      this.initiateMoveAnimation(event, canvas);
    }
  }

  // Only called up if mouse is not on thumb bar
  private initiateMoveAnimation(
    event: MouseEvent,
    canvas: HTMLCanvasElement
  ): void {
    this.moveAnimationValue =
      event.clientY < this.value * this.metrics.tickSize + canvas.offsetTop
        ? ArrowDirection.UP
        : ArrowDirection.DOWN;
    this.moveAnimationFrameModulo = SCROLLBAR_CONSTANTS.MAX_FRAME_MODULO;
    this.shouldStopAnimation = false;
    this.moveAnimation(SCROLLBAR_CONSTANTS.FIRST_STEP_BAR);
  }

  private onMouseUp(): void {
    this.mouseEnterThumb = false;
    this.mouseYToThumbY = 0;
    const canvas = this.canvasRef.nativeElement;
    if (canvas) {
      canvas.onpointermove = null;
    }
    this.stopMoveAnimation();
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouseOverThumb = this.isMouseOverThumb(event);

    if (this.mouseOverThumb) {
      this.stopMoveAnimation();
    }

    this.reDraw();
    this.updateArrowButtonsState();
  }

  private onMouseLeave(): void {
    this.mouseOverThumb = false;
    this.stopMoveAnimation();
    this.lastMouseEvent = null;
    this.refresh();
  }

  private onMouseEnter(event: MouseEvent): void {
    if (this.mouseYToThumbY > 0) {
      this.mouseOverThumb = this.isMouseOverThumb(event);
      this.refresh();
    }
  }

  private onPointerDown(event: PointerEvent): void {
    this.mousePointThumb = this.isMouseOverThumb(event);
    if (this.mousePointThumb && event.buttons === this.MOUSE_PRIMARY_BUTTON) {
      const thumbPosition = this.value * this.metrics.tickSize;
      this.mouseYToThumbY = event.clientY - thumbPosition;

      const canvas = this.canvasRef.nativeElement;
      if (canvas) {
        canvas.setPointerCapture(event.pointerId);
      }
    }
  }

  private onPointerUp(event: PointerEvent): void {
    this.mousePointThumb = false;
    const canvas = this.canvasRef.nativeElement;
    if (canvas) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (this.mousePointThumb) {
      this.updateValueFromPointerMove(event);
    }
  }

  private updateValueFromPointerMove(event: PointerEvent): void {
    const y = event.clientY - this.mouseYToThumbY;
    this.zone.runOutsideAngular(() => {
      if (this.mousePointThumb) {
        const correctValue = Math.round(y / this.metrics.tickSize);
        this.updateValue(correctValue);
      }
    });
  }

  onArrowThumbMouseDown(event: MouseEvent, direction: ArrowDirection) {
    const newValue = this.value + direction;
    this.updateValue(newValue);

    this.moveAnimationValue = direction;
    this.arrowHoldTimeout = setTimeout(() => {
      this.moveAnimationFrameModulo = SCROLLBAR_CONSTANTS.MAX_FRAME_MODULO;
      this.shouldStopAnimation = false;
      this.moveAnimation(SCROLLBAR_CONSTANTS.FIRST_STEP_BUTTON);
    }, 300);

    event.preventDefault();
    event.stopPropagation();
  }

  onArrowThumbMouseUp(event: MouseEvent) {
    if (this.arrowHoldTimeout != null) {
      clearTimeout(this.arrowHoldTimeout);
      this.arrowHoldTimeout = undefined;
    }
    this.stopMoveAnimation();
    event.preventDefault();
    event.stopPropagation();
  }

  /* #endregion Events */

  /* #region animation */

  @CheckContext
  private moveAnimation(steps: number): void {
    this.zone.runOutsideAngular(() => {
      this.processAnimationFrame(steps);
    });
  }

  private processAnimationFrame(steps: number): void {
    this.incrementFrameCount();

    if (this.shouldStopAnimation) {
      return;
    }

    if (this.shouldUpdateValue()) {
      if (this.isScrollbarClick && this.lastMouseEvent) {
        const canvas = this.canvasRef.nativeElement;
        const mousePosition = this.lastMouseEvent.clientY - canvas.offsetTop;

        const trackerHeight = this.imagesThumps.imgThumb?.height || 0;
        const trackerPosition = this.value * this.metrics.tickSize;
        const trackerBottom = trackerPosition + trackerHeight;

        if (
          (this.moveAnimationValue < 0 && trackerPosition <= mousePosition) ||
          (this.moveAnimationValue > 0 && trackerBottom >= mousePosition)
        ) {
          this.stopMoveAnimation();
          this.lastMouseEvent = null;
          this.isScrollbarClick = false;
          return;
        }
      }

      this.updateAnimationState(steps);
      this.emitValueChange();
    }

    this.scheduleNextFrame(steps);
  }
  // Increments the frame counter
  private incrementFrameCount(): void {
    this.moveAnimationFrameCount++;
  }

  // Checks whether the value is to be updated
  private shouldUpdateValue(): boolean {
    return (
      this.moveAnimationFrameModulo <= 1 ||
      this.moveAnimationFrameCount % this.moveAnimationFrameModulo === 0
    );
  }

  // Updates the state of the animation
  private updateAnimationState(steps: number): void {
    this.decreaseFrameModulo();
    this.updateScrollValue(steps);
  }

  // Reduces the frame modulo value
  private decreaseFrameModulo(): void {
    if (this.moveAnimationFrameModulo > 1) {
      this.moveAnimationFrameModulo -= 2;
    }
  }

  // Updates the scroll value
  private updateScrollValue(steps: number): void {
    const IS_TOP = -1;
    const newValue = this.value + steps * this.moveAnimationValue;

    const realMax =
      this.maxValue -
      this.visibleValue +
      SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE;
    if (
      (this.moveAnimationValue > 0 && newValue >= realMax) ||
      (this.moveAnimationValue < 0 && newValue <= IS_TOP)
    ) {
      this.stopMoveAnimation();
      return;
    }

    this.updateValue(newValue);
  }

  private emitValueChange(): void {
    this.zone.run(() => {
      this.valueChange.emit(this.value);
    });
  }

  // Plan the next animation frame
  private scheduleNextFrame(steps: number): void {
    const requestId = window.requestAnimationFrame(() => {
      this.frameRequests.push(requestId);
      this.moveAnimation(steps);
    });
  }

  // Stops the animation
  private stopMoveAnimation(): void {
    this.shouldStopAnimation = true;
    this.resetAnimationState();
    this.cancelAnimationFrames();
    this.lastMouseEvent = null;
    this.isScrollbarClick = false;
  }

  // Resets the animation state
  private resetAnimationState(): void {
    this.moveAnimationFrameCount = 0;
    this.moveAnimationValue = ArrowDirection.NONE;
    this.moveAnimationFrameModulo = this.INITIAL_ANIMATION_FRAME_MODULO;
  }

  // Cancels all running animation frames
  private cancelAnimationFrames(): void {
    this.frameRequests.forEach((requestId) =>
      window.cancelAnimationFrame(requestId)
    );
    this.frameRequests = [];
  }

  /* #endregion animation */

  /* #region Help functions */
  private clampValue(value: number): number {
    return Math.max(
      0,
      Math.min(
        value,
        this.imagesThumps.invisibleTicks +
          SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE
      )
    );
  }

  private updateValue(newValue: number) {
    newValue = this.clampValue(newValue);
    if (newValue !== this._value) {
      this.value = newValue;
      this.valueChange.emit(this._value);
    }
  }

  isMouseOverThumb(event: MouseEvent): boolean {
    const canvas = this.canvasRef.nativeElement;
    if (canvas) {
      const y: number = event.clientY - canvas.offsetTop;
      return this.isMouseOverThumbSub(y);
    }

    return false;
  }

  private isMouseOverThumbSub(y: number): boolean {
    const correctedY = Math.round(y / this.metrics.tickSize);

    if (this.imagesThumps.imgThumb) {
      const thumpsTicks = Math.round(
        this.imagesThumps.imgThumb!.height / this.metrics.tickSize
      );
      if (correctedY >= this.value && correctedY <= this.value + thumpsTicks) {
        return true;
      }
    }

    return false;
  }

  private isAtStart(): boolean {
    return this.value <= 0;
  }

  private isAtEnd(): boolean {
    return this.value >= this.maxValue - this.visibleValue;
  }

  @CheckContext
  private updateArrowButtonsState(): void {
    this.disableTopArrow = this.isAtStart();
    this.disableBottomArrow = this.isAtEnd();
    this.cdr.detectChanges();
  }

  /* #endregion Help functions */
}

export interface IImagesThumps {
  invisibleTicks: number;
  imgThumb: ImageData | undefined;
  imgSelectedThumb: ImageData | undefined;
}
export class ImagesThumps implements IImagesThumps {
  invisibleTicks = 0;
  imgThumb: ImageData | undefined = undefined;
  imgSelectedThumb: ImageData | undefined = undefined;
}

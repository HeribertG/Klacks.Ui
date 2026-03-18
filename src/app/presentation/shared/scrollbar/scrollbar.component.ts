// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Generic scrollbar component supporting both horizontal and vertical orientations.
 * @param orientation - 'horizontal' or 'vertical', determines axis behavior (scroll direction, mouse tracking, thumb rendering)
 * @param value - Current scroll position in ticks
 * @param maxValue - Total number of ticks in the scrollable range
 * @param visibleValue - Number of ticks visible without scrolling
 */
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
  inject,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  Metrics,
  IMetrics,
  ScrollbarService,
} from './scrollbar.service';
import { CheckContext } from 'src/app/domain/services/check-context.decorator';
import { SCROLLBAR_CONSTANTS } from './constants';
import {
  Subject,
  debounceTime,
  fromEvent,
  takeUntil,
  throttleTime,
} from 'rxjs';

import { ResizeDirective } from 'src/app/presentation/directives/resize.directive';

export type ScrollbarOrientation = 'horizontal' | 'vertical';

enum ArrowDirection {
  NONE = 0,
  BACKWARD = -1,
  FORWARD = 1,
}

interface AxisConfig {
  clientPos: 'clientX' | 'clientY';
  canvasOffset: 'offsetLeft' | 'offsetTop';
  canvasSizeProp: 'width' | 'height';
  canvasCrossSizeProp: 'width' | 'height';
  thumbSizeProp: 'width' | 'height';
  svgBackward: (service: ScrollbarService) => string;
  svgForward: (service: ScrollbarService) => string;
  createThumbFn: (service: ScrollbarService, metrics: IMetrics, images: IImagesThumps) => void;
  metricsSize: (canvas: HTMLCanvasElement) => number;
  resizeExtract: (entry: ResizeObserverEntry, padding: number) => { width: number; height?: number };
}

const VERTICAL_CONFIG: AxisConfig = {
  clientPos: 'clientY',
  canvasOffset: 'offsetTop',
  canvasSizeProp: 'height',
  canvasCrossSizeProp: 'width',
  thumbSizeProp: 'height',
  svgBackward: (svc) => svc.triangleTopSvg,
  svgForward: (svc) => svc.triangleBottomSvg,
  createThumbFn: (service, metrics, images) => service.createThumbVertical(metrics, images),
  metricsSize: (canvas) => Math.round(canvas.height),
  resizeExtract: (entry, padding) => ({
    width: entry.contentRect.width,
    height: entry.contentRect.height - padding,
  }),
};

const HORIZONTAL_CONFIG: AxisConfig = {
  clientPos: 'clientX',
  canvasOffset: 'offsetLeft',
  canvasSizeProp: 'width',
  canvasCrossSizeProp: 'height',
  thumbSizeProp: 'width',
  svgBackward: (svc) => svc.triangleLeftSvg,
  svgForward: (svc) => svc.triangleRightSvg,
  createThumbFn: (service, metrics, images) => service.createThumbHorizontal(metrics, images),
  metricsSize: (canvas) => canvas.width,
  resizeExtract: (entry, padding) => ({
    width: entry.contentRect.width - padding,
  }),
};

@Component({
  selector: 'app-scrollbar',
  templateUrl: './scrollbar.component.html',
  styleUrls: ['./scrollbar.component.scss'],
  standalone: true,
  imports: [ResizeDirective],
  host: {
    '[class.horizontal]': 'orientation === "horizontal"',
    '[class.vertical]': 'orientation === "vertical"',
  },
})
export class ScrollbarComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('canvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() orientation: ScrollbarOrientation = 'vertical';
  @Input() maxValue = 365;
  @Input() visibleValue = 180;

  @Output() valueChange = new EventEmitter<number>();
  @Output() maxValueChange = new EventEmitter<number>();
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

  private zone = inject(NgZone);
  private sanitizer = inject(DomSanitizer);
  private scrollbarService = inject(ScrollbarService);
  private cdr = inject(ChangeDetectorRef);
  private hostRef = inject(ElementRef);

  public safeTriangleSvgBackward!: SafeHtml;
  public safeTriangleSvgForward!: SafeHtml;
  public disableBackwardArrow = false;
  public disableForwardArrow = false;
  public hideArrowButtons = false;

  private _value = 0;
  private readonly CANVAS_PADDING = 50;
  private readonly INITIAL_ANIMATION_FRAME_MODULO = 10;
  private readonly CROSS_AXIS_POSITION_OFFSET = 1;
  private readonly FPS_THROTTLE = 16;
  private readonly MOUSE_PRIMARY_BUTTON = 1;

  private destroy$ = new Subject<void>();

  private axisConfig: AxisConfig = VERTICAL_CONFIG;
  private imagesThumps: ImagesThumps = new ImagesThumps();
  private metrics: IMetrics = new Metrics();
  private ctx: CanvasRenderingContext2D | null = null;
  private moveAnimationValue = ArrowDirection.NONE;
  private moveAnimationFrameCount = 0;
  private moveAnimationFrameModulo = this.INITIAL_ANIMATION_FRAME_MODULO;
  private frameRequests: number[] = [];
  private shouldStopAnimation = false;
  private mouseEnterThumb = false;
  private mousePointThumb = false;
  private mousePosToThumbPos = 0;
  private mouseOverThumb = false;
  private lastMouseEvent: MouseEvent | null = null;
  private isScrollbarClick = false;
  private arrowHoldTimeout: ReturnType<typeof setTimeout> | undefined;

  ngOnInit() {
    this.axisConfig = this.orientation === 'horizontal' ? HORIZONTAL_CONFIG : VERTICAL_CONFIG;

    this.safeTriangleSvgBackward = this.sanitizer.bypassSecurityTrustHtml(
      this.axisConfig.svgBackward(this.scrollbarService)
    );
    this.safeTriangleSvgForward = this.sanitizer.bypassSecurityTrustHtml(
      this.axisConfig.svgForward(this.scrollbarService)
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
    this.handleMaxValueChanges(changes);
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
      this.clampCurrentValue();
      this.refresh();
    }
  }

  private clampCurrentValue(): void {
    const maxScrollValue =
      this.maxValue -
      this.visibleValue +
      SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE;
    if (this._value > maxScrollValue) {
      this._value = Math.max(0, maxScrollValue);
      this.valueChange.emit(this._value);
    }
  }

  private handleMaxValueChanges(changes: SimpleChanges): void {
    if (changes['maxValue']) {
      this.maxValueChange.emit(this.maxValue);
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
    const canvas = this.canvasRef.nativeElement;
    const size = this.axisConfig.metricsSize(canvas);

    this.metrics = this.scrollbarService.calcMetrics(
      size,
      this.visibleValue,
      this.maxValue
    );
  }

  private createThumb(): void {
    this.axisConfig.createThumbFn(this.scrollbarService, this.metrics, this.imagesThumps);
  }

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

    const mainAxisPos = this.calculateMainAxisPosition(
      canvas,
      this.value,
      this.metrics.tickSize,
      thumbImage[this.axisConfig.thumbSizeProp]
    );
    const crossAxisPos = this.calculateCrossAxisPosition(
      canvas,
      thumbImage
    );

    const xPosition = this.orientation === 'horizontal' ? mainAxisPos : crossAxisPos;
    const yPosition = this.orientation === 'horizontal' ? crossAxisPos : mainAxisPos;

    ctx.putImageData(thumbImage, xPosition, yPosition);
  }

  private getThumbImage(): ImageData | undefined {
    return this.mouseOverThumb
      ? this.imagesThumps.imgSelectedThumb
      : this.imagesThumps.imgThumb;
  }

  private calculateCrossAxisPosition(
    canvas: HTMLCanvasElement,
    thumbImage: ImageData
  ): number {
    const crossSizeProp = this.axisConfig.canvasCrossSizeProp;
    const thumbCrossSize = this.orientation === 'horizontal'
      ? thumbImage.height
      : thumbImage.width;

    const canvasCrossSize = canvas[crossSizeProp] ?? 0;

    if (canvasCrossSize === 0 || thumbCrossSize === 0) {
      return 0;
    }

    let result = (canvasCrossSize - thumbCrossSize) / 2 + this.CROSS_AXIS_POSITION_OFFSET;
    if (result < 0) result = 0;
    return Math.round(result);
  }

  private calculateMainAxisPosition(
    canvas: HTMLCanvasElement,
    value: number,
    tickSize: number,
    trackSize: number
  ): number {
    const canvasMainSize = canvas[this.axisConfig.canvasSizeProp] ?? 0;
    const safeValue = value ?? 0;
    const safeTrackSize = trackSize ?? 0;

    const maxScrollValue =
      this.maxValue -
      this.visibleValue +
      SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE;
    const availableSpace = canvasMainSize - safeTrackSize;

    if (availableSpace <= 0) {
      return 0;
    }

    if (maxScrollValue <= 0) {
      return 0;
    }

    if (safeValue >= maxScrollValue) {
      return Math.round(availableSpace);
    }

    const proportion = Math.max(0, Math.min(1, safeValue / maxScrollValue));
    return Math.round(proportion * availableSpace);
  }

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
      const extracted = this.axisConfig.resizeExtract(entries[0], this.CANVAS_PADDING);
      this.updateCanvasSize(extracted.width, extracted.height);
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

  private initiateMoveAnimation(
    event: MouseEvent,
    canvas: HTMLCanvasElement
  ): void {
    const mousePos = event[this.axisConfig.clientPos];
    const canvasOffset = canvas[this.axisConfig.canvasOffset];

    this.moveAnimationValue =
      mousePos < this.value * this.metrics.tickSize + canvasOffset
        ? ArrowDirection.BACKWARD
        : ArrowDirection.FORWARD;
    this.moveAnimationFrameModulo = SCROLLBAR_CONSTANTS.MAX_FRAME_MODULO;
    this.shouldStopAnimation = false;
    this.moveAnimation(SCROLLBAR_CONSTANTS.FIRST_STEP_BAR);
  }

  private onMouseUp(): void {
    this.mouseEnterThumb = false;
    this.mousePosToThumbPos = 0;
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
    if (this.mousePosToThumbPos > 0) {
      this.mouseOverThumb = this.isMouseOverThumb(event);
      this.refresh();
    }
  }

  private onPointerDown(event: PointerEvent): void {
    this.mousePointThumb = this.isMouseOverThumb(event);
    if (this.mousePointThumb && event.buttons === this.MOUSE_PRIMARY_BUTTON) {
      const thumbPosition = this.value * this.metrics.tickSize;
      this.mousePosToThumbPos = event[this.axisConfig.clientPos] - thumbPosition;

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
    const pos = event[this.axisConfig.clientPos] - this.mousePosToThumbPos;
    this.zone.runOutsideAngular(() => {
      if (this.mousePointThumb) {
        const correctValue = Math.round(pos / this.metrics.tickSize);
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
        const mousePosition =
          this.lastMouseEvent[this.axisConfig.clientPos] - canvas[this.axisConfig.canvasOffset];

        const trackerSize = this.imagesThumps.imgThumb?.[this.axisConfig.thumbSizeProp] || 0;
        const trackerPosition = this.value * this.metrics.tickSize;
        const trackerEnd = trackerPosition + trackerSize;

        if (
          (this.moveAnimationValue < 0 && trackerPosition <= mousePosition) ||
          (this.moveAnimationValue > 0 && trackerEnd >= mousePosition)
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

  private incrementFrameCount(): void {
    this.moveAnimationFrameCount++;
  }

  private shouldUpdateValue(): boolean {
    return (
      this.moveAnimationFrameModulo <= 1 ||
      this.moveAnimationFrameCount % this.moveAnimationFrameModulo === 0
    );
  }

  private updateAnimationState(steps: number): void {
    this.decreaseFrameModulo();
    this.updateScrollValue(steps);
  }

  private decreaseFrameModulo(): void {
    if (this.moveAnimationFrameModulo > 1) {
      this.moveAnimationFrameModulo -= 2;
    }
  }

  private updateScrollValue(steps: number): void {
    const IS_BACKWARD_LIMIT = -1;
    const newValue = this.value + steps * this.moveAnimationValue;

    const realMax =
      this.maxValue -
      this.visibleValue +
      SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE;
    if (
      (this.moveAnimationValue > 0 && newValue >= realMax) ||
      (this.moveAnimationValue < 0 && newValue <= IS_BACKWARD_LIMIT)
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

  private scheduleNextFrame(steps: number): void {
    const requestId = window.requestAnimationFrame(() => {
      this.frameRequests.push(requestId);
      this.moveAnimation(steps);
    });
  }

  private stopMoveAnimation(): void {
    this.shouldStopAnimation = true;
    this.resetAnimationState();
    this.cancelAnimationFrames();
    this.lastMouseEvent = null;
    this.isScrollbarClick = false;
  }

  private resetAnimationState(): void {
    this.moveAnimationFrameCount = 0;
    this.moveAnimationValue = ArrowDirection.NONE;
    this.moveAnimationFrameModulo = this.INITIAL_ANIMATION_FRAME_MODULO;
  }

  private cancelAnimationFrames(): void {
    this.frameRequests.forEach((requestId) =>
      window.cancelAnimationFrame(requestId)
    );
    this.frameRequests = [];
  }

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
      const pos: number = event[this.axisConfig.clientPos] - canvas[this.axisConfig.canvasOffset];
      return this.isMouseOverThumbSub(pos);
    }

    return false;
  }

  private isMouseOverThumbSub(pos: number): boolean {
    const correctedPos = Math.round(pos / this.metrics.tickSize);

    if (this.imagesThumps.imgThumb) {
      const thumbTicks = Math.round(
        this.imagesThumps.imgThumb![this.axisConfig.thumbSizeProp] / this.metrics.tickSize
      );
      if (correctedPos >= this.value && correctedPos <= this.value + thumbTicks) {
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
    this.disableBackwardArrow = this.isAtStart();
    this.disableForwardArrow = this.isAtEnd();
    const host = this.hostRef?.nativeElement as HTMLElement;
    this.hideArrowButtons = !host || host.offsetWidth === 0 || host.offsetHeight === 0;
    this.cdr.detectChanges();
  }
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

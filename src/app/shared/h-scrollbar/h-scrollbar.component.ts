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
  HostListener,
  NgZone,
  OnInit,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  Metrics,
  IMetrics,
  ScrollbarService,
} from 'src/app/services/scrollbar.service';
import { CheckContext } from 'src/app/services/check-context.decorator';

@Component({
  selector: 'app-h-scrollbar',
  templateUrl: './h-scrollbar.component.html',
  styleUrls: ['./h-scrollbar.component.scss'],
})
export class HScrollbarComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() value: number = 0;
  @Input() maxValue: number = 365;
  @Input() visibleValue: number = 180;

  @Output() valueChange = new EventEmitter<number>();

  @ViewChild('canvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;
  public safeTriangleSvgLeft!: SafeHtml;
  public safeTriangleSvgRight!: SafeHtml;
  public disableLeftArrow: boolean = false;
  public disableRightArrow: boolean = false;

  private imagesThumps: ImagesThumps = new ImagesThumps();
  private metrics: IMetrics = new Metrics();
  private ctx: CanvasRenderingContext2D | null = null;
  private maxFrameModuloNumber = 10;
  private moveAnimationValue = 0;
  private moveAnimationFrameCount = 0;
  private moveAnimationFrameModulo = 10;
  private frameRequests: number[] = [];
  private shouldStopAnimation = false;
  private mouseEnterThumb = false;
  private MousePointThumb = false;
  private MouseXToThumbX = 0;
  private mouseOverThumb = false;
  private firstStepsByMoveAnimation = 3;

  constructor(
    private zone: NgZone,
    private sanitizer: DomSanitizer,
    private scrollbarService: ScrollbarService
  ) {}

  ngOnInit() {
    this.safeTriangleSvgLeft = this.sanitizer.bypassSecurityTrustHtml(
      this.scrollbarService.triangleLeftSvg
    );
    this.safeTriangleSvgRight = this.sanitizer.bypassSecurityTrustHtml(
      this.scrollbarService.triangleRightSvg
    );
  }

  ngAfterViewInit() {
    this.initCanvas();
    this.refresh();
  }

  @CheckContext
  ngOnChanges(changes: SimpleChanges) {
    this.handleMaxValueOrVisibleValueChanges(changes);
    this.handleValueChanges(changes);
    this.updateArrowButtonsState();
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

  onResize(entries: ResizeObserverEntry[]): void {
    if (entries && entries.length > 0) {
      const entry = entries[0];
      if (entry) {
        const canvas = this.canvasRef.nativeElement;
        (canvas.width = entry.contentRect.width - 50), this.refresh();
      }
    }
  }

  private initCanvas() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (this.ctx) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      this.refresh();
    }
  }

  refresh() {
    this.updateMetrics();
    this.createThumb();
    this.reDraw();
    this.updateArrowButtonsState();
  }

  private updateMetrics(): void {
    const percent = Math.round((this.visibleValue / this.maxValue) * 100);
    const canvas = this.canvasRef.nativeElement;
    this.metrics = this.scrollbarService.calcMetrics(
      canvas.width,
      percent,
      this.visibleValue,
      this.maxValue
    );
  }

  private createThumb(): void {
    this.scrollbarService.createThumbHorizontal(
      this.metrics,
      this.imagesThumps
    );
  }

  /* #region Redraw */
  @CheckContext
  private reDraw(): void {
    if (!this.isDrawingPossible()) {
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');

    if (!this.ctx) {
      return;
    }

    this.ctx.save();
    this.clearCanvas(canvas);
    this.drawThumb(canvas);
    this.ctx.restore();
  }

  private isDrawingPossible(): boolean {
    return (
      (!!this.imagesThumps.imgThumb || !!this.imagesThumps.imgSelectedThumb) &&
      this.metrics.thumbLength !== Infinity &&
      this.metrics.tickSize !== Infinity
    );
  }

  private clearCanvas(canvas: HTMLCanvasElement): void {
    this.ctx!.clearRect(0, 0, canvas.width, canvas.height);
  }

  private drawThumb(canvas: HTMLCanvasElement): void {
    const thumbImage = this.getThumbImage();
    if (!thumbImage) {
      return;
    }
    const xPosition = this.calculateXPosition(
      canvas,
      this.value,
      this.metrics.tickSize,
      thumbImage.width
    );
    const yPosition = this.calculateYPosition(canvas, thumbImage);

    this.ctx!.putImageData(thumbImage, xPosition, yPosition);
  }

  private getThumbImage(): ImageData | undefined {
    return this.mouseOverThumb
      ? this.imagesThumps.imgSelectedThumb
      : this.imagesThumps.imgThumb;
  }

  private calculateYPosition(
    canvas: HTMLCanvasElement,
    thumbImage: ImageData
  ): number {
    return (canvas.height - thumbImage.height) / 2 + 1;
  }

  private calculateXPosition(
    canvas: HTMLCanvasElement,
    value: number,
    tickSize: number,
    trackWidth: number
  ): number {
    let tmpX = value * tickSize;
    if (tmpX + trackWidth > canvas.width) {
      tmpX = canvas.width - trackWidth;
    }

    return tmpX;
  }

  /* #endregion Redraw */

  /* #region Events */

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
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
      this.initiateMoveAnimation(event, canvas);
    }
  }

  private initiateMoveAnimation(
    event: MouseEvent,
    canvas: HTMLCanvasElement
  ): void {
    this.moveAnimationValue =
      event.clientX < this.value + canvas.offsetLeft ? -1 : 1;
    this.moveAnimationFrameModulo = this.maxFrameModuloNumber;
    this.shouldStopAnimation = false;
    this.moveAnimation(this.firstStepsByMoveAnimation);
  }

  @HostListener('mouseup', ['$event']) onMouseUp(event: MouseEvent): void {
    this.mouseEnterThumb = false;
    this.MouseXToThumbX = 0;
    const canvas = this.canvasRef.nativeElement;
    if (canvas) {
      canvas.onpointermove = null;
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
      this.MouseXToThumbX = event.clientX - this.value;
      const canvas = this.canvasRef.nativeElement;
      if (canvas) {
        canvas.setPointerCapture(event.pointerId);
      }
    }
  }

  @HostListener('pointerup', ['$event']) onPointerUp(
    event: PointerEvent
  ): void {
    this.MousePointThumb = false;
    const canvas = this.canvasRef.nativeElement;
    if (canvas) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (this.MousePointThumb) {
      this.updateValueFromPointerMove(event);
    }
  }

  private updateValueFromPointerMove(event: PointerEvent): void {
    const x = event.clientX - this.MouseXToThumbX;
    this.zone.runOutsideAngular(() => {
      if (this.MousePointThumb) {
        const correctValue = Math.round(x / this.metrics.tickSize);
        this.updateValue(correctValue);
      }
    });
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

  /* #region animation */

  @CheckContext
  private moveAnimation(steps: number): void {
    this.zone.runOutsideAngular(() => {
      this.incrementFrameCount();

      if (this.shouldStopAnimation) return;

      if (this.shouldUpdateValue()) {
        this.updateAnimationState(steps);
      }

      this.scheduleNextFrame(steps);
    });
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
      this.moveAnimationFrameModulo--;
    }
  }

  // Updates the scroll value
  private updateScrollValue(steps: number): void {
    const newValue = this.value + steps * this.moveAnimationValue;
    this.updateValue(newValue);
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
  }

  // Resets the animation state
  private resetAnimationState(): void {
    this.moveAnimationFrameCount = 0;
    this.moveAnimationValue = 0;
  }

  // Cancels all running animation frames
  private cancelAnimationFrames(): void {
    this.frameRequests.forEach((requestId) =>
      window.cancelAnimationFrame(requestId)
    );
    this.frameRequests = [];
  }

  /* #endregion animation */

  private clampValue(value: number): number {
    return Math.max(0, Math.min(value, this.imagesThumps.invisibleTicks + 1));
  }

  @CheckContext
  private updateValue(newValue: number) {
    newValue = this.clampValue(newValue);
    if (newValue !== this.value) {
      this.value = newValue;
      this.valueChange.emit(this.value);
      this.reDraw();
    }
  }

  isMouseOverThumb(event: MouseEvent): boolean {
    const canvas = this.canvasRef.nativeElement;
    if (canvas) {
      const x: number = event.clientX - canvas.offsetLeft;
      return this.isMouseOverThumbSub(x);
    }

    return false;
  }

  private isMouseOverThumbSub(x: number): boolean {
    const correctedX = Math.round(x / this.metrics.tickSize);
    if (
      correctedX >= this.value &&
      correctedX <= this.value + this.metrics.visibleTicks
    ) {
      return true;
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
    this.disableLeftArrow = this.isAtStart();
    this.disableRightArrow = this.isAtEnd();
  }
}

export interface IImagesThumps {
  invisibleTicks: number;
  imgThumb: ImageData | undefined;
  imgSelectedThumb: ImageData | undefined;
}
export class ImagesThumps implements IImagesThumps {
  invisibleTicks: number = 0;
  imgThumb: ImageData | undefined = undefined;
  imgSelectedThumb: ImageData | undefined = undefined;
}

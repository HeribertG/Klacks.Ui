// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Generic scrollbar component supporting both horizontal and vertical orientations.
 * @param orientation - 'horizontal' or 'vertical', determines axis behavior (scroll direction, mouse tracking, thumb rendering)
 * @param value - Current scroll position in ticks
 * @param maxValue - Total number of ticks in the scrollable range
 * @param visibleValue - Number of ticks visible without scrolling
 */
import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, NgZone, OnChanges,
  OnDestroy, OnInit, SimpleChanges, ViewChild, inject, output
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { ResizeDirective } from 'src/app/presentation/directives/resize.directive';
import { InputModalityService } from 'src/app/presentation/services/input-modality.service';
import { ScrollbarService } from './scrollbar.service';
import { SCROLLBAR_CONSTANTS } from './constants';
import { maxScrollValue } from './scroll-range.helper';
import { ScrollAnimationService } from './scroll-animation.service';
import { AxisConfig } from './axis-config.interface';
import { HORIZONTAL_AXIS_CONFIG, VERTICAL_AXIS_CONFIG } from './scrollbar-axis.constants';
import { arrowSvgs } from './scrollbar-arrow.helper';
import { ScrollbarCanvasRendererService } from './scrollbar-canvas-renderer.service';
import { ScrollbarPointerService } from './scrollbar-pointer.service';
import { ScrollbarResizeService } from './scrollbar-resize.service';
import { ScrollbarHost } from './scrollbar-host.interface';

export type ScrollbarOrientation = 'horizontal' | 'vertical';

@Component({
  selector: 'app-scrollbar',
  templateUrl: './scrollbar.component.html',
  styleUrls: ['./scrollbar.component.scss'],
  standalone: true,
  imports: [ResizeDirective],
  providers: [ScrollAnimationService, ScrollbarCanvasRendererService, ScrollbarPointerService, ScrollbarResizeService],
  host: {
    '[class.horizontal]': 'orientation === "horizontal"',
    '[class.vertical]': 'orientation === "vertical"',
    '[class.touch-mode]': 'inputModality.isTouchMode()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollbarComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('canvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() orientation: ScrollbarOrientation = 'vertical';
  @Input() maxValue = 365;
  @Input() visibleValue = 180;

  readonly valueChange = output<number>();
  readonly maxValueChange = output<number>();
  @Input()
  get value(): number {
    return this._value;
  }

  set value(newValue: number) {
    const upper = maxScrollValue(this.maxValue ?? 0, this.visibleValue ?? 0);
    const clampedValue = Math.max(0, Math.min(newValue ?? 0, isFinite(upper) ? upper : 0));

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
  protected readonly inputModality = inject(InputModalityService);
  private animationService = inject(ScrollAnimationService);
  private renderer = inject(ScrollbarCanvasRendererService);
  private pointer = inject(ScrollbarPointerService);
  private resizer = inject(ScrollbarResizeService);

  public safeTriangleSvgBackward!: SafeHtml;
  public safeTriangleSvgForward!: SafeHtml;
  public disableBackwardArrow = false;
  public disableForwardArrow = false;
  public hideArrowButtons = false;

  private _value = 0;

  private destroy$ = new Subject<void>();

  private axisConfig: AxisConfig = VERTICAL_AXIS_CONFIG;

  private readonly scrollbarHost: ScrollbarHost = {
    canvas: () => this.canvasRef.nativeElement,
    axis: () => this.axisConfig,
    isHorizontal: () => this.orientation === 'horizontal',
    isHorizontalRtl: () => this.isHorizontalRtl,
    value: () => this._value,
    maxValue: () => this.maxValue,
    visibleValue: () => this.visibleValue,
    updateValue: (newValue: number) => this.updateValue(newValue),
    emitValueChange: () => this.zone.run(() => this.valueChange.emit(this.value)),
    reDraw: () => this.reDraw(),
    refresh: () => this.refresh(),
    updateArrowButtonsState: () => this.updateArrowButtonsState(),
  };

  constructor() {
    this.renderer.bind(this.scrollbarHost);
    this.pointer.bind(this.scrollbarHost);
    this.resizer.bind(this.scrollbarHost);
  }

  ngOnInit() {
    this.axisConfig = this.orientation === 'horizontal' ? HORIZONTAL_AXIS_CONFIG : VERTICAL_AXIS_CONFIG;

    const svgs = arrowSvgs(this.axisConfig, this.scrollbarService, this.isHorizontalRtl);
    this.safeTriangleSvgBackward = this.sanitizer.bypassSecurityTrustHtml(svgs.backward);
    this.safeTriangleSvgForward = this.sanitizer.bypassSecurityTrustHtml(svgs.forward);

    this.pointer.connectAnimation();
  }

  ngAfterViewInit() {
    this.initCanvas();
    this.setupEventListeners();
    this.refresh();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.renderer.hasContext()) return;
    this.handleMaxValueOrVisibleValueChanges(changes);
    this.handleMaxValueChanges(changes);
    this.handleValueChanges(changes);
    this.updateArrowButtonsState();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.animationService.destroy();
    this.renderer.release();
    this.pointer.release();
  }

  private handleMaxValueOrVisibleValueChanges(changes: SimpleChanges): void {
    if (changes['maxValue'] || changes['visibleValue']) {
      this.clampCurrentValue();
      this.refresh();
    }
  }

  private clampCurrentValue(): void {
    const upper = maxScrollValue(this.maxValue, this.visibleValue);
    if (this._value > upper) {
      this._value = Math.max(0, upper);
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

    this.pointer.listen(canvas, this.destroy$);
    this.resizer.listenToWindow(this.destroy$);
  }

  private initCanvas(): void {
    if (this.renderer.attach(this.canvasRef.nativeElement)) {
      this.refresh();
    }
  }

  refresh(): void {
    this.renderer.measure();
    this.reDraw();
    this.updateArrowButtonsState();
  }

  private reDraw(): void {
    if (!this.renderer.hasContext()) return;
    this.renderer.draw(this.pointer.isOverThumb());
  }

  private get isHorizontalRtl(): boolean {
    return this.orientation === 'horizontal' && document.documentElement.dir === 'rtl';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onResize(event: any): void {
    this.resizer.applyResizeEntries(event);
  }

  onArrowThumbPointerDown(event: PointerEvent, direction: number) {
    if (!this.pointer.isPrimaryClick(event)) return;
    const newValue = this.value + direction;
    this.animationService.startArrowHoldAnimation(direction, newValue);
    event.preventDefault();
    event.stopPropagation();
  }

  onArrowThumbPointerEnd(event: PointerEvent) {
    this.animationService.stopArrowHold();
    event.preventDefault();
    event.stopPropagation();
  }

  private clampValue(value: number): number {
    const upper = (this.renderer.imagesThumps.invisibleTicks ?? 0) + SCROLLBAR_CONSTANTS.TICKS_OUTSIDE_RANGE;
    return Math.max(0, Math.min(value ?? 0, isFinite(upper) ? upper : 0));
  }

  private updateValue(newValue: number) {
    newValue = this.clampValue(newValue);
    if (newValue !== this._value) {
      this._value = newValue;
      this.valueChange.emit(this._value);
      this.reDraw();
      this.updateArrowButtonsState();
    }
  }

  isMouseOverThumb(event: MouseEvent): boolean {
    return this.pointer.isMouseOverThumb(event);
  }

  private isAtStart(): boolean {
    return this.value <= 0;
  }

  private isAtEnd(): boolean {
    return this.value >= this.maxValue - this.visibleValue;
  }

  private updateArrowButtonsState(): void {
    if (!this.renderer.hasContext()) return;
    this.disableBackwardArrow = this.isAtStart();
    this.disableForwardArrow = this.isAtEnd();
    const host = this.hostRef?.nativeElement as HTMLElement;
    this.hideArrowButtons = !host || host.offsetWidth === 0 || host.offsetHeight === 0;
    this.cdr.detectChanges();
  }
}

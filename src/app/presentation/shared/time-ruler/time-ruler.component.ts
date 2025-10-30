import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  Input,
  inject,
} from '@angular/core';
import { OwnTime } from 'src/app/domain/models/schedule-class';
import { DrawHelper } from '../../helpers/draw-helper';
import { DrawImageHelper } from '../../helpers/draw-image-helper';
import { TimeRangeService } from './services/time-range.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';

@Component({
  selector: 'app-time-ruler',
  imports: [],
  templateUrl: './time-ruler.component.html',
  styleUrl: './time-ruler.component.scss',
})
export class TimeRulerComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() fromTime: OwnTime = OwnTime.forTime('00', '00');
  @Input() untilTime: OwnTime = OwnTime.forTime('24', '00');

  private readonly PADDING_MINUTES_DEFAULT = 30;
  private readonly PADDING_MINUTES_SHORT = 15;
  private readonly PADDING_MINUTES_VERY_SHORT = 10;
  private readonly DURATION_THRESHOLD_SHORT = 6 * 60;
  private readonly DURATION_THRESHOLD_VERY_SHORT = 3 * 60;
  private readonly RULER_WIDTH = 70;

  private readonly MINUTES_PER_HOUR = 60;
  private readonly MINUTES_PER_HALF_HOUR = 30;
  private readonly MINUTES_PER_QUARTER_HOUR = 15;
  private readonly MINUTE_INCREMENT = 1;

  private readonly MIN_PIXELS_FOR_HALF_HOUR_DISPLAY = 15;
  private readonly MIN_PIXELS_FOR_QUARTER_HOUR_DISPLAY = 12;

  private readonly HOUR_LINE_LENGTH = 25;
  private readonly HALF_HOUR_LINE_LENGTH = 18;
  private readonly QUARTER_HOUR_LINE_LENGTH = 12;
  private readonly MINUTE_LINE_LENGTH = 6;

  private readonly LABEL_OFFSET = 3;

  private readonly TIME_MARK_LINE_WIDTH = 1;
  private readonly TIME_MARK_FONT = '10px Arial';
  private readonly TIME_MARK_TEXT_ALIGN: CanvasTextAlign = 'left';
  private readonly TIME_MARK_TEXT_BASELINE: CanvasTextBaseline = 'middle';

  private readonly BOUNDARY_LINE_WIDTH = 2;

  private _lastFromTimeString = '';
  private _lastUntilTimeString = '';

  @ViewChild('inboxCanvas', { static: false })
  inboxCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rulerCanvas', { static: false })
  rulerCanvasRef!: ElementRef<HTMLCanvasElement>;

  private timeRangeService = inject(TimeRangeService);
  private gridColorService = inject(GridColorService);
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    this.setupCanvas();
    this.setupResizeObserver();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['fromTime'] || changes['untilTime']) && this.inboxCanvasRef) {
      const fromTimeString = `${this.fromTime.hours}:${this.fromTime.minutes}`;
      const untilTimeString = `${this.untilTime.hours}:${this.untilTime.minutes}`;

      if (
        fromTimeString !== this._lastFromTimeString ||
        untilTimeString !== this._lastUntilTimeString
      ) {
        this._lastFromTimeString = fromTimeString;
        this._lastUntilTimeString = untilTimeString;
        this.setupCanvas();
      }
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private calculatePaddingMinutes(): number {
    const fromMinutes = this.timeRangeService.toMinutes(this.fromTime);
    let untilMinutes = this.timeRangeService.toMinutes(this.untilTime);

    if (untilMinutes <= fromMinutes) {
      untilMinutes += 24 * 60;
    }

    const durationMinutes = untilMinutes - fromMinutes;

    if (durationMinutes <= this.DURATION_THRESHOLD_VERY_SHORT) {
      return this.PADDING_MINUTES_VERY_SHORT;
    } else if (durationMinutes <= this.DURATION_THRESHOLD_SHORT) {
      return this.PADDING_MINUTES_SHORT;
    } else {
      return this.PADDING_MINUTES_DEFAULT;
    }
  }

  private setupCanvas(): void {
    const inboxCanvas = this.inboxCanvasRef.nativeElement;
    const rulerCanvas = this.rulerCanvasRef.nativeElement;

    const container = inboxCanvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const inboxCtx = DrawHelper.createHiDPICanvas(inboxCanvas, width, height);

    const rulerWidth = this.RULER_WIDTH;
    const boundaryWidth = width - rulerWidth;
    const rulerCtx = DrawHelper.createHiDPICanvas(
      rulerCanvas,
      rulerWidth,
      height
    );

    inboxCtx.fillStyle = this.gridColorService.controlBackGroundColor;
    inboxCtx.fillRect(0, 0, boundaryWidth, height);

    rulerCtx.fillStyle = this.gridColorService.toolTipBackGroundColor;
    rulerCtx.fillRect(0, 0, rulerWidth, height);

    this.drawTimeRuler(rulerCtx, height);
    this.drawBoundaryLines(inboxCtx, boundaryWidth, height);

    DrawImageHelper.drawCanvasLogical(
      inboxCtx,
      rulerCanvas,
      boundaryWidth,
      0,
      rulerWidth,
      height
    );
  }

  private drawTimeRuler(ctx: CanvasRenderingContext2D, height: number): void {
    const paddingMinutes = this.calculatePaddingMinutes();
    const range = this.timeRangeService.calculateDisplayRange(
      this.fromTime,
      this.untilTime,
      paddingMinutes
    );

    if (range.totalMinutes <= 0) return;

    ctx.strokeStyle = this.gridColorService.mainFontColor;
    ctx.fillStyle = this.gridColorService.mainFontColor;
    ctx.lineWidth = this.TIME_MARK_LINE_WIDTH;
    ctx.font = this.TIME_MARK_FONT;
    ctx.textAlign = this.TIME_MARK_TEXT_ALIGN;
    ctx.textBaseline = this.TIME_MARK_TEXT_BASELINE;

    const pixelsPerMinute = height / range.totalMinutes;
    const pixelsPerHalfHour = pixelsPerMinute * this.MINUTES_PER_HALF_HOUR;
    const pixelsPerQuarterHour =
      pixelsPerMinute * this.MINUTES_PER_QUARTER_HOUR;

    const { increment, showHalfHourLabels } =
      this.timeRangeService.calculateOptimalIncrement(pixelsPerMinute);
    const showHalfHours =
      pixelsPerHalfHour >= this.MIN_PIXELS_FOR_HALF_HOUR_DISPLAY;
    const showQuarterHours =
      pixelsPerQuarterHour >= this.MIN_PIXELS_FOR_QUARTER_HOUR_DISPLAY;
    const showMinutes = increment === this.MINUTE_INCREMENT;

    let startMinute = range.displayFromMinutes;
    if (increment >= this.MINUTES_PER_HOUR) {
      startMinute =
        Math.floor(range.displayFromMinutes / increment) * increment;
    }

    for (
      let minute = startMinute;
      minute <= range.displayUntilMinutes;
      minute += increment
    ) {
      const relativeMinutes = minute - range.displayFromMinutes;
      const y = (relativeMinutes / range.totalMinutes) * height;

      const isHour = minute % this.MINUTES_PER_HOUR === 0;
      const isHalfHour = minute % this.MINUTES_PER_HALF_HOUR === 0;
      const isQuarterHour = minute % this.MINUTES_PER_QUARTER_HOUR === 0;

      let lineLength = 0;
      let showLabel = false;

      if (isHour) {
        lineLength = this.HOUR_LINE_LENGTH;
        showLabel = true;
      } else if (isHalfHour && showHalfHours) {
        lineLength = this.HALF_HOUR_LINE_LENGTH;
        showLabel = showMinutes || showHalfHourLabels;
      } else if (isQuarterHour && showQuarterHours) {
        lineLength = this.QUARTER_HOUR_LINE_LENGTH;
        showLabel = false;
      } else if (showMinutes) {
        lineLength = this.MINUTE_LINE_LENGTH;
        showLabel = false;
      }

      if (lineLength > 0) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(lineLength, y);
        ctx.stroke();

        if (showLabel) {
          const timeLabel = this.timeRangeService.formatTime(minute);
          ctx.fillText(timeLabel, lineLength + this.LABEL_OFFSET, y);
        }
      }
    }
  }

  private drawBoundaryLines(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const paddingMinutes = this.calculatePaddingMinutes();
    const range = this.timeRangeService.calculateDisplayRange(
      this.fromTime,
      this.untilTime,
      paddingMinutes
    );

    const fromY =
      ((range.originalFromMinutes - range.displayFromMinutes) /
        range.totalMinutes) *
      height;
    const untilY =
      ((range.originalUntilMinutes - range.displayFromMinutes) /
        range.totalMinutes) *
      height;

    ctx.strokeStyle = this.gridColorService.warningColor;
    ctx.lineWidth = this.BOUNDARY_LINE_WIDTH;

    ctx.beginPath();
    ctx.moveTo(0, fromY);
    ctx.lineTo(width, fromY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, untilY);
    ctx.lineTo(width, untilY);
    ctx.stroke();
  }

  private setupResizeObserver(): void {
    const inboxCanvas = this.inboxCanvasRef.nativeElement;
    const container = inboxCanvas.parentElement;
    if (!container) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.setupCanvas();
    });

    this.resizeObserver.observe(container);
  }
}

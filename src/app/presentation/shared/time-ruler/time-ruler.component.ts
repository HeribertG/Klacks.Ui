// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/consistent-generic-constructors */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  EventEmitter,
  inject,
  effect,
  Injector,
} from '@angular/core';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { DrawHelper } from '../../helpers/draw-helper';
import { DrawImageHelper } from '../../helpers/draw-image-helper';
import { Gradient3DBorderStyleEnum } from '../grid/enums/gradient-3d-border-style';
import {
  TextAlignmentEnum,
  BaselineAlignmentEnum,
} from '../grid/enums/cell-settings.enum';
import { TimeRangeService } from './services/time-range.service';
import { TimeRulerDragDropService } from './services/time-ruler-drag-drop.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';

export interface IShiftContextMenuEvent {
  item: IContainerTemplateItem;
  mouseEvent: MouseEvent;
}

@Component({
  selector: 'app-time-ruler',
  imports: [],
  templateUrl: './time-ruler.component.html',
  styleUrl: './time-ruler.component.scss',
  providers: [TimeRulerDragDropService],
})
export class TimeRulerComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() fromTime: OwnTime = OwnTime.forTime('00', '00');
  @Input() untilTime: OwnTime = OwnTime.forTime('24', '00');
  @Output() shiftRightClick = new EventEmitter<IShiftContextMenuEvent>();

  private shifts: IContainerTemplateItem[] = [];
  private selectedShift: IContainerTemplateItem | null = null;
  private shiftRectangles: Map<IContainerTemplateItem, Rectangle> = new Map();

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

  private readonly SHIFT_TEXT_FONT_SIZE = 12;
  private readonly SHIFT_TEXT_FONT = '12px Arial';

  private readonly BOUNDARY_LINE_WIDTH = 2;
  private readonly BOUNDARY_GRADIENT_HEIGHT = 12;
  private readonly BOUNDARY_GRADIENT_OPACITY = 0.2;
  private readonly BOUNDARY_GRADIENT_OPACITY_TRANSPARENT = 0.0;

  private readonly SHIFT_BOX_MARGIN_LEFT_RIGHT = 8;
  private readonly SHIFT_BOX_BORDER_DEPTH = 4;
  private readonly SHIFT_BOX_SELECTION_OPACITY = 0.2;
  private readonly TRAVEL_TIME_BACKGROUND_COLOR = '#F5F5DC';
  private readonly BRIEFING_TIME_BACKGROUND_COLOR = 'rgb(149, 185, 208)';

  private readonly MINUTES_PER_DAY = 24 * 60;

  private _lastFromTimeString = '';
  private _lastUntilTimeString = '';

  @ViewChild('inboxCanvas', { static: false })
  inboxCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rulerCanvas', { static: false })
  rulerCanvasRef!: ElementRef<HTMLCanvasElement>;

  private timeRangeService = inject(TimeRangeService);
  private dragDropService = inject(TimeRulerDragDropService);
  private gridColorService = inject(GridColorService);
  private shiftService = inject(ContainerTemplateShiftService);
  private injector = inject(Injector);
  private resizeObserver?: ResizeObserver;

  private renderCanvas: HTMLCanvasElement | undefined;
  private renderCtx: CanvasRenderingContext2D | undefined;

  constructor() {
    effect(
      () => {
        const newShifts =
          this.shiftService.selectedContainerTemplateItemsSignal();
        this.shifts = newShifts;

        if (this.inboxCanvasRef) {
          this.setupCanvas();
        }
      },
      { injector: this.injector, allowSignalWrites: true }
    );

    effect(
      () => {
        const newSelectedShift = this.shiftService.selectedShiftSignal();
        const selectionChanged = this.selectedShift !== newSelectedShift;
        this.selectedShift = newSelectedShift;

        if (this.inboxCanvasRef && selectionChanged) {
          this.redrawWithSelection();
        }
      },
      { injector: this.injector, allowSignalWrites: true }
    );
  }

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
      untilMinutes += this.MINUTES_PER_DAY;
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

    if (!this.renderCanvas) {
      this.renderCanvas = document.createElement('canvas');
    }
    this.renderCtx = DrawHelper.createHiDPICanvas(
      this.renderCanvas,
      boundaryWidth,
      height
    );
    DrawHelper.setAntiAliasing(this.renderCtx);

    const paddingMinutes = this.calculatePaddingMinutes();
    const range = this.timeRangeService.calculateDisplayRange(
      this.fromTime,
      this.untilTime,
      paddingMinutes
    );
    const pixelsPerMinute = height / range.totalMinutes;

    this.dragDropService.initializeDragState(
      pixelsPerMinute,
      1,
      range.displayFromMinutes,
      range.totalMinutes
    );

    inboxCtx.fillStyle = this.gridColorService.backGroundColor;
    inboxCtx.fillRect(0, 0, boundaryWidth, height);

    rulerCtx.fillStyle = this.gridColorService.toolTipBackGroundColor;
    rulerCtx.fillRect(0, 0, rulerWidth, height);

    this.drawTimeRuler(rulerCtx, height);
    this.drawRedBoundaryLines(inboxCtx, boundaryWidth, height);
    this.renderShiftsToCache(boundaryWidth, height);
    this.drawFromCache(inboxCtx);

    if (this.selectedShift) {
      const {
        range: shiftRange,
        boxWidth,
        marginLeftRight,
      } = this.calculateShiftBoxParameters(boundaryWidth, height);

      const selectedRect = this.drawSingleShiftBox(
        inboxCtx,
        this.selectedShift,
        shiftRange,
        boxWidth,
        marginLeftRight,
        height,
        true
      );

      if (selectedRect) {
        this.shiftRectangles.set(this.selectedShift, selectedRect);
      }
    }

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

  private drawBoundaryLine(
    ctx: CanvasRenderingContext2D,
    y: number,
    width: number,
    color: string,
    lineWidth: number,
    isStart: boolean
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    const rgbaColor = this.convertColorToRgba(
      color,
      this.BOUNDARY_GRADIENT_OPACITY
    );
    const transparentColor = this.convertColorToRgba(
      color,
      this.BOUNDARY_GRADIENT_OPACITY_TRANSPARENT
    );

    if (isStart) {
      const gradient = ctx.createLinearGradient(
        0,
        y,
        0,
        y + this.BOUNDARY_GRADIENT_HEIGHT
      );

      gradient.addColorStop(0, rgbaColor);
      gradient.addColorStop(1, transparentColor);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, y, width, this.BOUNDARY_GRADIENT_HEIGHT);
    } else {
      const gradient = ctx.createLinearGradient(
        0,
        y - this.BOUNDARY_GRADIENT_HEIGHT,
        0,
        y
      );

      gradient.addColorStop(0, transparentColor);
      gradient.addColorStop(1, rgbaColor);

      ctx.fillStyle = gradient;
      ctx.fillRect(
        0,
        y - this.BOUNDARY_GRADIENT_HEIGHT,
        width,
        this.BOUNDARY_GRADIENT_HEIGHT
      );
    }
  }

  private convertColorToRgba(color: string, opacity: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return `rgba(0, 0, 0, ${opacity})`;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const imageData = ctx.getImageData(0, 0, 1, 1);
    const pixel = imageData.data;

    return `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${opacity})`;
  }

  private drawBoundaryLines(
    ctx: CanvasRenderingContext2D,
    startY: number,
    endY: number,
    width: number,
    color: string,
    lineWidth: number
  ): void {
    this.drawBoundaryLine(ctx, startY, width, color, lineWidth, true);
    this.drawBoundaryLine(ctx, endY, width, color, lineWidth, false);
  }

  private drawRedBoundaryLines(
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

    this.drawBoundaryLines(
      ctx,
      fromY,
      untilY,
      width,
      this.gridColorService.warningColor,
      this.BOUNDARY_LINE_WIDTH
    );
  }

  private drawBlueBoundaryLines(
    ctx: CanvasRenderingContext2D,
    item: IContainerTemplateItem,
    range: any,
    boxWidth: number,
    marginLeftRight: number,
    height: number
  ): void {
    if (!item.shift?.startShift || !item.shift?.endShift) return;

    const startTime = this.timeRangeService.parseTimeString(
      item.shift.startShift
    );
    const endTime = this.timeRangeService.parseTimeString(item.shift.endShift);

    if (!startTime || !endTime) return;

    const startMinutes =
      startTime.hours * this.MINUTES_PER_HOUR + startTime.minutes;
    let endMinutes = endTime.hours * this.MINUTES_PER_HOUR + endTime.minutes;

    if (endMinutes < startMinutes) {
      endMinutes += this.MINUTES_PER_DAY;
    }

    const timeRangeStartY =
      ((startMinutes - range.displayFromMinutes) / range.totalMinutes) * height;
    const timeRangeEndY =
      ((endMinutes - range.displayFromMinutes) / range.totalMinutes) * height;

    this.drawBoundaryLines(
      ctx,
      timeRangeStartY,
      timeRangeEndY,
      boxWidth + marginLeftRight * 2,
      this.gridColorService.focusBorderColor,
      this.BOUNDARY_LINE_WIDTH
    );
  }

  private calculateShiftBoxParameters(width: number, height: number) {
    const paddingMinutes = this.calculatePaddingMinutes();
    const range = this.timeRangeService.calculateDisplayRange(
      this.fromTime,
      this.untilTime,
      paddingMinutes
    );

    const marginLeftRight = this.SHIFT_BOX_MARGIN_LEFT_RIGHT;
    const boxWidth = width - 2 * marginLeftRight;

    return { range, boxWidth, marginLeftRight };
  }

  private drawSingleShiftBox(
    ctx: CanvasRenderingContext2D,
    item: IContainerTemplateItem,
    range: any,
    boxWidth: number,
    marginLeftRight: number,
    height: number,
    isSelected = false
  ): Rectangle | null {
    const hasTimeRange =
      item.shift?.isTimeRange &&
      item.timeRangeStartShift &&
      item.timeRangeEndShift;
    const hasFixedTime = item.startShift && item.endShift;

    if (!hasTimeRange && !hasFixedTime) {
      return null;
    }

    const bodyStartMinutes = this.timeRangeService.getShiftStartMinutes(item);
    const bodyEndMinutes = this.timeRangeService.getShiftEndMinutes(item);

    if (bodyStartMinutes === 0 && bodyEndMinutes === 0) {
      return null;
    }

    let startMinutes = bodyStartMinutes;
    let endMinutes = bodyEndMinutes;

    if (item.startShift && item.endShift) {
      const startTime = this.timeRangeService.parseTimeString(item.startShift);
      const endTime = this.timeRangeService.parseTimeString(item.endShift);

      if (startTime && endTime) {
        startMinutes =
          startTime.hours * this.MINUTES_PER_HOUR + startTime.minutes;
        endMinutes = endTime.hours * this.MINUTES_PER_HOUR + endTime.minutes;

        if (endMinutes < startMinutes) {
          endMinutes += this.MINUTES_PER_DAY;
        }
      }
    }

    const startY =
      ((bodyStartMinutes - range.displayFromMinutes) / range.totalMinutes) *
      height;
    const endY =
      ((bodyEndMinutes - range.displayFromMinutes) / range.totalMinutes) *
      height;

    const pixelsPerMinute = height / range.totalMinutes;
    const durationMinutes = bodyEndMinutes - bodyStartMinutes;

    const briefingMinutes = this.parseTravelTimeToMinutes(item.briefingTime);
    const debriefingMinutes = this.parseTravelTimeToMinutes(item.debriefingTime);
    const travelBeforeMinutes = this.parseTravelTimeToMinutes(item.travelTimeBefore);
    const travelAfterMinutes = this.parseTravelTimeToMinutes(item.travelTimeAfter);

    if (travelBeforeMinutes > 0) {
      const briefingStartMinutes = bodyStartMinutes - briefingMinutes;
      const travelStartMinutes = briefingStartMinutes - travelBeforeMinutes;
      const travelStartY =
        ((travelStartMinutes - range.displayFromMinutes) / range.totalMinutes) * height;
      const travelEndY =
        ((briefingStartMinutes - range.displayFromMinutes) / range.totalMinutes) * height;

      const travelRect = new Rectangle(
        marginLeftRight,
        travelStartY,
        marginLeftRight + boxWidth,
        travelEndY
      );

      DrawHelper.fillRectangle(ctx, this.TRAVEL_TIME_BACKGROUND_COLOR, travelRect);
      DrawHelper.drawBaseBorder(ctx, this.gridColorService.borderColor, 1, travelRect);
    }

    if (briefingMinutes > 0) {
      const briefingStartMinutes = bodyStartMinutes - briefingMinutes;
      const briefingStartY =
        ((briefingStartMinutes - range.displayFromMinutes) / range.totalMinutes) * height;

      const briefingRect = new Rectangle(
        marginLeftRight,
        briefingStartY,
        marginLeftRight + boxWidth,
        startY
      );

      DrawHelper.fillRectangle(ctx, this.BRIEFING_TIME_BACKGROUND_COLOR, briefingRect);
      DrawHelper.drawBaseBorder(ctx, this.gridColorService.borderColor, 1, briefingRect);
    }

    const rect = new Rectangle(
      marginLeftRight,
      startY,
      marginLeftRight + boxWidth,
      endY
    );

    if (!isSelected) {
      this.shiftRectangles.set(item, rect);
    }

    const hasOverlap = this.checkShiftOverlap(
      item,
      bodyStartMinutes,
      bodyEndMinutes
    );
    const backgroundColor = hasOverlap
      ? this.gridColorService.warningColor
      : this.gridColorService.controlBackGroundColor;

    DrawHelper.fillRectangle(ctx, backgroundColor, rect);

    if (isSelected) {
      ctx.save();

      ctx.globalAlpha = this.SHIFT_BOX_SELECTION_OPACITY;
      DrawHelper.fillRectangle(
        ctx,
        this.gridColorService.focusBorderColor,
        rect
      );

      ctx.restore();
    }

    const boxHeight = endY - startY;

    DrawHelper.drawBorder(
      ctx,
      marginLeftRight,
      startY,
      boxWidth,
      endY,
      this.gridColorService.controlBackGroundColor,
      this.SHIFT_BOX_BORDER_DEPTH,
      Gradient3DBorderStyleEnum.Raised
    );

    if ((item.shift?.isTimeRange || item.shift?.isSporadic) && isSelected) {
      this.drawBlueBoundaryLines(
        ctx,
        item,
        range,
        boxWidth,
        marginLeftRight,
        height
      );
    }

    const abbreviation = item.shift?.abbreviation || '';
    const name = item.shift?.name || '';
    const displayText = abbreviation ? `${abbreviation} - ${name}` : name;

    DrawHelper.drawText(
      ctx,
      displayText,
      rect.left,
      rect.top,
      rect.width,
      rect.height,
      this.SHIFT_TEXT_FONT,
      this.SHIFT_TEXT_FONT_SIZE,
      this.gridColorService.mainFontColor,
      TextAlignmentEnum.Center,
      BaselineAlignmentEnum.Center
    );

    if (debriefingMinutes > 0) {
      const debriefingEndMinutes = bodyEndMinutes + debriefingMinutes;
      const debriefingEndY =
        ((debriefingEndMinutes - range.displayFromMinutes) / range.totalMinutes) * height;

      const debriefingRect = new Rectangle(
        marginLeftRight,
        endY,
        marginLeftRight + boxWidth,
        debriefingEndY
      );

      DrawHelper.fillRectangle(ctx, this.BRIEFING_TIME_BACKGROUND_COLOR, debriefingRect);
      DrawHelper.drawBaseBorder(ctx, this.gridColorService.borderColor, 1, debriefingRect);
    }

    if (travelAfterMinutes > 0) {
      const debriefingEndMinutes = bodyEndMinutes + debriefingMinutes;
      const travelEndMinutes = debriefingEndMinutes + travelAfterMinutes;
      const travelStartY =
        ((debriefingEndMinutes - range.displayFromMinutes) / range.totalMinutes) * height;
      const travelEndY =
        ((travelEndMinutes - range.displayFromMinutes) / range.totalMinutes) * height;

      const travelRect = new Rectangle(
        marginLeftRight,
        travelStartY,
        marginLeftRight + boxWidth,
        travelEndY
      );

      DrawHelper.fillRectangle(ctx, this.TRAVEL_TIME_BACKGROUND_COLOR, travelRect);
      DrawHelper.drawBaseBorder(ctx, this.gridColorService.borderColor, 1, travelRect);
    }

    return rect;
  }

  private renderShiftsToCache(width: number, height: number): void {
    if (!this.shifts || this.shifts.length === 0 || !this.renderCtx) return;

    this.shiftRectangles.clear();

    this.renderCtx.fillStyle = this.gridColorService.backGroundColor;
    this.renderCtx.fillRect(0, 0, width, height);

    this.drawRedBoundaryLines(this.renderCtx, width, height);

    const { range, boxWidth, marginLeftRight } =
      this.calculateShiftBoxParameters(width, height);

    this.shifts.forEach((shift) => {
      this.drawSingleShiftBox(
        this.renderCtx!,
        shift,
        range,
        boxWidth,
        marginLeftRight,
        height,
        false
      );
    });
  }

  private drawFromCache(ctx: CanvasRenderingContext2D): void {
    if (!this.renderCanvas) return;

    const canvas = this.inboxCanvasRef.nativeElement;
    const container = canvas.parentElement;
    if (!container) return;

    const rulerWidth = this.RULER_WIDTH;
    const boundaryWidth = container.clientWidth - rulerWidth;
    const height = container.clientHeight;

    DrawImageHelper.drawCanvasLogical(
      ctx,
      this.renderCanvas,
      0,
      0,
      boundaryWidth,
      height
    );
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

  onCanvasClick(event: MouseEvent): void {
    if (this.dragDropService.dragState.isDragging) {
      return;
    }

    const canvas = this.inboxCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const logicalDimensions = DrawImageHelper.getLogicalDimensions(canvas);

    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const scaleX = logicalDimensions.width / rect.width;
    const scaleY = logicalDimensions.height / rect.height;

    const x = clickX * scaleX;
    const y = clickY * scaleY;

    for (const [item, shiftRect] of this.shiftRectangles) {
      if (shiftRect.pointInRect(x, y)) {
        this.shiftService.setSelectedShift(item);
        return;
      }
    }

    this.shiftService.setSelectedShift(null);
  }

  onContextMenu(event: MouseEvent): void {
    const canvas = this.inboxCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const logicalDimensions = DrawImageHelper.getLogicalDimensions(canvas);

    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const scaleX = logicalDimensions.width / rect.width;
    const scaleY = logicalDimensions.height / rect.height;

    const x = clickX * scaleX;
    const y = clickY * scaleY;

    for (const [item, shiftRect] of this.shiftRectangles) {
      if (shiftRect.pointInRect(x, y)) {
        event.preventDefault();
        event.stopPropagation();
        this.shiftService.setSelectedShift(item);
        this.shiftRightClick.emit({ item, mouseEvent: event });
        return;
      }
    }

    event.preventDefault();
  }

  onMouseDown(event: MouseEvent): void {
    const canvas = this.inboxCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const logicalDimensions = DrawImageHelper.getLogicalDimensions(canvas);

    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const scaleX = logicalDimensions.width / rect.width;
    const scaleY = logicalDimensions.height / rect.height;

    const x = clickX * scaleX;
    const y = clickY * scaleY;

    for (const [item, shiftRect] of this.shiftRectangles) {
      if (shiftRect.pointInRect(x, y) && item.shift?.isTimeRange) {
        const dragStarted = this.dragDropService.startDrag(y, item, shiftRect);
        if (dragStarted) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.dragDropService.dragState.isDragging) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const canvas = this.inboxCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const logicalDimensions = DrawImageHelper.getLogicalDimensions(canvas);

    const mouseY = event.clientY - rect.top;
    const scaleY = logicalDimensions.height / rect.height;
    const y = mouseY * scaleY;

    const newPosition = this.dragDropService.updateDrag(y, this.shifts);
    if (!newPosition) {
      return;
    }

    const draggedShift = this.dragDropService.dragState.draggedShift;
    if (draggedShift) {
      draggedShift.timeRangeStartShift =
        this.dragDropService.formatTimeFromMinutes(newPosition.newStartMinutes);
      draggedShift.timeRangeEndShift =
        this.dragDropService.formatTimeFromMinutes(newPosition.newEndMinutes);

      this.redrawCanvas();
    }
  }

  onMouseUp(event: MouseEvent): void {
    if (!this.dragDropService.dragState.isDragging) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const result = this.dragDropService.endDrag();
    if (result) {
      this.sortShiftsByTime();

      const canvas = this.inboxCanvasRef.nativeElement;
      const container = canvas.parentElement;
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;
      const rulerWidth = this.RULER_WIDTH;
      const boundaryWidth = width - rulerWidth;

      this.renderShiftsToCache(boundaryWidth, height);

      this.redrawWithSelection();
    }
  }

  private sortShiftsByTime(): void {
    const itemsToSort = this.shifts.filter((item) => item.shift?.isTimeRange);
    const otherItems = this.shifts.filter((item) => !item.shift?.isTimeRange);

    itemsToSort.sort((a, b) => {
      const aStart = this.timeRangeService.getShiftStartMinutes(a);
      const bStart = this.timeRangeService.getShiftStartMinutes(b);
      return aStart - bStart;
    });

    const newItemsArray = [...itemsToSort, ...otherItems];

    this.shiftService.setSelectedContainerTemplateItems(newItemsArray);
  }

  private checkShiftOverlap(
    currentItem: IContainerTemplateItem,
    startMinutes: number,
    endMinutes: number
  ): boolean {
    if (!currentItem.shift?.isTimeRange) {
      return false;
    }

    const otherItems = this.shifts.filter(
      (item) => item !== currentItem && item.shift?.isTimeRange
    );

    for (const otherItem of otherItems) {
      const otherStart = this.timeRangeService.getShiftStartMinutes(otherItem);
      const otherEnd = this.timeRangeService.getShiftEndMinutes(otherItem);

      if (this.timesOverlap(startMinutes, endMinutes, otherStart, otherEnd)) {
        if (startMinutes >= otherStart) {
          return true;
        }
      }
    }

    return false;
  }

  private timesOverlap(
    start1: number,
    end1: number,
    start2: number,
    end2: number
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  private redrawWithSelection(): void {
    const canvas = this.inboxCanvasRef.nativeElement;
    const container = canvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const inboxCtx = canvas.getContext('2d');
    if (!inboxCtx) return;

    const rulerWidth = this.RULER_WIDTH;
    const boundaryWidth = width - rulerWidth;

    inboxCtx.clearRect(0, 0, boundaryWidth, height);
    this.drawFromCache(inboxCtx);

    if (this.selectedShift) {
      const { range, boxWidth, marginLeftRight } =
        this.calculateShiftBoxParameters(boundaryWidth, height);

      const selectedRect = this.drawSingleShiftBox(
        inboxCtx,
        this.selectedShift,
        range,
        boxWidth,
        marginLeftRight,
        height,
        true
      );

      if (selectedRect) {
        this.shiftRectangles.set(this.selectedShift, selectedRect);
      }
    }
  }

  private redrawCanvas(): void {
    const canvas = this.inboxCanvasRef.nativeElement;
    const container = canvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const inboxCtx = canvas.getContext('2d');
    if (!inboxCtx) return;

    const rulerWidth = this.RULER_WIDTH;
    const boundaryWidth = width - rulerWidth;

    inboxCtx.clearRect(0, 0, boundaryWidth, height);

    this.drawFromCache(inboxCtx);

    const draggedShift = this.dragDropService.dragState.draggedShift;
    if (draggedShift) {
      const { range, boxWidth, marginLeftRight } =
        this.calculateShiftBoxParameters(boundaryWidth, height);

      inboxCtx.clearRect(0, 0, boundaryWidth, height);

      if (this.renderCanvas && this.renderCtx) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = DrawHelper.createHiDPICanvas(
          tempCanvas,
          boundaryWidth,
          height
        );
        DrawHelper.setAntiAliasing(tempCtx);

        DrawImageHelper.drawCanvasLogical(
          tempCtx,
          this.renderCanvas,
          0,
          0,
          boundaryWidth,
          height
        );

        const logicalDimensions = DrawImageHelper.getLogicalDimensions(
          this.renderCanvas
        );
        this.renderCtx.clearRect(
          0,
          0,
          logicalDimensions.width,
          logicalDimensions.height
        );
        this.renderCtx.fillStyle = this.gridColorService.backGroundColor;
        this.renderCtx.fillRect(
          0,
          0,
          logicalDimensions.width,
          logicalDimensions.height
        );
        this.drawRedBoundaryLines(this.renderCtx, boundaryWidth, height);

        this.shifts.forEach((shift) => {
          if (shift !== draggedShift) {
            this.drawSingleShiftBox(
              this.renderCtx!,
              shift,
              range,
              boxWidth,
              marginLeftRight,
              height,
              false
            );
          }
        });

        DrawImageHelper.drawCanvasLogical(
          inboxCtx,
          this.renderCanvas,
          0,
          0,
          boundaryWidth,
          height
        );

        const draggedRect = this.drawSingleShiftBox(
          inboxCtx,
          draggedShift,
          range,
          boxWidth,
          marginLeftRight,
          height,
          true
        );

        if (draggedRect) {
          this.shiftRectangles.set(draggedShift, draggedRect);
        }

        const renderLogicalDimensions = DrawImageHelper.getLogicalDimensions(
          this.renderCanvas
        );
        this.renderCtx.clearRect(
          0,
          0,
          renderLogicalDimensions.width,
          renderLogicalDimensions.height
        );
        DrawImageHelper.drawCanvasLogical(
          this.renderCtx,
          tempCanvas,
          0,
          0,
          boundaryWidth,
          height
        );
      }
    }
  }

  private parseTravelTimeToMinutes(travelTime: string): number {
    if (!travelTime) return 0;
    const parts = travelTime.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      return hours * 60 + minutes;
    }
    return 0;
  }
}

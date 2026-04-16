// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for drawing the time ruler and all shift boxes on the canvas.
 * @param timeRangeService - Calculation of time ranges and minute conversion
 * @param gridColorService - Colors for background, borders, text, and warnings
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { DrawHelper } from '../../../helpers/draw-helper';
import { DrawImageHelper } from '../../../helpers/draw-image-helper';
import { Gradient3DBorderStyleEnum } from '../../grid/enums/gradient-3d-border-style';
import {
  TextAlignmentEnum,
  BaselineAlignmentEnum,
} from '../../grid/enums/cell-settings.enum';
import { TimeRangeService } from './time-range.service';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { ShiftType } from 'src/app/domain/models/shift/shift-class';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { TimeRulerBlockSelectionService } from './time-ruler-block-selection.service';

export interface ShiftBoxDrawParams {
  ctx: CanvasRenderingContext2D;
  range: any;
  boxWidth: number;
  marginLeftRight: number;
  height: number;
}

/**
 * Scene-level inputs reused across every public render method.
 * Bundles the mutable scene state (shifts + rectangle map) and the time window.
 */
export interface IShiftSceneContext {
  shifts: IContainerTemplateItem[];
  shiftRectangles: Map<IContainerTemplateItem, Rectangle>;
  fromTime: OwnTime;
  untilTime: OwnTime;
}

@Injectable({
  providedIn: 'root',
})
export class TimeRulerRenderService {
  private timeRangeService = inject(TimeRangeService);
  private gridColorService = inject(GridColorService);

  readonly PADDING_MINUTES_DEFAULT = 30;
  private readonly PADDING_MINUTES_SHORT = 15;
  private readonly PADDING_MINUTES_VERY_SHORT = 10;
  private readonly DURATION_THRESHOLD_SHORT = 6 * 60;
  private readonly DURATION_THRESHOLD_VERY_SHORT = 3 * 60;
  readonly RULER_WIDTH = 70;

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

  private readonly SHIFT_BOX_MARGIN_LEFT_RIGHT = 15;
  private readonly SHIFT_BOX_BORDER_DEPTH = 4;
  private readonly SHIFT_BOX_SELECTION_OPACITY = 0.2;
  private readonly TRAVEL_TIME_BACKGROUND_COLOR = '#F5F5DC';
  private readonly BRIEFING_TIME_BACKGROUND_COLOR = 'rgb(149, 185, 208)';
  private readonly TASK_BACKGROUND_COLOR = '#cdcdd8';
  private readonly BLOCK_SELECTION_BORDER_WIDTH = 2;
  private readonly BLOCK_SELECTION_FILL_OPACITY = 0.15;

  private readonly MINUTES_PER_DAY = 24 * 60;

  calculatePaddingMinutes(fromTime: OwnTime, untilTime: OwnTime): number {
    const fromMinutes = this.timeRangeService.toMinutes(fromTime);
    let untilMinutes = this.timeRangeService.toMinutes(untilTime);

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

  drawTimeRuler(
    ctx: CanvasRenderingContext2D,
    height: number,
    fromTime: OwnTime,
    untilTime: OwnTime,
    paddingMinutesOverride?: number
  ): void {
    const paddingMinutes =
      paddingMinutesOverride !== undefined
        ? paddingMinutesOverride
        : this.calculatePaddingMinutes(fromTime, untilTime);
    const range = this.timeRangeService.calculateDisplayRange(
      fromTime,
      untilTime,
      paddingMinutes
    );

    if (range.totalMinutes <= 0) return;

    ctx.strokeStyle = this.gridColorService.mainFontColor;
    ctx.fillStyle = this.gridColorService.mainFontColor;
    ctx.lineWidth = this.TIME_MARK_LINE_WIDTH;
    ctx.font = this.TIME_MARK_FONT;
    ctx.textAlign = document.documentElement.dir === 'rtl' ? 'right' : 'left';
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
        const isRtl = document.documentElement.dir === 'rtl';
        const rulerW = this.RULER_WIDTH;
        ctx.beginPath();
        if (isRtl) {
          ctx.moveTo(rulerW, y);
          ctx.lineTo(rulerW - lineLength, y);
        } else {
          ctx.moveTo(0, y);
          ctx.lineTo(lineLength, y);
        }
        ctx.stroke();

        if (showLabel) {
          const timeLabel = this.timeRangeService.formatTime(minute);
          if (isRtl) {
            ctx.fillText(timeLabel, rulerW - lineLength - this.LABEL_OFFSET, y);
          } else {
            ctx.fillText(timeLabel, lineLength + this.LABEL_OFFSET, y);
          }
        }
      }
    }
  }

  drawBoundaryLine(
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

  convertColorToRgba(color: string, opacity: number): string {
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

  drawBoundaryLines(
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

  drawRedBoundaryLines(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    fromTime: OwnTime,
    untilTime: OwnTime
  ): void {
    const paddingMinutes = this.calculatePaddingMinutes(fromTime, untilTime);
    const range = this.timeRangeService.calculateDisplayRange(
      fromTime,
      untilTime,
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

  drawBlueBoundaryLines(
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

  calculateShiftBoxParameters(
    width: number,
    height: number,
    fromTime: OwnTime,
    untilTime: OwnTime
  ): { range: any; boxWidth: number; marginLeftRight: number } {
    const paddingMinutes = this.calculatePaddingMinutes(fromTime, untilTime);
    const range = this.timeRangeService.calculateDisplayRange(
      fromTime,
      untilTime,
      paddingMinutes
    );

    const marginLeftRight = this.SHIFT_BOX_MARGIN_LEFT_RIGHT;
    const boxWidth = width - 2 * marginLeftRight;

    return { range, boxWidth, marginLeftRight };
  }

  drawSingleShiftBox(
    ctx: CanvasRenderingContext2D,
    item: IContainerTemplateItem,
    range: any,
    boxWidth: number,
    marginLeftRight: number,
    height: number,
    isSelected: boolean,
    shifts: IContainerTemplateItem[],
    shiftRectangles: Map<IContainerTemplateItem, Rectangle>
  ): Rectangle | null {
    const hasTimeRange =
      item.shift?.isTimeRange &&
      item.timeRangeStartItem &&
      item.timeRangeEndItem;
    const hasFixedTime = item.startItem && item.endItem;

    if (!hasTimeRange && !hasFixedTime) {
      return null;
    }

    const bodyStartMinutes = this.timeRangeService.getShiftStartMinutes(item);
    const bodyEndMinutes = this.timeRangeService.getShiftEndMinutes(item);

    if (bodyStartMinutes === 0 && bodyEndMinutes === 0) {
      return null;
    }

    const startY =
      ((bodyStartMinutes - range.displayFromMinutes) / range.totalMinutes) *
      height;
    const endY =
      ((bodyEndMinutes - range.displayFromMinutes) / range.totalMinutes) *
      height;

    const briefingMinutes = this.parseTravelTimeToMinutes(item.briefingTime);
    const debriefingMinutes = this.parseTravelTimeToMinutes(item.debriefingTime);
    const travelBeforeMinutes = this.parseTravelTimeToMinutes(item.travelTimeBefore);
    const travelAfterMinutes = this.parseTravelTimeToMinutes(item.travelTimeAfter);

    const drawParams: ShiftBoxDrawParams = {
      ctx,
      range,
      boxWidth,
      marginLeftRight,
      height,
    };

    this.drawTravelBefore(
      drawParams, bodyStartMinutes, briefingMinutes, travelBeforeMinutes
    );
    this.drawBriefing(drawParams, bodyStartMinutes, briefingMinutes, startY);

    const rect = this.drawMainShiftBox(
      drawParams, item, bodyStartMinutes, bodyEndMinutes, startY, endY, isSelected,
      shifts, shiftRectangles
    );

    this.drawDebriefing(drawParams, bodyEndMinutes, debriefingMinutes, endY);
    this.drawTravelAfter(
      drawParams, bodyEndMinutes, debriefingMinutes, travelAfterMinutes
    );

    return rect;
  }

  drawTravelBefore(
    params: ShiftBoxDrawParams,
    bodyStartMinutes: number,
    briefingMinutes: number,
    travelBeforeMinutes: number
  ): void {
    if (travelBeforeMinutes <= 0) return;

    const briefingStartMinutes = bodyStartMinutes - briefingMinutes;
    const travelStartMinutes = briefingStartMinutes - travelBeforeMinutes;
    const travelStartY =
      ((travelStartMinutes - params.range.displayFromMinutes) / params.range.totalMinutes) *
      params.height;
    const travelEndY =
      ((briefingStartMinutes - params.range.displayFromMinutes) / params.range.totalMinutes) *
      params.height;

    const travelRect = new Rectangle(
      params.marginLeftRight,
      travelStartY,
      params.marginLeftRight + params.boxWidth,
      travelEndY
    );

    DrawHelper.fillRectangle(params.ctx, this.TRAVEL_TIME_BACKGROUND_COLOR, travelRect);
    DrawHelper.drawBaseBorder(params.ctx, this.gridColorService.borderColor, 1, travelRect);
  }

  drawBriefing(
    params: ShiftBoxDrawParams,
    bodyStartMinutes: number,
    briefingMinutes: number,
    startY: number
  ): void {
    if (briefingMinutes <= 0) return;

    const briefingStartMinutes = bodyStartMinutes - briefingMinutes;
    const briefingStartY =
      ((briefingStartMinutes - params.range.displayFromMinutes) / params.range.totalMinutes) *
      params.height;

    const briefingRect = new Rectangle(
      params.marginLeftRight,
      briefingStartY,
      params.marginLeftRight + params.boxWidth,
      startY
    );

    DrawHelper.fillRectangle(params.ctx, this.BRIEFING_TIME_BACKGROUND_COLOR, briefingRect);
    DrawHelper.drawBaseBorder(params.ctx, this.gridColorService.borderColor, 1, briefingRect);
  }

  drawMainShiftBox(
    params: ShiftBoxDrawParams,
    item: IContainerTemplateItem,
    bodyStartMinutes: number,
    bodyEndMinutes: number,
    startY: number,
    endY: number,
    isSelected: boolean,
    shifts: IContainerTemplateItem[],
    shiftRectangles: Map<IContainerTemplateItem, Rectangle>
  ): Rectangle {
    const rect = new Rectangle(
      params.marginLeftRight,
      startY,
      params.marginLeftRight + params.boxWidth,
      endY
    );

    if (!isSelected) {
      shiftRectangles.set(item, rect);
    }

    const hasOverlap = this.checkTaskOverlap(item, bodyStartMinutes, bodyEndMinutes, shifts);
    const isAbsence = !!item.absenceId;
    const isTask = item.shift?.shiftType === ShiftType.IsTask;
    let defaultColor: string;
    if (isAbsence && item.absence?.color) {
      defaultColor = item.absence.color;
    } else if (isTask) {
      defaultColor = this.TASK_BACKGROUND_COLOR;
    } else {
      defaultColor = this.gridColorService.controlBackGroundColor;
    }
    const backgroundColor = hasOverlap
      ? this.gridColorService.warningColor
      : defaultColor;

    DrawHelper.fillRectangle(params.ctx, backgroundColor, rect);

    if (isSelected) {
      params.ctx.save();
      params.ctx.globalAlpha = this.SHIFT_BOX_SELECTION_OPACITY;
      DrawHelper.fillRectangle(
        params.ctx,
        this.gridColorService.focusBorderColor,
        rect
      );
      params.ctx.restore();
    }

    DrawHelper.drawBorder(
      params.ctx,
      params.marginLeftRight,
      startY,
      params.boxWidth,
      endY,
      defaultColor,
      this.SHIFT_BOX_BORDER_DEPTH,
      Gradient3DBorderStyleEnum.Raised
    );

    if ((item.shift?.isTimeRange || item.shift?.isSporadic) && isSelected) {
      this.drawBlueBoundaryLines(
        params.ctx,
        item,
        params.range,
        params.boxWidth,
        params.marginLeftRight,
        params.height
      );
    }

    this.drawShiftLabel(params.ctx, item, rect);

    return rect;
  }

  drawShiftLabel(
    ctx: CanvasRenderingContext2D,
    item: IContainerTemplateItem,
    rect: Rectangle
  ): void {
    let abbreviation: string;
    let name: string;
    if (item.absenceId && item.absence) {
      const lang = 'de';
      abbreviation = item.absence.abbreviation?.[lang] || '';
      name = item.absence.name?.[lang] || '';
    } else {
      abbreviation = item.shift?.abbreviation || '';
      name = item.shift?.name || '';
    }
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
  }

  private drawSelectedShiftHighlight(
    ctx: CanvasRenderingContext2D,
    rect: Rectangle,
  ): void {
    const DARKEN_OPACITY = 0.12;
    const DASH_PATTERN = [4, 3];
    const BORDER_WIDTH = 1.5;

    ctx.fillStyle = `rgba(30, 144, 255, ${DARKEN_OPACITY})`;
    ctx.fillRect(rect.left, rect.top, rect.width, rect.height);

    ctx.save();
    ctx.setLineDash(DASH_PATTERN);
    ctx.strokeStyle = this.gridColorService.focusBorderColor;
    ctx.lineWidth = BORDER_WIDTH;
    ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
    ctx.restore();
  }

  drawBlockSelectionRect(
    ctx: CanvasRenderingContext2D,
    blockBounds: Rectangle | null
  ): void {
    if (!blockBounds) return;

    const fillColor = this.convertColorToRgba(
      this.gridColorService.focusBorderColor,
      this.BLOCK_SELECTION_FILL_OPACITY
    );

    ctx.fillStyle = fillColor;
    ctx.fillRect(blockBounds.left, blockBounds.top, blockBounds.width, blockBounds.height);

    ctx.strokeStyle = this.gridColorService.focusBorderColor;
    ctx.lineWidth = this.BLOCK_SELECTION_BORDER_WIDTH;
    ctx.strokeRect(blockBounds.left, blockBounds.top, blockBounds.width, blockBounds.height);
  }

  drawDebriefing(
    params: ShiftBoxDrawParams,
    bodyEndMinutes: number,
    debriefingMinutes: number,
    endY: number
  ): void {
    if (debriefingMinutes <= 0) return;

    const debriefingEndMinutes = bodyEndMinutes + debriefingMinutes;
    const debriefingEndY =
      ((debriefingEndMinutes - params.range.displayFromMinutes) / params.range.totalMinutes) *
      params.height;

    const debriefingRect = new Rectangle(
      params.marginLeftRight,
      endY,
      params.marginLeftRight + params.boxWidth,
      debriefingEndY
    );

    DrawHelper.fillRectangle(params.ctx, this.BRIEFING_TIME_BACKGROUND_COLOR, debriefingRect);
    DrawHelper.drawBaseBorder(params.ctx, this.gridColorService.borderColor, 1, debriefingRect);
  }

  drawTravelAfter(
    params: ShiftBoxDrawParams,
    bodyEndMinutes: number,
    debriefingMinutes: number,
    travelAfterMinutes: number
  ): void {
    if (travelAfterMinutes <= 0) return;

    const debriefingEndMinutes = bodyEndMinutes + debriefingMinutes;
    const travelEndMinutes = debriefingEndMinutes + travelAfterMinutes;
    const travelStartY =
      ((debriefingEndMinutes - params.range.displayFromMinutes) / params.range.totalMinutes) *
      params.height;
    const travelEndY =
      ((travelEndMinutes - params.range.displayFromMinutes) / params.range.totalMinutes) *
      params.height;

    const travelRect = new Rectangle(
      params.marginLeftRight,
      travelStartY,
      params.marginLeftRight + params.boxWidth,
      travelEndY
    );

    DrawHelper.fillRectangle(params.ctx, this.TRAVEL_TIME_BACKGROUND_COLOR, travelRect);
    DrawHelper.drawBaseBorder(params.ctx, this.gridColorService.borderColor, 1, travelRect);
  }

  renderShiftsToCache(
    renderCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scene: IShiftSceneContext,
  ): void {
    if (!scene.shifts || scene.shifts.length === 0) return;

    scene.shiftRectangles.clear();

    renderCtx.fillStyle = this.gridColorService.backGroundColor;
    renderCtx.fillRect(0, 0, width, height);

    this.drawRedBoundaryLines(renderCtx, width, height, scene.fromTime, scene.untilTime);

    const { range, boxWidth, marginLeftRight } =
      this.calculateShiftBoxParameters(width, height, scene.fromTime, scene.untilTime);

    scene.shifts.forEach((shift) => {
      this.drawSingleShiftBox(
        renderCtx,
        shift,
        range,
        boxWidth,
        marginLeftRight,
        height,
        false,
        scene.shifts,
        scene.shiftRectangles,
      );
    });
  }

  get contentOffsetX(): number {
    return document.documentElement.dir === 'rtl' ? this.RULER_WIDTH : 0;
  }

  drawFromCache(
    ctx: CanvasRenderingContext2D,
    renderCanvas: HTMLCanvasElement,
    inboxCanvas: HTMLCanvasElement
  ): void {
    const container = inboxCanvas.parentElement;
    if (!container) return;

    const rulerWidth = this.RULER_WIDTH;
    const boundaryWidth = container.clientWidth - rulerWidth;
    const height = container.clientHeight;

    DrawImageHelper.drawCanvasLogical(
      ctx,
      renderCanvas,
      this.contentOffsetX,
      0,
      boundaryWidth,
      height
    );
  }

  redrawWithSelection(
    inboxCanvas: HTMLCanvasElement,
    renderCanvas: HTMLCanvasElement,
    selectedShift: IContainerTemplateItem | null,
    scene: IShiftSceneContext,
    blockSelectionService?: TimeRulerBlockSelectionService,
  ): void {
    const container = inboxCanvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const inboxCtx = inboxCanvas.getContext('2d');
    if (!inboxCtx) return;

    const rulerWidth = this.RULER_WIDTH;
    const boundaryWidth = width - rulerWidth;

    const offsetX = this.contentOffsetX;
    inboxCtx.clearRect(offsetX, 0, boundaryWidth, height);
    this.drawFromCache(inboxCtx, renderCanvas, inboxCanvas);

    if (selectedShift) {
      const { range, boxWidth, marginLeftRight } =
        this.calculateShiftBoxParameters(boundaryWidth, height, scene.fromTime, scene.untilTime);

      inboxCtx.save();
      inboxCtx.translate(offsetX, 0);
      const selectedRect = this.drawSingleShiftBox(
        inboxCtx,
        selectedShift,
        range,
        boxWidth,
        marginLeftRight,
        height,
        true,
        scene.shifts,
        scene.shiftRectangles,
      );
      inboxCtx.restore();

      if (selectedRect) {
        scene.shiftRectangles.set(selectedShift, selectedRect);
        if (!blockSelectionService?.hasBlock()) {
          this.drawSelectedShiftHighlight(inboxCtx, selectedRect);
        }
      }
    }

    if (blockSelectionService && blockSelectionService.hasBlock()) {
      const { range: blockRange, boxWidth: blockBoxWidth, marginLeftRight: blockMargin } =
        this.calculateShiftBoxParameters(boundaryWidth, height, scene.fromTime, scene.untilTime);

      inboxCtx.save();
      inboxCtx.translate(offsetX, 0);

      for (const item of blockSelectionService.selectedItems()) {
        if (item === selectedShift) continue;
        const itemRect = this.drawSingleShiftBox(
          inboxCtx, item, blockRange, blockBoxWidth, blockMargin,
          height, true, scene.shifts, scene.shiftRectangles,
        );
        if (itemRect) {
          scene.shiftRectangles.set(item, itemRect);
        }
      }

      this.drawBlockSelectionRect(
        inboxCtx,
        blockSelectionService.calculateBlockBounds(blockMargin, blockBoxWidth, blockRange, height),
      );
      inboxCtx.restore();
    }
  }

  redrawCanvas(
    inboxCanvas: HTMLCanvasElement,
    renderCanvas: HTMLCanvasElement,
    renderCtx: CanvasRenderingContext2D,
    draggedShift: IContainerTemplateItem,
    scene: IShiftSceneContext,
  ): void {
    const container = inboxCanvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const inboxCtx = inboxCanvas.getContext('2d');
    if (!inboxCtx) return;

    const rulerWidth = this.RULER_WIDTH;
    const boundaryWidth = width - rulerWidth;

    const offsetX = this.contentOffsetX;
    inboxCtx.clearRect(offsetX, 0, boundaryWidth, height);

    this.drawFromCache(inboxCtx, renderCanvas, inboxCanvas);

    const { range, boxWidth, marginLeftRight } =
      this.calculateShiftBoxParameters(boundaryWidth, height, scene.fromTime, scene.untilTime);

    inboxCtx.clearRect(offsetX, 0, boundaryWidth, height);

    const tempCanvas = document.createElement('canvas');
    const tempCtx = DrawHelper.createHiDPICanvas(
      tempCanvas,
      boundaryWidth,
      height,
    );
    DrawHelper.setAntiAliasing(tempCtx);

    DrawImageHelper.drawCanvasLogical(
      tempCtx,
      renderCanvas,
      0,
      0,
      boundaryWidth,
      height,
    );

    const logicalDimensions = DrawImageHelper.getLogicalDimensions(renderCanvas);
    renderCtx.clearRect(
      0,
      0,
      logicalDimensions.width,
      logicalDimensions.height,
    );
    renderCtx.fillStyle = this.gridColorService.backGroundColor;
    renderCtx.fillRect(
      0,
      0,
      logicalDimensions.width,
      logicalDimensions.height,
    );
    this.drawRedBoundaryLines(renderCtx, boundaryWidth, height, scene.fromTime, scene.untilTime);

    scene.shifts.forEach((shift) => {
      if (shift !== draggedShift) {
        this.drawSingleShiftBox(
          renderCtx,
          shift,
          range,
          boxWidth,
          marginLeftRight,
          height,
          false,
          scene.shifts,
          scene.shiftRectangles,
        );
      }
    });

    DrawImageHelper.drawCanvasLogical(
      inboxCtx,
      renderCanvas,
      offsetX,
      0,
      boundaryWidth,
      height,
    );

    inboxCtx.save();
    inboxCtx.translate(offsetX, 0);
    const draggedRect = this.drawSingleShiftBox(
      inboxCtx,
      draggedShift,
      range,
      boxWidth,
      marginLeftRight,
      height,
      true,
      scene.shifts,
      scene.shiftRectangles,
    );
    inboxCtx.restore();

    if (draggedRect) {
      scene.shiftRectangles.set(draggedShift, draggedRect);
    }

    const renderLogicalDimensions = DrawImageHelper.getLogicalDimensions(renderCanvas);
    renderCtx.clearRect(
      0,
      0,
      renderLogicalDimensions.width,
      renderLogicalDimensions.height
    );
    DrawImageHelper.drawCanvasLogical(
      renderCtx,
      tempCanvas,
      0,
      0,
      boundaryWidth,
      height
    );
  }

  checkTaskOverlap(
    currentItem: IContainerTemplateItem,
    startMinutes: number,
    endMinutes: number,
    shifts: IContainerTemplateItem[]
  ): boolean {
    if (!currentItem.shift?.isTimeRange && !currentItem.absenceId) {
      return false;
    }

    const otherItems = shifts.filter(
      (item) => item !== currentItem && (item.shift?.isTimeRange || !!item.absenceId)
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

  timesOverlap(
    start1: number,
    end1: number,
    start2: number,
    end2: number
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  parseTravelTimeToMinutes(travelTime: string): number {
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

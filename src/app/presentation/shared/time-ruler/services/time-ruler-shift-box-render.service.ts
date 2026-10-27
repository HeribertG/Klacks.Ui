// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Service for drawing a single shift box of the time ruler: travel, briefing, body, debriefing and label.
 * @param timeRangeService - Display range, padding and shift start/end minutes
 * @param translateService - Current language for localized absence labels
 * @param gridColorService - Background, border, warning, focus and font colors
 * @param boundaryRenderService - Draws the shift window of a selected time range
 */

import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { Rectangle } from 'src/app/domain/models/geometry/rectangle.model';
import { ShiftType } from 'src/app/domain/models/shift/shift-type.enum';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { DrawHelper } from '../../../helpers/draw-helper';
import { Gradient3DBorderStyleEnum } from '../../grid/enums/gradient-3d-border-style';
import {
  TextAlignmentEnum,
  BaselineAlignmentEnum,
} from '../../grid/enums/cell-settings.enum';
import { DisplayRange } from './display-range.interface';
import { ShiftBoxDrawParams } from './shift-box-draw-params.interface';
import { TimeRangeService } from './time-range.service';
import { TimeRulerBoundaryRenderService } from './time-ruler-boundary-render.service';

@Injectable({
  providedIn: 'root',
})
export class TimeRulerShiftBoxRenderService {
  private timeRangeService = inject(TimeRangeService);
  private translateService = inject(TranslateService);
  private gridColorService = inject(GridColorService);
  private boundaryRenderService = inject(TimeRulerBoundaryRenderService);

  private readonly SHIFT_TEXT_FONT_SIZE = 12;
  private readonly SHIFT_TEXT_FONT = '12px Arial';

  private readonly SHIFT_BOX_MARGIN_LEFT_RIGHT = 15;
  private readonly SHIFT_BOX_BORDER_DEPTH = 4;
  private readonly SHIFT_BOX_SELECTION_OPACITY = 0.2;
  private readonly TRAVEL_TIME_BACKGROUND_COLOR = '#F5F5DC';
  private readonly BRIEFING_TIME_BACKGROUND_COLOR = 'rgb(149, 185, 208)';
  private readonly TASK_BACKGROUND_COLOR = '#cdcdd8';

  calculateShiftBoxParameters(
    width: number,
    height: number,
    fromTime: OwnTime,
    untilTime: OwnTime
  ): { range: DisplayRange; boxWidth: number; marginLeftRight: number } {
    const paddingMinutes = this.timeRangeService.calculatePaddingMinutes(fromTime, untilTime);
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
    range: DisplayRange,
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

    if (!this.timeRangeService.hasExplicitTimes(item)) {
      return null;
    }

    const bodyStartMinutes = this.timeRangeService.getShiftStartMinutes(item);
    const bodyEndMinutes = this.timeRangeService.getShiftEndMinutes(item);

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
      this.boundaryRenderService.drawBlueBoundaryLines(
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
      const lang = this.translateService.currentLang || DomainMessages.DEFAULT_LANG;
      abbreviation = getLocalizedValue(item.absence.abbreviation, lang);
      name = getLocalizedValue(item.absence.name, lang);
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

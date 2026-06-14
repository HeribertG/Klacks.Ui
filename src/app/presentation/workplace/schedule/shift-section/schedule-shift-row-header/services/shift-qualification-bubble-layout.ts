// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Placement of the required-qualification icon bubbles in the shift row header.
 * Delegates the shared sizing/overflow logic to computeQualificationBubbleSizing and only
 * adds this row header's positioning: the bubbles are anchored at the text end of the cell
 * and vertically centered, overlapping the shift name when space is tight.
 * @param qualifications - The shift's required qualifications (only those with an emoji are drawn)
 * @param cellWidth - Full row-header cell width in logical pixels
 * @param cellHeight - Single shift-row height in logical pixels
 * @param zoom - Current grid zoom factor
 * @param isRtl - Whether the layout is right-to-left (anchors at the left instead of the right)
 * @param iconReserve - Reserved width on the leading icon side bubbles must not cover
 * @param anchorReserve - Reserved width on the text-end side (e.g. the sporadic scope bubble)
 */
import { IScheduleQualification } from 'src/app/domain/models/schedule/work-schedule-class';
import { QualificationBubble } from '../../../shared/qualification-bubbles/qualification-bubble.model';
import { computeQualificationBubbleSizing } from '../../../shared/qualification-bubbles/qualification-bubble-sizing';

const BASE_MARGIN = 4;
const BASE_ICON_WIDTH = 24;
const BASE_SPORADIC_BUBBLE_RADIUS = 10;

export interface ShiftQualificationBubbleLayoutInput {
  qualifications: IScheduleQualification[];
  cellWidth: number;
  cellHeight: number;
  zoom: number;
  isRtl: boolean;
  iconReserve: number;
  anchorReserve: number;
}

export interface ShiftQualificationBubbleLayout {
  bubbles: QualificationBubble[];
  diameter: number;
  emojiFontSize: number;
}

/**
 * Reserved widths (in logical pixels) on the leading icon side and the trailing
 * text-end side, so the bubbles never cover the shift type icon or the sporadic
 * scope bubble. Keeps the renderer and the tooltip hit-testing geometry identical.
 */
export function computeShiftBubbleReserves(
  zoom: number,
  isSporadic: boolean,
): { iconReserve: number; anchorReserve: number } {
  const margin = BASE_MARGIN * zoom;
  const iconReserve = margin + BASE_ICON_WIDTH * zoom + margin;
  const anchorReserve = isSporadic
    ? margin + BASE_SPORADIC_BUBBLE_RADIUS * zoom * 2 + margin
    : margin;
  return { iconReserve, anchorReserve };
}

export function computeShiftQualificationBubbleLayout(
  input: ShiftQualificationBubbleLayoutInput,
): ShiftQualificationBubbleLayout {
  const available = input.cellWidth - input.iconReserve - input.anchorReserve;

  const sizing = computeQualificationBubbleSizing(
    input.qualifications,
    available,
    input.cellHeight,
    input.zoom,
  );
  if (sizing.slots.length === 0) {
    return { bubbles: [], diameter: sizing.diameter, emojiFontSize: sizing.emojiFontSize };
  }

  const d = sizing.diameter;
  const cy = input.cellHeight / 2;
  const anchorCenter = input.isRtl
    ? input.anchorReserve + d / 2
    : input.cellWidth - input.anchorReserve - d / 2;
  const bubbles: QualificationBubble[] = sizing.slots.map((slot, i) => ({
    ...slot,
    d,
    cy,
    cx: input.isRtl ? anchorCenter + i * sizing.step : anchorCenter - i * sizing.step,
  }));

  return { bubbles, diameter: d, emojiFontSize: sizing.emojiFontSize };
}

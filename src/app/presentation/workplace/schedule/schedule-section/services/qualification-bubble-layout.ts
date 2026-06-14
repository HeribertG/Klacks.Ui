// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Placement of the qualification icon bubbles in the employee (schedule) row header.
 * Delegates the shared sizing/overflow logic to computeQualificationBubbleSizing and only
 * adds this row header's positioning: the bubbles sit at the bottom of the cell and start
 * after the drag-grip, growing toward the right-hand info-spot column.
 * @param qualifications - The client's qualifications (only those with an emoji are drawn)
 * @param cellWidth - Full row-header cell width in logical pixels
 * @param cellHeight - Full client group line height in logical pixels
 * @param zoom - Current grid zoom factor
 * @param isRtl - Whether the layout is right-to-left
 * @param infoSpotWidth - Width of the right-hand info-spot column (period hours)
 * @param iconWidth - Row header icon width, used to reserve the drag-grip area
 */
import { IScheduleQualification } from 'src/app/domain/models/schedule/work-schedule-class';
import { QualificationBubble } from '../../shared/qualification-bubbles/qualification-bubble.model';
import { computeQualificationBubbleSizing } from '../../shared/qualification-bubbles/qualification-bubble-sizing';

export { QualificationBubble } from '../../shared/qualification-bubbles/qualification-bubble.model';

export interface QualificationBubbleLayoutInput {
  qualifications: IScheduleQualification[];
  cellWidth: number;
  cellHeight: number;
  zoom: number;
  isRtl: boolean;
  infoSpotWidth: number;
  iconWidth: number;
}

export interface QualificationBubbleLayout {
  bubbles: QualificationBubble[];
  diameter: number;
  emojiFontSize: number;
}

export function computeQualificationBubbleLayout(
  input: QualificationBubbleLayoutInput,
): QualificationBubbleLayout {
  const margin = 4 * input.zoom;
  const gripAreaWidth = margin + Math.round(input.iconWidth * 0.4);
  const textAreaWidth = input.cellWidth - input.infoSpotWidth;
  const available = textAreaWidth - gripAreaWidth - margin * 2;

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
  const cy = input.cellHeight - margin - d / 2;
  const bubbles: QualificationBubble[] = sizing.slots.map((slot, i) => ({
    ...slot,
    d,
    cy,
    cx: input.isRtl
      ? input.cellWidth - margin - d / 2 - i * sizing.step
      : gripAreaWidth + margin + d / 2 + i * sizing.step,
  }));

  return { bubbles, diameter: d, emojiFontSize: sizing.emojiFontSize };
}

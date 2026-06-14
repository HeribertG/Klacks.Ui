// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Pure geometry for the qualification icon bubbles in the schedule row header.
 * Shared by the renderer (drawing) and the tooltip service (hit-testing) so both
 * place the overlapping emoji circles at exactly the same cell-local coordinates.
 * @param qualifications - The client's qualifications (only those with an emoji are drawn)
 * @param cellWidth - Full row-header cell width in logical pixels
 * @param cellHeight - Full client group line height in logical pixels
 * @param zoom - Current grid zoom factor
 * @param isRtl - Whether the layout is right-to-left
 * @param infoSpotWidth - Width of the right-hand info-spot column (period hours)
 * @param iconWidth - Row header icon width, used to reserve the drag-grip area
 */
import { IScheduleQualification } from 'src/app/domain/models/schedule/work-schedule-class';

const BASE_DIAMETER = 16;
const OVERLAP_RATIO = 0.66;
const EMOJI_RATIO = 0.7;
const MIN_DIAMETER = 6;
const SMALL_ZOOM_THRESHOLD = 0.8;
const SMALL_ZOOM_MAX_SLOTS = 3;
const LARGE_ZOOM_MAX_SLOTS = 6;

export interface QualificationBubble {
  cx: number;
  cy: number;
  d: number;
  emoji: string;
  overflowCount: number;
  qualification: IScheduleQualification | null;
}

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
  const visible = input.qualifications.filter(
    (q) => !!q.emoji && q.emoji.trim() !== '',
  );
  if (visible.length === 0) {
    return { bubbles: [], diameter: 0, emojiFontSize: 0 };
  }

  const margin = 4 * input.zoom;
  const gripAreaWidth = margin + Math.round(input.iconWidth * 0.4);

  let d = Math.round(BASE_DIAMETER * input.zoom);
  const maxByHeight = Math.round(input.cellHeight / 2 - margin);
  if (maxByHeight > MIN_DIAMETER && d > maxByHeight) {
    d = maxByHeight;
  }
  if (d < MIN_DIAMETER) {
    d = MIN_DIAMETER;
  }
  const step = Math.max(4, Math.round(d * OVERLAP_RATIO));

  const textAreaWidth = input.cellWidth - input.infoSpotWidth;
  const available = textAreaWidth - gripAreaWidth - margin * 2;
  if (available < d) {
    return { bubbles: [], diameter: d, emojiFontSize: 0 };
  }

  let fit = Math.floor((available - d) / step) + 1;
  if (fit < 1) {
    fit = 1;
  }
  const hardCap =
    input.zoom < SMALL_ZOOM_THRESHOLD ? SMALL_ZOOM_MAX_SLOTS : LARGE_ZOOM_MAX_SLOTS;
  fit = Math.min(fit, hardCap);

  const total = visible.length;
  const hasOverflow = total > fit;
  const visibleCount = hasOverflow ? fit - 1 : total;
  const overflowCount = hasOverflow ? total - visibleCount : 0;
  const slots = visibleCount + (hasOverflow ? 1 : 0);

  const cy = input.cellHeight - margin - d / 2;
  const bubbles: QualificationBubble[] = [];

  for (let i = 0; i < slots; i++) {
    const isOverflowSlot = hasOverflow && i === slots - 1;
    const cx = input.isRtl
      ? input.cellWidth - margin - d / 2 - i * step
      : gripAreaWidth + margin + d / 2 + i * step;

    bubbles.push({
      cx,
      cy,
      d,
      emoji: isOverflowSlot ? '' : visible[i].emoji ?? '',
      overflowCount: isOverflowSlot ? overflowCount : 0,
      qualification: isOverflowSlot ? null : visible[i],
    });
  }

  return {
    bubbles,
    diameter: d,
    emojiFontSize: Math.round(d * EMOJI_RATIO),
  };
}

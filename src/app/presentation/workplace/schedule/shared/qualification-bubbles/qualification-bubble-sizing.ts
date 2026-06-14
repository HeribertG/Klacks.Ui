// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Pure, placement-agnostic sizing for qualification bubbles. Computes the diameter, the
 * overlap step, the emoji font size and the per-slot assignment (which qualification each
 * slot shows, and whether the last slot collapses the remainder into a "+N" overflow).
 * The two row headers add only their own cx/cy positioning on top of this shared core.
 * @param qualifications - Candidate qualifications (only those with an emoji are counted)
 * @param availableWidth - Horizontal space the bubble stack may occupy, in logical pixels
 * @param cellHeight - Full cell height in logical pixels (bounds the diameter)
 * @param zoom - Current grid zoom factor
 */
import { IScheduleQualification } from 'src/app/domain/models/schedule/work-schedule-class';
import {
  QUALIFICATION_BUBBLE_BASE_DIAMETER,
  QUALIFICATION_BUBBLE_EMOJI_RATIO,
  QUALIFICATION_BUBBLE_MIN_DIAMETER,
  QUALIFICATION_BUBBLE_OVERLAP_RATIO,
  QualificationBubbleSlot,
  maxQualificationBubbleSlots,
} from './qualification-bubble.model';

export interface QualificationBubbleSizing {
  diameter: number;
  step: number;
  emojiFontSize: number;
  slots: QualificationBubbleSlot[];
}

export function computeQualificationBubbleSizing(
  qualifications: IScheduleQualification[],
  availableWidth: number,
  cellHeight: number,
  zoom: number,
): QualificationBubbleSizing {
  const visible = qualifications.filter(
    (q) => !!q.emoji && q.emoji.trim() !== '',
  );
  if (visible.length === 0) {
    return { diameter: 0, step: 0, emojiFontSize: 0, slots: [] };
  }

  const margin = 4 * zoom;

  let d = Math.round(QUALIFICATION_BUBBLE_BASE_DIAMETER * zoom);
  const maxByHeight = Math.round(cellHeight / 2 - margin);
  if (maxByHeight > QUALIFICATION_BUBBLE_MIN_DIAMETER && d > maxByHeight) {
    d = maxByHeight;
  }
  if (d < QUALIFICATION_BUBBLE_MIN_DIAMETER) {
    d = QUALIFICATION_BUBBLE_MIN_DIAMETER;
  }
  const step = Math.max(4, Math.round(d * QUALIFICATION_BUBBLE_OVERLAP_RATIO));

  if (availableWidth < d) {
    return { diameter: d, step, emojiFontSize: 0, slots: [] };
  }

  let fit = Math.floor((availableWidth - d) / step) + 1;
  if (fit < 1) {
    fit = 1;
  }
  fit = Math.min(fit, maxQualificationBubbleSlots(zoom));

  const total = visible.length;
  const hasOverflow = total > fit;
  const visibleCount = hasOverflow ? fit - 1 : total;
  const overflowCount = hasOverflow ? total - visibleCount : 0;
  const slotCount = visibleCount + (hasOverflow ? 1 : 0);

  const slots: QualificationBubbleSlot[] = [];
  for (let i = 0; i < slotCount; i++) {
    const isOverflowSlot = hasOverflow && i === slotCount - 1;
    slots.push({
      emoji: isOverflowSlot ? '' : visible[i].emoji ?? '',
      overflowCount: isOverflowSlot ? overflowCount : 0,
      qualification: isOverflowSlot ? null : visible[i],
    });
  }

  return {
    diameter: d,
    step,
    emojiFontSize: Math.round(d * QUALIFICATION_BUBBLE_EMOJI_RATIO),
    slots,
  };
}

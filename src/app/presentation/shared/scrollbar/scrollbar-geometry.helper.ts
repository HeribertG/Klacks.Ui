// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure thumb geometry of the canvas scrollbar: drawn position on the main and cross axis, the mirrored (RTL)
 * mapping between scroll value and thumb start, and the tick-based hit test.
 * @param track - Canvas main-axis size, thumb size and the scroll range (maxValue, visibleValue) in ticks
 * @param value - Scroll position in ticks
 * @param rtl - True for a horizontal scrollbar in a right-to-left document (value 0 sits at the right end)
 */
import { maxScrollValue } from './scroll-range.helper';
import { ThumbTrack } from './thumb-track.interface';

const CROSS_AXIS_POSITION_OFFSET = 1;

export function thumbMainAxisPosition(track: ThumbTrack, value: number, rtl: boolean): number {
  const safeValue = value ?? 0;
  const safeTrackSize = track.thumbSize ?? 0;

  const maxScroll = maxScrollValue(track.maxValue ?? 0, track.visibleValue ?? 0);
  const availableSpace = track.canvasMainSize - safeTrackSize;

  if (availableSpace <= 0 || !isFinite(availableSpace)) {
    return 0;
  }

  if (maxScroll <= 0 || !isFinite(maxScroll)) {
    return rtl ? Math.round(availableSpace) : 0;
  }

  if (safeValue >= maxScroll) {
    return rtl ? 0 : Math.round(availableSpace);
  }

  const proportion = Math.max(0, Math.min(1, safeValue / maxScroll));
  const position = Math.round(proportion * availableSpace);
  return rtl ? Math.round(availableSpace) - position : position;
}

export function thumbCrossAxisPosition(canvasCrossSize: number, thumbCrossSize: number): number {
  if (canvasCrossSize === 0 || thumbCrossSize === 0) {
    return 0;
  }

  let result = (canvasCrossSize - thumbCrossSize) / 2 + CROSS_AXIS_POSITION_OFFSET;
  if (result < 0) result = 0;
  return Math.round(result);
}

export function mirroredThumbStart(track: ThumbTrack, value: number): number {
  const availableSpace = track.canvasMainSize - track.thumbSize;
  const maxScroll = maxScrollValue(track.maxValue, track.visibleValue);
  if (maxScroll <= 0) return 0;
  const proportion = Math.max(0, Math.min(1, value / maxScroll));
  return availableSpace - Math.round(proportion * availableSpace);
}

export function mirroredValueForThumbStart(track: ThumbTrack, pos: number): number | null {
  const availableSpace = track.canvasMainSize - track.thumbSize;
  const maxScroll = maxScrollValue(track.maxValue ?? 0, track.visibleValue ?? 0);
  if (availableSpace > 0 && maxScroll > 0) {
    const proportion = (availableSpace - pos) / availableSpace;
    return Math.round(proportion * maxScroll);
  }
  return null;
}

export function isPositionOnThumb(
  pos: number,
  tickSize: number,
  value: number,
  thumbSize: number | undefined
): boolean {
  if (tickSize <= 0) {
    return false;
  }

  const correctedPos = Math.round(pos / tickSize);

  if (thumbSize !== undefined) {
    const thumbTicks = Math.round(thumbSize / tickSize);
    if (correctedPos >= value && correctedPos <= value + thumbTicks) {
      return true;
    }
  }

  return false;
}

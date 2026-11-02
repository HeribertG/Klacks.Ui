// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Geometry, drawing and hit-testing of the small corner marker the shift row header shows for a shift that belongs to a
 * variant (key). The marker is a filled triangle in the top corner at the leading edge of the row (left, or right in a
 * right-to-left layout), so it never covers the qualification bubbles and the sporadic scope bubble at the text end.
 * The renderer and the tooltip use the same bounds so the hover area matches what is drawn.
 * @param left - Left edge of the marker's square in logical pixels
 * @param top - Top edge of the marker's square in logical pixels
 * @param size - Side of the marker's square in logical pixels
 */

const BASE_MARKER_SIZE = 8;

export interface ShiftVariantMarkerBounds {
  left: number;
  top: number;
  size: number;
}

export function computeShiftVariantMarkerBounds(
  cellLeft: number,
  cellTop: number,
  cellWidth: number,
  zoom: number,
  isRtl: boolean,
): ShiftVariantMarkerBounds {
  const size = BASE_MARKER_SIZE * zoom;
  return {
    left: isRtl ? cellLeft + cellWidth - size : cellLeft,
    top: cellTop,
    size,
  };
}

export function isInsideShiftVariantMarker(
  bounds: ShiftVariantMarkerBounds,
  x: number,
  y: number,
  isRtl = false,
): boolean {
  const distanceFromEdge = isRtl ? bounds.left + bounds.size - x : x - bounds.left;
  const distanceFromTop = y - bounds.top;
  return distanceFromEdge >= 0 && distanceFromTop >= 0 && distanceFromEdge + distanceFromTop <= bounds.size;
}

export function drawShiftVariantMarker(
  ctx: CanvasRenderingContext2D,
  bounds: ShiftVariantMarkerBounds,
  isRtl: boolean,
  color: string,
): void {
  const right = bounds.left + bounds.size;
  const bottom = bounds.top + bounds.size;

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  if (isRtl) {
    ctx.moveTo(right, bounds.top);
    ctx.lineTo(bounds.left, bounds.top);
    ctx.lineTo(right, bottom);
  } else {
    ctx.moveTo(bounds.left, bounds.top);
    ctx.lineTo(right, bounds.top);
    ctx.lineTo(bounds.left, bottom);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Shared canvas renderer for qualification bubbles. Draws each positioned bubble as an
 * overlapping circle (bordered, clipped) with its emoji, the ISO letters for flag emojis,
 * or a "+N" overflow count. Bubbles are painted last-to-first so the first qualification
 * stays on top. Used by both the employee and the shift row header.
 * @param ctx - Target 2D canvas context
 * @param bubbles - Positioned bubbles in cell-local coordinates
 * @param options - Diameter, fonts, colours, zoom and optional canvas origin offset
 */
import { resolveQualificationGlyph } from 'src/app/domain/helpers/qualification-glyph.helper';
import { QualificationBubble } from './qualification-bubble.model';

const FLAG_FONT_RATIO = 0.42;
const OVERFLOW_FONT_RATIO = 0.5;

export interface QualificationBubbleRenderOptions {
  diameter: number;
  emojiFontSize: number;
  fillColor: string;
  borderColor: string;
  zoom: number;
  originX?: number;
  originY?: number;
}

export function drawQualificationBubbles(
  ctx: CanvasRenderingContext2D,
  bubbles: QualificationBubble[],
  options: QualificationBubbleRenderOptions,
): void {
  if (bubbles.length === 0) {
    return;
  }

  const radius = options.diameter / 2;
  const borderWidth = Math.max(1, Math.round(options.zoom));
  const overflowFontSize = Math.round(options.diameter * OVERFLOW_FONT_RATIO);
  const flagFontSize = Math.round(options.diameter * FLAG_FONT_RATIO);
  const originX = options.originX ?? 0;
  const originY = options.originY ?? 0;

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const bubble = bubbles[i];
    const cx = originX + bubble.cx;
    const cy = originY + bubble.cy;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = options.fillColor;
    ctx.fill();
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = options.borderColor;
    ctx.stroke();
    ctx.clip();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (bubble.overflowCount > 0) {
      ctx.fillStyle = options.borderColor;
      ctx.font = `bold ${overflowFontSize}px Arial`;
      ctx.fillText(`+${bubble.overflowCount}`, cx, cy + 0.5);
    } else {
      const glyph = resolveQualificationGlyph(bubble.emoji);
      if (glyph.isFlag) {
        ctx.fillStyle = options.borderColor;
        ctx.font = `bold ${flagFontSize}px Arial`;
      } else {
        ctx.font = `${options.emojiFontSize}px Arial`;
      }
      ctx.fillText(glyph.text, cx, cy + 0.5);
    }
    ctx.restore();
  }
}

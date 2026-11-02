// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, vi } from 'vitest';
import {
  computeShiftVariantMarkerBounds,
  drawShiftVariantMarker,
  isInsideShiftVariantMarker,
} from './shift-variant-marker';

const CELL_LEFT = 0;
const CELL_TOP = 30;
const CELL_WIDTH = 200;

describe('computeShiftVariantMarkerBounds', () => {
  it('sits in the top corner at the leading edge of the cell', () => {
    const bounds = computeShiftVariantMarkerBounds(CELL_LEFT, CELL_TOP, CELL_WIDTH, 1, false);

    expect(bounds.left).toBe(CELL_LEFT);
    expect(bounds.top).toBe(CELL_TOP);
    expect(bounds.size).toBeGreaterThan(0);
  });

  it('moves to the right edge in a right-to-left layout', () => {
    const bounds = computeShiftVariantMarkerBounds(CELL_LEFT, CELL_TOP, CELL_WIDTH, 1, true);

    expect(bounds.left + bounds.size).toBe(CELL_LEFT + CELL_WIDTH);
    expect(bounds.top).toBe(CELL_TOP);
  });

  it('grows with the zoom', () => {
    const normal = computeShiftVariantMarkerBounds(CELL_LEFT, CELL_TOP, CELL_WIDTH, 1, false);
    const zoomed = computeShiftVariantMarkerBounds(CELL_LEFT, CELL_TOP, CELL_WIDTH, 2, false);

    expect(zoomed.size).toBe(normal.size * 2);
  });
});

describe('isInsideShiftVariantMarker', () => {
  const bounds = computeShiftVariantMarkerBounds(CELL_LEFT, CELL_TOP, CELL_WIDTH, 1, false);

  it('hits the point next to the corner', () => {
    expect(isInsideShiftVariantMarker(bounds, bounds.left + 1, bounds.top + 1)).toBe(true);
  });

  it('misses the empty half of the square beyond the diagonal', () => {
    expect(isInsideShiftVariantMarker(bounds, bounds.left + bounds.size - 1, bounds.top + bounds.size - 1)).toBe(false);
  });

  it('misses points outside the square', () => {
    expect(isInsideShiftVariantMarker(bounds, bounds.left + bounds.size + 1, bounds.top + 1)).toBe(false);
    expect(isInsideShiftVariantMarker(bounds, bounds.left + 1, bounds.top + bounds.size + 1)).toBe(false);
    expect(isInsideShiftVariantMarker(bounds, bounds.left - 1, bounds.top + 1)).toBe(false);
  });

  it('mirrors the hit area in a right-to-left layout', () => {
    const rtl = computeShiftVariantMarkerBounds(CELL_LEFT, CELL_TOP, CELL_WIDTH, 1, true);

    expect(isInsideShiftVariantMarker(rtl, rtl.left + rtl.size - 1, rtl.top + 1, true)).toBe(true);
    expect(isInsideShiftVariantMarker(rtl, rtl.left + 1, rtl.top + rtl.size - 1, true)).toBe(false);
  });
});

describe('drawShiftVariantMarker', () => {
  const createContext = () => {
    const calls: string[] = [];
    const ctx = {
      fillStyle: '',
      save: vi.fn(() => calls.push('save')),
      restore: vi.fn(() => calls.push('restore')),
      beginPath: vi.fn(() => calls.push('beginPath')),
      moveTo: vi.fn((x: number, y: number) => calls.push(`moveTo ${x},${y}`)),
      lineTo: vi.fn((x: number, y: number) => calls.push(`lineTo ${x},${y}`)),
      closePath: vi.fn(() => calls.push('closePath')),
      fill: vi.fn(() => calls.push('fill')),
    };
    return { ctx: ctx as unknown as CanvasRenderingContext2D, raw: ctx, calls };
  };

  it('fills a triangle in the corner with the given colour', () => {
    const { ctx, raw, calls } = createContext();
    const bounds = computeShiftVariantMarkerBounds(CELL_LEFT, CELL_TOP, CELL_WIDTH, 1, false);

    drawShiftVariantMarker(ctx, bounds, false, '#f59e0b');

    expect(raw.fillStyle).toBe('#f59e0b');
    expect(calls).toEqual([
      'save',
      'beginPath',
      `moveTo ${bounds.left},${bounds.top}`,
      `lineTo ${bounds.left + bounds.size},${bounds.top}`,
      `lineTo ${bounds.left},${bounds.top + bounds.size}`,
      'closePath',
      'fill',
      'restore',
    ]);
  });

  it('mirrors the triangle in a right-to-left layout', () => {
    const { ctx, calls } = createContext();
    const bounds = computeShiftVariantMarkerBounds(CELL_LEFT, CELL_TOP, CELL_WIDTH, 1, true);

    drawShiftVariantMarker(ctx, bounds, true, '#f59e0b');

    expect(calls).toContain(`moveTo ${bounds.left + bounds.size},${bounds.top}`);
    expect(calls).toContain(`lineTo ${bounds.left},${bounds.top}`);
    expect(calls).toContain(`lineTo ${bounds.left + bounds.size},${bounds.top + bounds.size}`);
  });
});

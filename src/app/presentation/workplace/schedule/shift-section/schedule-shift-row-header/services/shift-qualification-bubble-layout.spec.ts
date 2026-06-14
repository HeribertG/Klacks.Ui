// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { describe, it, expect } from 'vitest';
import {
  computeShiftBubbleReserves,
  computeShiftQualificationBubbleLayout,
  ShiftQualificationBubbleLayoutInput,
} from './shift-qualification-bubble-layout';
import { IScheduleQualification } from 'src/app/domain/models/schedule/work-schedule-class';

function qualification(
  emoji: string | null,
  id = emoji ?? Math.random().toString(),
): IScheduleQualification {
  return {
    qualificationId: id,
    emoji,
    name: { de: 'x', en: 'x', fr: 'x', it: 'x' } as never,
    level: 2,
  };
}

function baseInput(
  qualifications: IScheduleQualification[],
  overrides: Partial<ShiftQualificationBubbleLayoutInput> = {},
): ShiftQualificationBubbleLayoutInput {
  return {
    qualifications,
    cellWidth: 250,
    cellHeight: 30,
    zoom: 1,
    isRtl: false,
    iconReserve: 32,
    anchorReserve: 4,
    ...overrides,
  };
}

describe('computeShiftQualificationBubbleLayout', () => {
  it('returns no bubbles when there are no qualifications', () => {
    const result = computeShiftQualificationBubbleLayout(baseInput([]));
    expect(result.bubbles).toHaveLength(0);
  });

  it('ignores qualifications without an emoji', () => {
    const result = computeShiftQualificationBubbleLayout(
      baseInput([qualification(null), qualification('  ')]),
    );
    expect(result.bubbles).toHaveLength(0);
  });

  it('renders one bubble per qualification when they fit', () => {
    const result = computeShiftQualificationBubbleLayout(
      baseInput([qualification('🚑'), qualification('💉'), qualification('🛡')]),
    );
    expect(result.bubbles).toHaveLength(3);
    expect(result.bubbles.map((b) => b.emoji)).toEqual(['🚑', '💉', '🛡']);
    expect(result.bubbles.every((b) => b.overflowCount === 0)).toBe(true);
  });

  it('anchors the first bubble at the right end (LTR) and stacks toward the centre', () => {
    const result = computeShiftQualificationBubbleLayout(
      baseInput([qualification('🚑'), qualification('💉')], {
        cellWidth: 250,
        anchorReserve: 4,
      }),
    );
    const [first, second] = result.bubbles;
    expect(first.cx).toBeGreaterThan(second.cx);
    const step = first.cx - second.cx;
    expect(step).toBeGreaterThan(0);
    expect(step).toBeLessThan(result.diameter);
    expect(first.cx).toBeLessThanOrEqual(250 - 4);
  });

  it('vertically centres the bubbles', () => {
    const result = computeShiftQualificationBubbleLayout(
      baseInput([qualification('🚑')], { cellHeight: 30 }),
    );
    expect(result.bubbles[0].cy).toBe(15);
  });

  it('keeps bubbles clear of the leading icon reserve', () => {
    const result = computeShiftQualificationBubbleLayout(
      baseInput([qualification('🚑')], { iconReserve: 40 }),
    );
    expect(result.bubbles[0].cx - result.diameter / 2).toBeGreaterThanOrEqual(0);
  });

  it('collapses overflow into a "+N" bubble when too many to fit', () => {
    const many = Array.from({ length: 20 }, (_, i) => qualification('🚑', `q${i}`));
    const result = computeShiftQualificationBubbleLayout(baseInput(many));

    const overflow = result.bubbles.filter((b) => b.overflowCount > 0);
    expect(overflow).toHaveLength(1);

    const shown = result.bubbles.length - 1;
    expect(overflow[0].overflowCount).toBe(20 - shown);
    expect(overflow[0].qualification).toBeNull();
    expect(overflow[0]).toBe(result.bubbles[result.bubbles.length - 1]);
  });

  it('caps visible slots harder at small zoom', () => {
    const many = Array.from({ length: 20 }, (_, i) => qualification('🚑', `q${i}`));
    const small = computeShiftQualificationBubbleLayout(
      baseInput(many, { zoom: 0.5 }),
    );
    expect(small.bubbles.length).toBeLessThanOrEqual(3);
  });

  it('anchors at the left end and stacks rightward in RTL', () => {
    const result = computeShiftQualificationBubbleLayout(
      baseInput([qualification('🚑'), qualification('💉')], { isRtl: true }),
    );
    expect(result.bubbles[1].cx).toBeGreaterThan(result.bubbles[0].cx);
    expect(result.bubbles[0].cx).toBeGreaterThanOrEqual(4);
  });
});

describe('computeShiftBubbleReserves', () => {
  it('reserves only a margin on the anchor side for non-sporadic shifts', () => {
    const reserves = computeShiftBubbleReserves(1, false);
    expect(reserves.anchorReserve).toBe(4);
    expect(reserves.iconReserve).toBe(4 + 24 + 4);
  });

  it('reserves room for the sporadic bubble on the anchor side', () => {
    const reserves = computeShiftBubbleReserves(1, true);
    expect(reserves.anchorReserve).toBe(4 + 20 + 4);
  });

  it('scales reserves with the zoom factor', () => {
    const reserves = computeShiftBubbleReserves(2, false);
    expect(reserves.iconReserve).toBe((4 + 24 + 4) * 2);
  });
});

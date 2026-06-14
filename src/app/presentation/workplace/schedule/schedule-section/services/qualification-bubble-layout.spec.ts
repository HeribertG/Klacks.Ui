// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { describe, it, expect } from 'vitest';
import {
  computeQualificationBubbleLayout,
  QualificationBubbleLayoutInput,
} from './qualification-bubble-layout';
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
  overrides: Partial<QualificationBubbleLayoutInput> = {},
): QualificationBubbleLayoutInput {
  return {
    qualifications,
    cellWidth: 250,
    cellHeight: 60,
    zoom: 1,
    isRtl: false,
    infoSpotWidth: 70,
    iconWidth: 20,
    ...overrides,
  };
}

describe('computeQualificationBubbleLayout', () => {
  it('returns no bubbles when there are no qualifications', () => {
    const result = computeQualificationBubbleLayout(baseInput([]));
    expect(result.bubbles).toHaveLength(0);
  });

  it('ignores qualifications without an emoji', () => {
    const result = computeQualificationBubbleLayout(
      baseInput([qualification(null), qualification('  ')]),
    );
    expect(result.bubbles).toHaveLength(0);
  });

  it('renders one bubble per qualification when they fit', () => {
    const result = computeQualificationBubbleLayout(
      baseInput([qualification('🚑'), qualification('💉'), qualification('🛡')]),
    );
    expect(result.bubbles).toHaveLength(3);
    expect(result.bubbles.map((b) => b.emoji)).toEqual(['🚑', '💉', '🛡']);
    expect(result.bubbles.every((b) => b.overflowCount === 0)).toBe(true);
  });

  it('places circles overlapping (step smaller than diameter), left to right', () => {
    const result = computeQualificationBubbleLayout(
      baseInput([qualification('🚑'), qualification('💉')]),
    );
    const [first, second] = result.bubbles;
    const step = second.cx - first.cx;
    expect(step).toBeGreaterThan(0);
    expect(step).toBeLessThan(result.diameter);
  });

  it('anchors the bubbles to the bottom of the cell', () => {
    const result = computeQualificationBubbleLayout(
      baseInput([qualification('🚑')], { cellHeight: 60 }),
    );
    expect(result.bubbles[0].cy).toBeGreaterThan(30);
    expect(result.bubbles[0].cy).toBeLessThan(60);
  });

  it('collapses overflow into a "+N" bubble when too many to fit', () => {
    const many = Array.from({ length: 20 }, (_, i) => qualification('🚑', `q${i}`));
    const result = computeQualificationBubbleLayout(baseInput(many));

    const overflow = result.bubbles.filter((b) => b.overflowCount > 0);
    expect(overflow).toHaveLength(1);

    const shown = result.bubbles.length - 1;
    expect(overflow[0].overflowCount).toBe(20 - shown);
    expect(overflow[0].qualification).toBeNull();
    expect(overflow[0]).toBe(result.bubbles[result.bubbles.length - 1]);
  });

  it('caps visible slots harder at small zoom', () => {
    const many = Array.from({ length: 20 }, (_, i) => qualification('🚑', `q${i}`));
    const small = computeQualificationBubbleLayout(
      baseInput(many, { zoom: 0.5 }),
    );
    expect(small.bubbles.length).toBeLessThanOrEqual(3);
  });

  it('lays bubbles out from right to left in RTL', () => {
    const result = computeQualificationBubbleLayout(
      baseInput([qualification('🚑'), qualification('💉')], { isRtl: true }),
    );
    expect(result.bubbles[1].cx).toBeLessThan(result.bubbles[0].cx);
  });
});

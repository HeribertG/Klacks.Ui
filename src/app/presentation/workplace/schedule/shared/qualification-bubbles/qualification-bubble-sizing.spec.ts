// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { describe, it, expect } from 'vitest';
import { computeQualificationBubbleSizing } from './qualification-bubble-sizing';
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

describe('computeQualificationBubbleSizing', () => {
  it('returns empty sizing when no qualification has an emoji', () => {
    const sizing = computeQualificationBubbleSizing(
      [qualification(null), qualification('  ')],
      200,
      30,
      1,
    );
    expect(sizing.slots).toHaveLength(0);
    expect(sizing.diameter).toBe(0);
    expect(sizing.emojiFontSize).toBe(0);
  });

  it('returns a sized but empty layout when the available width is too small', () => {
    const sizing = computeQualificationBubbleSizing([qualification('🚑')], 4, 30, 1);
    expect(sizing.slots).toHaveLength(0);
    expect(sizing.diameter).toBeGreaterThan(0);
    expect(sizing.emojiFontSize).toBe(0);
  });

  it('produces one slot per qualification when they all fit', () => {
    const sizing = computeQualificationBubbleSizing(
      [qualification('🚑'), qualification('💉'), qualification('🛡')],
      200,
      60,
      1,
    );
    expect(sizing.slots.map((s) => s.emoji)).toEqual(['🚑', '💉', '🛡']);
    expect(sizing.slots.every((s) => s.overflowCount === 0)).toBe(true);
    expect(sizing.step).toBeGreaterThan(0);
    expect(sizing.step).toBeLessThan(sizing.diameter);
    expect(sizing.emojiFontSize).toBe(Math.round(sizing.diameter * 0.7));
  });

  it('collapses the remainder into a single trailing overflow slot', () => {
    const many = Array.from({ length: 20 }, (_, i) => qualification('🚑', `q${i}`));
    const sizing = computeQualificationBubbleSizing(many, 200, 60, 1);

    const overflow = sizing.slots.filter((s) => s.overflowCount > 0);
    expect(overflow).toHaveLength(1);
    expect(overflow[0]).toBe(sizing.slots[sizing.slots.length - 1]);
    expect(overflow[0].qualification).toBeNull();
    expect(overflow[0].overflowCount).toBe(20 - (sizing.slots.length - 1));
  });

  it('caps the slot count harder at small zoom', () => {
    const many = Array.from({ length: 20 }, (_, i) => qualification('🚑', `q${i}`));
    const sizing = computeQualificationBubbleSizing(many, 400, 60, 0.5);
    expect(sizing.slots.length).toBeLessThanOrEqual(3);
  });
});

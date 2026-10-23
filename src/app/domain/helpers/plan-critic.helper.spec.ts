// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import {
  planCriticRowLabel,
  resolvePlanCriticRowLabels,
  toPlanCriticFindingViews,
} from './plan-critic.helper';
import { PlanCriticFinding } from 'src/app/domain/models/holistic-harmonizer/plan-critic-finding.interface';

const NAMES = ['Anna Muster', 'Beat Beispiel'];

const finding = (overrides: Partial<PlanCriticFinding> = {}): PlanCriticFinding => ({
  pattern: 'night_then_early',
  description: 'r00 hat Nacht und danach Früh, r01 nicht, r07 unbekannt.',
  severity: 'High',
  cells: [
    { row: 0, day: 1, symbol: 'E' },
    { row: 0, day: 0, symbol: 'N' },
  ],
  ...overrides,
});

describe('plan critic helper', () => {
  it('formats row labels like the backend', () => {
    expect(planCriticRowLabel(3)).toBe('r03');
    expect(planCriticRowLabel(123)).toBe('r123');
  });

  it('replaces known row labels by agent names and keeps unknown ones', () => {
    expect(resolvePlanCriticRowLabels('r00 hat Nacht und danach Früh, r01 nicht, r07 unbekannt.', NAMES)).toBe(
      'Anna Muster hat Nacht und danach Früh, Beat Beispiel nicht, r07 unbekannt.',
    );
  });

  it('leaves words that only start with r untouched', () => {
    expect(resolvePlanCriticRowLabels('rotation r00x run', NAMES)).toBe('rotation r00x run');
  });

  it('groups cells by agent with sorted calendar dates', () => {
    const [view] = toPlanCriticFindingViews([finding()], NAMES, new Date(2026, 9, 24));

    expect(view.agents).toHaveLength(1);
    expect(view.agents[0].name).toBe('Anna Muster');
    expect(view.agents[0].dates.map((d) => d.getDate())).toEqual([24, 25]);
    expect(view.pattern).toBe('night then early');
    expect(view.severityKey).toBe('holisticHarmonizer.critic.severity-high');
  });

  it('leaves dates out without a period start and falls back to Medium for unknown severities', () => {
    const [view] = toPlanCriticFindingViews([finding({ severity: 'Critical' })], NAMES, null);

    expect(view.agents[0].dates).toEqual([]);
    expect(view.severity).toBe('Medium');
  });

  it('returns no views for a missing finding list', () => {
    expect(toPlanCriticFindingViews(undefined, NAMES, null)).toEqual([]);
  });
});

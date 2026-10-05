// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { scenarioOpenSlotReasonKey } from './scenario-summary-reason.helper';
import { SCENARIO_OPEN_SLOT_REASON } from 'src/app/domain/constants/scenario-summary.constants';

describe('scenarioOpenSlotReasonKey', () => {
  it.each(Object.values(SCENARIO_OPEN_SLOT_REASON))('maps the known code %s to its own text key', (code) => {
    expect(scenarioOpenSlotReasonKey(code)).toBe(`scenarioSummary.reason.${code}`);
  });

  it('falls back to the capacity-or-rules text for an unknown code', () => {
    expect(scenarioOpenSlotReasonKey('SOMETHING_NEW')).toBe('scenarioSummary.reason.CAPACITY_OR_RULES');
  });

  it('falls back to the capacity-or-rules text for an empty code', () => {
    expect(scenarioOpenSlotReasonKey('')).toBe('scenarioSummary.reason.CAPACITY_OR_RULES');
  });
});

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HOLISTIC_HARMONIZER_MODE, parseHolisticHarmonizerMode } from './holistic-harmonizer-mode.constants';

describe('parseHolisticHarmonizerMode', () => {
  it('selects the LLM engine only for the llm value', () => {
    expect(parseHolisticHarmonizerMode('llm')).toBe(HOLISTIC_HARMONIZER_MODE.llm);
    expect(parseHolisticHarmonizerMode(' LLM ')).toBe(HOLISTIC_HARMONIZER_MODE.llm);
  });

  it('falls back to the deterministic search for missing, blank or unknown values', () => {
    expect(parseHolisticHarmonizerMode(undefined)).toBe(HOLISTIC_HARMONIZER_MODE.deterministic);
    expect(parseHolisticHarmonizerMode(null)).toBe(HOLISTIC_HARMONIZER_MODE.deterministic);
    expect(parseHolisticHarmonizerMode('')).toBe(HOLISTIC_HARMONIZER_MODE.deterministic);
    expect(parseHolisticHarmonizerMode('deterministic')).toBe(HOLISTIC_HARMONIZER_MODE.deterministic);
    expect(parseHolisticHarmonizerMode('vision')).toBe(HOLISTIC_HARMONIZER_MODE.deterministic);
  });
});

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Values of the WIZARD3_MODE setting (mirror of HolisticHarmonizerModes in Klacks.Api). A missing or unknown
 * value means the deterministic local search; the LLM vision engine runs only when the value is 'llm'.
 */
export const HOLISTIC_HARMONIZER_MODE = {
  deterministic: 'deterministic',
  llm: 'llm',
} as const;

export type HolisticHarmonizerMode = (typeof HOLISTIC_HARMONIZER_MODE)[keyof typeof HOLISTIC_HARMONIZER_MODE];

export function parseHolisticHarmonizerMode(value: string | null | undefined): HolisticHarmonizerMode {
  return value?.trim().toLowerCase() === HOLISTIC_HARMONIZER_MODE.llm
    ? HOLISTIC_HARMONIZER_MODE.llm
    : HOLISTIC_HARMONIZER_MODE.deterministic;
}

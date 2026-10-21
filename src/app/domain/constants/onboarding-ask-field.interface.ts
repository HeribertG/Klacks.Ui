// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * A single field Klacksy asks for during an 'ask' station. `kind` decides how the free-text answer is
 * turned into setting rows: 'text' writes the answer into `settingTypes[0]`; 'zipPlace' splits the
 * answer on the first whitespace into `settingTypes[0]` (zip) and `settingTypes[1]` (place).
 */
export type OnboardingAskFieldKind = 'text' | 'zipPlace';

export interface IOnboardingAskField {
  promptKey: string;
  kind: OnboardingAskFieldKind;
  settingTypes: string[];
}

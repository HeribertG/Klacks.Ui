// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { AutoWizardBrokenWish } from './auto-wizard-broken-wish.interface';
import { KeywordMode } from './keyword-mode.enum';
import { ScenarioSummary } from './scenario-summary.model';

export interface AutoWizardSoftAlternative {
  scenarioId: string;
  scenarioToken: string;
  scenarioName: string;
  keywordMode: KeywordMode;
  additionalFilledSlots: number;
  summary: ScenarioSummary;
  brokenWishes: AutoWizardBrokenWish[];
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { AutoWizardSoftAlternative } from 'src/app/domain/models/schedule/auto-wizard-soft-alternative.interface';
import { ScenarioSummary } from 'src/app/domain/models/schedule/scenario-summary.model';
import { AutoWizardPendingScenario } from './auto-wizard-pending-scenario.interface';

/**
 * Both results of an AutoWizard run whose soft-keyword retry filled more shifts, offered to the planner side by side.
 * @param strictScenarioName - Name of the strict plan (all restricting wishes kept), the scenario opened by default
 * @param strictSummary - Summary of the strict plan; null when the backend could not build it
 * @param alternative - The soft scenario with its summary and the wishes it breaks
 * @param alternativeScenario - The soft scenario in the form the tracker opens
 */
export interface AutoWizardSoftAlternativeOffer {
  strictScenarioName: string;
  strictSummary: ScenarioSummary | null;
  alternative: AutoWizardSoftAlternative;
  alternativeScenario: AutoWizardPendingScenario;
}

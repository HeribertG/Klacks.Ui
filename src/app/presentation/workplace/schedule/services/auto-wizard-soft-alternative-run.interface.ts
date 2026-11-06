// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { AutoWizardSoftKeywordRetryOutcome } from 'src/app/domain/constants/keyword-wish.constants';
import { AutoWizardSoftAlternative } from 'src/app/domain/models/schedule/auto-wizard-soft-alternative.interface';
import { ScenarioSummary } from 'src/app/domain/models/schedule/scenario-summary.model';
import { AutoWizardPendingScenario } from './auto-wizard-pending-scenario.interface';

/**
 * What a finished AutoWizard run reported about its soft-keyword retry.
 * @param outcome - Outcome of the soft-keyword retry
 * @param alternative - The soft scenario with its summary and broken wishes, when it was kept
 * @param strictScenarioName - Name of the strict plan
 * @param strictSummary - Summary of the strict plan
 * @param alternativeScenario - The soft scenario in the form the tracker opens
 * @param showingGroup - True when the run's group and period are shown right now
 * @param groupId - Group of the run (null = no group filter)
 * @param groupName - Display name of the run's group
 */
export interface AutoWizardSoftAlternativeRun {
  outcome: AutoWizardSoftKeywordRetryOutcome | undefined;
  alternative: AutoWizardSoftAlternative | null | undefined;
  strictScenarioName: string | null | undefined;
  strictSummary: ScenarioSummary | null | undefined;
  alternativeScenario: AutoWizardPendingScenario | null;
  showingGroup: boolean;
  groupId: string | null;
  groupName: string;
}

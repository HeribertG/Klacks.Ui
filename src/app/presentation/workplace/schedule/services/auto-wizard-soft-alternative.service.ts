// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Presents the outcome of the soft-keyword retry of a finished AutoWizard run. When the soft scenario filled more
 * shifts it is offered next to the strict plan (dialog for the shown group, a toast naming it for another group);
 * when the retry was not better or failed, a short neutral hint is shown. Opening the alternative goes through the
 * same path as the strict scenario, so accepting it later uses the scenario banner.
 * @param offer - The pending side-by-side offer for the shown group, null when there is none
 * @param run - What the finished run reported: retry outcome, soft alternative, strict scenario name and summary,
 *   the soft scenario as the tracker opens it, whether the run's group is shown and the run's group name
 */

import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';
import {
  AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME,
  AutoWizardSoftKeywordRetryOutcome,
} from 'src/app/domain/constants/keyword-wish.constants';
import { AutoWizardSoftAlternative } from 'src/app/domain/models/schedule/auto-wizard-soft-alternative.interface';
import { ScenarioSummary } from 'src/app/domain/models/schedule/scenario-summary.model';
import { AutoWizardJobTrackerService } from './auto-wizard-job-tracker.service';
import { AutoWizardPendingScenario } from './auto-wizard-pending-scenario.interface';
import { AutoWizardSoftAlternativeOffer } from './auto-wizard-soft-alternative-offer.interface';

const TOAST_CONTEXT = 'auto-wizard-soft-alternative';
const NOT_BETTER_KEY = 'autoWizard.softAlternative.notBetter';
const FAILED_KEY = 'autoWizard.softAlternative.failed';
const KEPT_FOR_GROUP_KEY = 'autoWizard.softAlternative.keptForGroup';

@Injectable({ providedIn: 'root' })
export class AutoWizardSoftAlternativeService {
  private readonly tracker = inject(AutoWizardJobTrackerService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly translateService = inject(TranslateService);

  private readonly _offer = signal<AutoWizardSoftAlternativeOffer | null>(null);
  readonly offer = this._offer.asReadonly();

  present(run: {
    outcome: AutoWizardSoftKeywordRetryOutcome | undefined;
    alternative: AutoWizardSoftAlternative | null | undefined;
    strictScenarioName: string | null | undefined;
    strictSummary: ScenarioSummary | null | undefined;
    alternativeScenario: AutoWizardPendingScenario | null;
    showingGroup: boolean;
    groupName: string;
  }): void {
    switch (run.outcome) {
      case AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept:
        this.presentKept(run);
        return;
      case AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.NotBetter:
        this.showHint(this.translateService.instant(NOT_BETTER_KEY));
        return;
      case AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Failed:
        this.showHint(this.translateService.instant(FAILED_KEY));
        return;
      default:
        return;
    }
  }

  async openAlternative(): Promise<void> {
    const offer = this._offer();
    this._offer.set(null);
    if (offer) {
      await this.tracker.showScenario(offer.alternativeScenario);
    }
  }

  dismiss(): void {
    this._offer.set(null);
  }

  private presentKept(run: Parameters<AutoWizardSoftAlternativeService['present']>[0]): void {
    const { alternative, alternativeScenario } = run;
    if (!alternative || !alternativeScenario) {
      return;
    }
    if (!run.showingGroup) {
      this.showHint(
        this.translateService.instant(KEPT_FOR_GROUP_KEY, {
          group: run.groupName,
          scenario: alternative.scenarioName,
          count: alternative.additionalFilledSlots,
        }),
      );
      return;
    }
    this._offer.set({
      strictScenarioName: run.strictScenarioName ?? '',
      strictSummary: run.strictSummary ?? null,
      alternative,
      alternativeScenario,
    });
  }

  private showHint(message: string): void {
    this.toastShowService.showInfo(message, TOAST_CONTEXT, '', TOAST_ICONS.INFO);
  }
}

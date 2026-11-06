// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Presents the outcome of the soft-keyword retry of a finished AutoWizard run. When the soft scenario filled more
 * shifts it is offered next to the strict plan: at once when the run's group and period are shown, otherwise a toast
 * names it and the offer waits (newest one per group, in memory only, because it carries employee names) until the
 * planner shows that group and period. When the retry was not better or failed, a short neutral hint is shown and a
 * waiting offer of an earlier run for that group is dropped. When the backend promoted the soft run to the final result
 * (more shifts filled, no restricting wish broken), no alternative is offered and a short neutral hint says so.
 * Opening the alternative goes through the same path as the strict scenario, so accepting it later uses the scenario
 * banner. A page reload drops the waiting offers.
 * @param offer - The offer to show now, null when there is none
 * @param pendingOffers - Offers waiting for their group and period to be shown
 * @param run - What the finished run reported: retry outcome, soft alternative, strict scenario name and summary,
 *   the soft scenario as the tracker opens it, whether the run's group is shown, the run's group id and name
 */

import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TOAST_ICONS } from 'src/app/presentation/toast/toast-icons.constants';
import { AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME } from 'src/app/domain/constants/keyword-wish.constants';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AutoWizardJobTrackerService } from './auto-wizard-job-tracker.service';
import { AutoWizardSoftAlternativeOffer } from './auto-wizard-soft-alternative-offer.interface';
import { AutoWizardSoftAlternativeRun } from './auto-wizard-soft-alternative-run.interface';

const TOAST_CONTEXT = 'auto-wizard-soft-alternative';
const NOT_BETTER_KEY = 'autoWizard.softAlternative.notBetter';
const PROMOTED_KEY = 'autoWizard.softAlternative.promoted';
const FAILED_KEY = 'autoWizard.softAlternative.failed';
const KEPT_FOR_GROUP_KEY = 'autoWizard.softAlternative.keptForGroup';

@Injectable({ providedIn: 'root' })
export class AutoWizardSoftAlternativeService {
  private readonly tracker = inject(AutoWizardJobTrackerService);
  private readonly dataManagementSchedule = inject(DataManagementScheduleService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly translateService = inject(TranslateService);

  private readonly _offer = signal<AutoWizardSoftAlternativeOffer | null>(null);
  private readonly _pendingOffers = signal<AutoWizardSoftAlternativeOffer[]>([]);
  readonly offer = this._offer.asReadonly();
  readonly pendingOffers = this._pendingOffers.asReadonly();

  constructor() {
    effect(() => {
      const pendings = this._pendingOffers();
      this.dataManagementSchedule.isRead();
      if (pendings.length === 0) {
        return;
      }
      const shown = pendings.find((p) => this.isShown(p));
      if (!shown) {
        return;
      }
      untracked(() => {
        this._pendingOffers.set(pendings.filter((p) => p !== shown));
        this._offer.set(shown);
      });
    });
  }

  present(run: AutoWizardSoftAlternativeRun): void {
    this.dropPendingFor(run.groupId);
    switch (run.outcome) {
      case AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Kept:
        this.presentKept(run);
        return;
      case AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.NotBetter:
        this.showHint(this.translateService.instant(NOT_BETTER_KEY));
        return;
      case AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Promoted:
        this.showHint(this.translateService.instant(PROMOTED_KEY));
        return;
      case AUTO_WIZARD_SOFT_KEYWORD_RETRY_OUTCOME.Failed:
        this.showHint(this.translateService.instant(FAILED_KEY));
        return;
      default:
        return;
    }
  }

  async openAlternative(offer: AutoWizardSoftAlternativeOffer): Promise<void> {
    this.clearShown(offer);
    await this.tracker.showScenario(offer.alternativeScenario);
  }

  dismiss(offer: AutoWizardSoftAlternativeOffer): void {
    this.clearShown(offer);
  }

  reset(): void {
    this._offer.set(null);
    this._pendingOffers.set([]);
  }

  private presentKept(run: AutoWizardSoftAlternativeRun): void {
    const { alternative, alternativeScenario } = run;
    if (!alternative || !alternativeScenario) {
      return;
    }
    const offer: AutoWizardSoftAlternativeOffer = {
      strictScenarioName: run.strictScenarioName ?? '',
      strictSummary: run.strictSummary ?? null,
      alternative,
      alternativeScenario,
    };
    if (run.showingGroup) {
      this._offer.set(offer);
      return;
    }
    this._pendingOffers.update((list) => [...list, offer]);
    this.showHint(
      this.translateService.instant(KEPT_FOR_GROUP_KEY, {
        group: run.groupName,
        scenario: alternative.scenarioName,
        count: alternative.additionalFilledSlots,
      }),
    );
  }

  private dropPendingFor(groupId: string | null): void {
    const pendings = this._pendingOffers();
    if (pendings.some((p) => p.alternativeScenario.groupId === groupId)) {
      this._pendingOffers.set(pendings.filter((p) => p.alternativeScenario.groupId !== groupId));
    }
  }

  private isShown(offer: AutoWizardSoftAlternativeOffer): boolean {
    const scenario = offer.alternativeScenario;
    return this.tracker.isShowing(scenario.groupId, scenario.periodFrom, scenario.periodUntil);
  }

  private clearShown(offer: AutoWizardSoftAlternativeOffer): void {
    if (this._offer() === offer) {
      this._offer.set(null);
    }
  }

  private showHint(message: string): void {
    this.toastShowService.showInfo(message, TOAST_CONTEXT, '', TOAST_ICONS.INFO);
  }
}

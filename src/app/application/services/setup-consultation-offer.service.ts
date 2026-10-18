// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Offers the Klacksy setup consultation to a user whose installation holds nothing to plan yet.
 * Exists because the backend's proactive no_schedule_yet notice dedups permanently — once dismissed
 * it never returns — so the re-entry has to live on the client. The offer is shown as an interactive
 * reply toast rather than a chat message: it needs no Klacksy panel open and no model turn just to
 * ask a question, and the accept chip's value is the recipe's own trigger phrase, so accepting it
 * starts the consultation deterministically instead of hoping the model emits the right marker.
 * @param translate - Resolves the offer text and, crucially, the per-language trigger phrase
 * @param toastShowService - Surfaces the offer as an interactive reply toast, independent of the Klacksy panel
 * @param assistantTurnLauncher - Opens the Klacksy panel and sends the trigger phrase as a real user turn, but only
 *   once the offer is accepted
 * @param onboarding - Single source of truth for whether the guided tour is running
 * @param scheduleSetupState - Tells an empty installation apart from a filtered-to-nothing list view
 */

import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { OnboardingService } from './onboarding.service';
import { AssistantTurnLauncherService } from './assistant-turn-launcher.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { DataScheduleSetupStateService } from 'src/app/infrastructure/api/assistant/data-schedule-setup-state.service';
import { IScheduleSetupState } from 'src/app/domain/interfaces/schedule-setup-state.interface';

const OFFER_TEXT_KEY = 'setupConsultation.offer';
const OFFER_ACCEPT_KEY = 'setupConsultation.offerAccept';
const OFFER_DECLINE_KEY = 'setupConsultation.offerDecline';
const TRIGGER_PHRASE_KEY = 'setupConsultation.triggerPhrase';
const DECLINE_VALUE = 'none';

@Injectable({ providedIn: 'root' })
export class SetupConsultationOfferService {
  private readonly translate = inject(TranslateService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly assistantTurnLauncher = inject(AssistantTurnLauncherService);
  private readonly onboarding = inject(OnboardingService);
  private readonly scheduleSetupState = inject(DataScheduleSetupStateService);

  offerIfNeeded(): void {
    if (this.onboarding.isTourActive() || this.wasOfferedThisSession()) {
      return;
    }

    this.scheduleSetupState.getState().subscribe({
      next: (state) => this.showOfferIfInstallationIsEmpty(state),
      error: () => undefined,
    });
  }

  private showOfferIfInstallationIsEmpty(state: IScheduleSetupState): void {
    if (state.hasOrders || state.hasShifts || state.hasWork) {
      return;
    }

    this.markOfferedThisSession();

    const triggerPhrase = this.translate.instant(TRIGGER_PHRASE_KEY);

    this.toastShowService.showInteractiveReply(
      {
        selectionMode: 'single',
        prompt: this.translate.instant(OFFER_TEXT_KEY),
        options: [
          { label: this.translate.instant(OFFER_ACCEPT_KEY), value: triggerPhrase },
          { label: this.translate.instant(OFFER_DECLINE_KEY), value: DECLINE_VALUE },
        ],
      },
      (values) => {
        if (!values.includes(triggerPhrase)) {
          return;
        }
        this.assistantTurnLauncher.openAndAsk(triggerPhrase);
      },
    );
  }

  private wasOfferedThisSession(): boolean {
    try {
      return sessionStorage.getItem(StorageKeys.SETUP_CONSULTATION_OFFERED) === 'true';
    } catch {
      return false;
    }
  }

  private markOfferedThisSession(): void {
    try {
      sessionStorage.setItem(StorageKeys.SETUP_CONSULTATION_OFFERED, 'true');
    } catch {
      return;
    }
  }
}

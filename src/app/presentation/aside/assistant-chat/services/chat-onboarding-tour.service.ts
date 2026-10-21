// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Onboarding tour of one assistant chat instance: offers the setup or intro tour after the welcome,
 * walks the stations (navigate, highlight, explain, chips) and keeps the cursor, the progress shown on
 * the onboarding card and whether a station's chips are still waiting for an answer.
 * @param kind - Onboarding kind a tour starts with (setup or intro)
 * @param station - Station currently presented; its chips decide whether the tour advances
 */
import { DestroyRef, Injectable, Injector, NgZone, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { LanguageConfigService } from 'src/app/application/services/language-config.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ISuggestedReply } from 'src/app/domain/models/assistant/suggested-reply.interface';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-replies-config.interface';
import { IWelcomeResponse } from 'src/app/domain/models/assistant/welcome.interface';
import {
  INTRO_ADMIN_SETUP_HINT_KEY,
  INTRO_MORE_PAGE_PARAM,
  INTRO_MORE_REQUEST_KEY,
  INTRO_STATION,
  IOnboardingStation,
  onboardingAskFields,
  ONBOARDING_KIND,
  ONBOARDING_KNOWN_CHOICE,
  ONBOARDING_OFFER_CHOICE,
  ONBOARDING_SETTINGS_ROUTE,
  ONBOARDING_STATION_DEFAULT_LANGUAGE,
  ONBOARDING_STATION_LLM_PROVIDER,
  ONBOARDING_STATION_TITLE,
  ONBOARDING_TOUR_CHOICE,
} from 'src/app/domain/constants/onboarding-stations';
import { OnboardingKind } from 'src/app/domain/constants/onboarding-kind.type';
import { IOnboardingAskField } from 'src/app/domain/constants/onboarding-ask-field.interface';
import { ChatTranscriptService } from './chat-transcript.service';
import { ChatComposerService } from './chat-composer.service';
import { ChatReplyToastService } from './chat-reply-toast.service';
import {
  INTRO_CARD_KEYS,
  INTRO_KNOWN_CHIP_KEY,
  INTRO_KNOWN_CONFIRMED_KEY,
  INTRO_OFFER_ACCEPT_KEY,
  INTRO_OFFER_DISMISS_KEY,
  INTRO_OFFER_LEGACY_PROMPT_KEY,
  INTRO_OFFER_PROMPT_KEY,
  INTRO_OFFER_SNOOZE_KEY,
  INTRO_TOUR_COMPLETED_KEY,
  INTRO_TOUR_MORE_KEY,
  INTRO_TOUR_NEXT_KEY,
  ONBOARDING_ASK_STATION_TYPE,
  ONBOARDING_DOUBLE_CLICK_EDIT_HINT_KEY,
  ONBOARDING_LLM_FREE_PROVIDERS_KEY,
  ONBOARDING_LLM_OFFLINE_KEY,
  ONBOARDING_LLM_ONLINE_KEY,
  ONBOARDING_LLM_STILL_OFFLINE_KEY,
  ONBOARDING_OFFER_ACCEPT_KEY,
  ONBOARDING_OFFER_DISMISS_KEY,
  ONBOARDING_OFFER_PROMPT_KEY,
  ONBOARDING_OFFER_SNOOZE_KEY,
  ONBOARDING_TOUR_BACK_KEY,
  ONBOARDING_TOUR_COMPLETED_KEY,
  ONBOARDING_TOUR_DONE_KEY,
  ONBOARDING_TOUR_END_KEY,
  ONBOARDING_TOUR_SKIP_KEY,
  SETUP_CARD_KEYS,
} from './chat-onboarding-tour.constants';

const SINGLE_SELECTION = 'single';

@Injectable()
export class ChatOnboardingTourService {
  private readonly onboarding = inject(OnboardingService);
  private readonly translateService = inject(TranslateService);
  private readonly languageConfigService = inject(LanguageConfigService);
  private readonly appSettings = inject(AppSettingsManagementService);
  private readonly klacksyNavigation = inject(KlacksyNavigationService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly transcript = inject(ChatTranscriptService);
  private readonly composer = inject(ChatComposerService);
  private readonly replyToasts = inject(ChatReplyToastService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  private tourIndex = 0;
  private isTourStationPending = false;
  private llmOfflineHintShown = false;
  private readonly liveTourStep = signal<number | null>(null);

  readonly onboardingCardKeys = computed(() => (this.onboarding.isIntro() ? INTRO_CARD_KEYS : SETUP_CARD_KEYS));
  readonly displayedTourProgress = computed(() => {
    const liveStep = this.liveTourStep();
    return liveStep === null ? this.onboarding.progress() : Math.min(liveStep, this.onboarding.total());
  });

  /**
   * Starts the tour whenever the header badge asks for it. Registered by the chat component after the
   * welcome effects, so a panel opened by the badge greets first and presents the station after that.
   */
  connect(): void {
    effect(() => {
      if (this.onboarding.tourStartRequested() > 0 && this.onboarding.consumeTourStartRequest()) {
        this.restartGuidedTour();
      }
    }, { injector: this.injector });
  }

  /** Whether a station's chips are still up and waiting for the user's answer. */
  isStationPending(): boolean {
    return this.isTourStationPending;
  }

  /**
   * Puts the chips of the pending station back up after a side question took the toast slot.
   * Returns false when no station is pending, so the caller shows its own toast instead.
   */
  tryReshowPendingStationChips(): boolean {
    const pendingStation = this.isTourStationPending ? this.onboarding.stationAt(this.tourIndex) : undefined;
    if (!pendingStation) {
      return false;
    }
    this.showStationChips(pendingStation);
    return true;
  }

  resetPendingStation(): void {
    this.isTourStationPending = false;
  }

  /**
   * Takes the onboarding state of a welcome response and offers the tour once per session.
   * @param response - Welcome response carrying the onboarding state
   */
  applyWelcomeOnboarding(response: IWelcomeResponse): void {
    this.onboarding.applyWelcome(response.onboarding);
    this.maybeOfferOnboarding();
  }

  startOnboardingTour(): void {
    this.beginTour(this.onboarding.activeKind());
  }

  resumeTourOneStepBack(): void {
    this.onboarding.accept();
    this.maybePostLlmOfflineHint();
    const currentPosition = this.liveTourStep() ?? this.onboarding.firstPendingIndex();
    this.tourIndex = Math.max(0, currentPosition - 1);
    this.presentStationAtCursor();
  }

  dismissOnboarding(): void {
    this.onboarding.dismiss();
  }

  private restartGuidedTour(): void {
    this.beginTour(this.onboarding.requestedTourKind() ?? this.onboarding.activeKind());
  }

  private beginTour(kind: OnboardingKind): void {
    this.onboarding.accept(kind);
    this.maybePostLlmOfflineHint();
    this.tourIndex = this.onboarding.firstPendingIndex();
    this.presentStationAtCursor();
  }

  private maybeOfferOnboarding(): void {
    if (!this.onboarding.shouldOffer() || this.onboarding.hasOfferedThisSession()) {
      return;
    }
    this.onboarding.markOfferedThisSession();
    if (this.onboarding.isIntro()) {
      this.showIntroOffer();
      return;
    }
    this.maybePostLlmOfflineHint();
    this.showOnboardingOffer();
  }

  private showIntroOffer(): void {
    const isLegacy = this.onboarding.isLegacyOffer();
    const options: ISuggestedReply[] = [this.option(INTRO_OFFER_ACCEPT_KEY, ONBOARDING_OFFER_CHOICE.Accept)];
    if (!isLegacy) {
      options.push(this.option(INTRO_OFFER_SNOOZE_KEY, ONBOARDING_OFFER_CHOICE.Snooze));
    }
    options.push(this.option(INTRO_OFFER_DISMISS_KEY, ONBOARDING_OFFER_CHOICE.Dismiss));
    const config: ISuggestedRepliesConfig = {
      selectionMode: SINGLE_SELECTION,
      prompt: this.translateService.instant(isLegacy ? INTRO_OFFER_LEGACY_PROMPT_KEY : INTRO_OFFER_PROMPT_KEY),
      options,
    };
    if (isLegacy) {
      this.replyToasts.dropPendingGreetingToast();
    }
    this.showChoiceToast(config, (choice) => this.handleIntroOfferChoice(choice));
    this.onboarding.reportOffered();
  }

  private handleIntroOfferChoice(choice: string): void {
    if (choice === ONBOARDING_OFFER_CHOICE.Accept) {
      this.beginTour(ONBOARDING_KIND.Intro);
    } else if (choice === ONBOARDING_OFFER_CHOICE.Snooze) {
      this.onboarding.snooze();
    } else if (choice === ONBOARDING_OFFER_CHOICE.Dismiss) {
      this.onboarding.dismiss(() => this.ngZone.run(() => this.showKnownKlacksChip()));
    }
  }

  private showKnownKlacksChip(): void {
    const config: ISuggestedRepliesConfig = {
      selectionMode: SINGLE_SELECTION,
      options: [this.option(INTRO_KNOWN_CHIP_KEY, ONBOARDING_KNOWN_CHOICE)],
    };
    this.toastShowService.dismissInteractiveReplies();
    this.toastShowService.showInteractiveReply(config, (values: string[]) => {
      this.ngZone.run(() => {
        if (values[0] !== ONBOARDING_KNOWN_CHOICE) return;
        this.onboarding
          .setAdvancedExplainDepth()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.ngZone.run(() => this.postTranslated(INTRO_KNOWN_CONFIRMED_KEY)),
            error: () => undefined,
          });
      });
    });
  }

  private maybePostLlmOfflineHint(): void {
    if (this.llmOfflineHintShown || this.onboarding.llmLive() || this.onboarding.isIntro()) {
      return;
    }
    this.llmOfflineHintShown = true;
    this.postTranslated(ONBOARDING_LLM_OFFLINE_KEY);
  }

  private showOnboardingOffer(): void {
    const config: ISuggestedRepliesConfig = {
      selectionMode: SINGLE_SELECTION,
      prompt: this.translateService.instant(ONBOARDING_OFFER_PROMPT_KEY),
      options: [
        this.option(ONBOARDING_OFFER_ACCEPT_KEY, ONBOARDING_OFFER_CHOICE.Accept),
        this.option(ONBOARDING_OFFER_SNOOZE_KEY, ONBOARDING_OFFER_CHOICE.Snooze),
        this.option(ONBOARDING_OFFER_DISMISS_KEY, ONBOARDING_OFFER_CHOICE.Dismiss),
      ],
    };
    let resolved = false;
    this.toastShowService.dismissInteractiveReplies();
    this.toastShowService.showInteractiveReply(
      config,
      (values: string[]) => {
        resolved = true;
        this.ngZone.run(() => {
          if (values.length === 0) return;
          this.handleOnboardingChoice(values[0]);
        });
      },
      () => {
        if (resolved) return;
        this.ngZone.run(() => this.onboarding.snooze());
      },
    );
  }

  private handleOnboardingChoice(choice: string): void {
    if (choice === ONBOARDING_OFFER_CHOICE.Accept) {
      this.startOnboardingTour();
    } else if (choice === ONBOARDING_OFFER_CHOICE.Snooze) {
      this.onboarding.snooze();
    } else if (choice === ONBOARDING_OFFER_CHOICE.Dismiss) {
      this.onboarding.dismiss();
    }
  }

  private presentStationAtCursor(): void {
    this.isTourStationPending = false;
    this.liveTourStep.set(this.tourIndex);
    const station = this.onboarding.stationAt(this.tourIndex);
    if (!station) {
      this.completeTour();
      return;
    }
    if (this.onboarding.isIntro()) {
      this.presentIntroStation(station);
      return;
    }
    this.klacksyNavigation.navigateAndScroll(station.route ?? ONBOARDING_SETTINGS_ROUTE, station.target || undefined);
    this.klacksyNavigation.highlightNavIcon(station.navIconId);
    this.postTranslated(station.explainKey);
    if (station.type === ONBOARDING_ASK_STATION_TYPE && station.id === ONBOARDING_STATION_DEFAULT_LANGUAGE) {
      this.showLanguageChoiceChips(station);
      return;
    }
    this.maybePostFreeProviderHint(station);
    this.maybePostDoubleClickEditHint(station);
    this.showStationChips(station);
  }

  private presentIntroStation(station: IOnboardingStation): void {
    if (station.route) {
      this.klacksyNavigation.navigateAndScroll(station.route, station.target || undefined);
    }
    this.klacksyNavigation.highlightNavIcon(station.navIconId);
    this.postTranslated(station.explainKey);
    if (station.id === INTRO_STATION.Klacksy && this.onboarding.showsAdminSetupHint()) {
      this.postTranslated(INTRO_ADMIN_SETUP_HINT_KEY);
    }
    this.showStationChips(station);
  }

  private maybePostFreeProviderHint(station: IOnboardingStation): void {
    if (station.id !== ONBOARDING_STATION_LLM_PROVIDER || this.onboarding.llmLive()) {
      return;
    }
    this.postTranslated(ONBOARDING_LLM_FREE_PROVIDERS_KEY);
  }

  private maybePostDoubleClickEditHint(station: IOnboardingStation): void {
    if (station.id !== ONBOARDING_STATION_TITLE) {
      return;
    }
    this.postTranslated(ONBOARDING_DOUBLE_CLICK_EDIT_HINT_KEY);
  }

  private showLanguageChoiceChips(station: IOnboardingStation): void {
    const field = onboardingAskFields(station.id)[0];
    this.postTranslated(field.promptKey);
    const options: ISuggestedReply[] = this.backOptions();
    options.push(
      ...this.languageConfigService.getSupportedLanguages().map((code) => ({
        label: this.languageConfigService.getDisplayName(code),
        value: code,
      })),
      ...this.skipAndEndOptions(),
    );
    this.showChoiceToast({ selectionMode: SINGLE_SELECTION, options }, (choice) =>
      this.handleLanguageChoice(station.id, field, choice),
    );
    this.isTourStationPending = true;
  }

  private handleLanguageChoice(stationId: string, field: IOnboardingAskField, choice: string): void {
    if (choice === ONBOARDING_TOUR_CHOICE.Back) {
      this.retreatTour();
      return;
    }
    if (choice === ONBOARDING_TOUR_CHOICE.Skip) {
      this.advanceTour();
      return;
    }
    if (choice === ONBOARDING_TOUR_CHOICE.End) {
      this.endTour();
      return;
    }
    this.onboarding.writeField(field, choice).subscribe({
      next: () => this.ngZone.run(() => this.finishStationChoice(stationId)),
      error: () => this.ngZone.run(() => this.finishStationChoice(stationId)),
    });
  }

  private showStationChips(station: IOnboardingStation): void {
    const options: ISuggestedReply[] = this.backOptions();
    if (this.onboarding.isIntro()) {
      options.push(this.option(INTRO_TOUR_NEXT_KEY, ONBOARDING_TOUR_CHOICE.Done));
      if (station.explainSkill && station.pageNameKey && this.onboarding.llmLive()) {
        options.push(this.option(INTRO_TOUR_MORE_KEY, ONBOARDING_TOUR_CHOICE.More));
      }
    } else {
      options.push(this.option(ONBOARDING_TOUR_DONE_KEY, ONBOARDING_TOUR_CHOICE.Done));
    }
    options.push(...this.skipAndEndOptions());
    this.showChoiceToast({ selectionMode: SINGLE_SELECTION, options }, (choice) =>
      this.handleStationChoice(station, choice),
    );
    this.isTourStationPending = true;
  }

  private handleStationChoice(station: IOnboardingStation, choice: string): void {
    if (choice === ONBOARDING_TOUR_CHOICE.Back) {
      this.retreatTour();
      return;
    }
    if (choice === ONBOARDING_TOUR_CHOICE.More) {
      this.askKlacksyForStationDetails(station);
      return;
    }
    if (choice !== ONBOARDING_TOUR_CHOICE.Done && choice !== ONBOARDING_TOUR_CHOICE.Skip) {
      this.endTour();
      return;
    }
    const completedStationId = choice === ONBOARDING_TOUR_CHOICE.Done ? station.id : undefined;
    if (station.id === ONBOARDING_STATION_LLM_PROVIDER && !this.onboarding.llmLive()) {
      this.recheckLlmThenAdvance(completedStationId);
      return;
    }
    if (completedStationId && station.type === ONBOARDING_ASK_STATION_TYPE) {
      void this.appSettings.saveImmediately().then(() =>
        this.ngZone.run(() => this.finishStationChoice(completedStationId)),
      );
      return;
    }
    this.finishStationChoice(completedStationId);
  }

  private askKlacksyForStationDetails(station: IOnboardingStation): void {
    if (!station.pageNameKey) {
      return;
    }
    const page = this.translateService.instant(station.pageNameKey);
    void this.composer.submit(this.translateService.instant(INTRO_MORE_REQUEST_KEY, { [INTRO_MORE_PAGE_PARAM]: page }));
  }

  private finishStationChoice(completedStationId?: string): void {
    if (completedStationId) {
      this.onboarding.markStationCompleted(completedStationId);
    }
    this.advanceTour();
  }

  private recheckLlmThenAdvance(completedStationId?: string): void {
    this.onboarding
      .refreshState(completedStationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.ngZone.run(() => {
            this.postTranslated(this.onboarding.llmLive() ? ONBOARDING_LLM_ONLINE_KEY : ONBOARDING_LLM_STILL_OFFLINE_KEY);
            this.advanceTour();
          }),
        error: () =>
          this.ngZone.run(() => {
            if (completedStationId) {
              this.onboarding.markStationCompleted(completedStationId);
            }
            this.advanceTour();
          }),
      });
  }

  private advanceTour(): void {
    this.tourIndex += 1;
    this.presentStationAtCursor();
  }

  private retreatTour(): void {
    this.tourIndex = Math.max(0, this.tourIndex - 1);
    this.presentStationAtCursor();
  }

  private completeTour(): void {
    this.isTourStationPending = false;
    this.toastShowService.dismissInteractiveReplies();
    const completedKey = this.onboarding.isIntro() ? INTRO_TOUR_COMPLETED_KEY : ONBOARDING_TOUR_COMPLETED_KEY;
    this.onboarding.completeTour();
    this.postTranslated(completedKey);
  }

  private endTour(): void {
    this.isTourStationPending = false;
    this.toastShowService.dismissInteractiveReplies();
    this.onboarding.dismiss();
  }

  private showChoiceToast(config: ISuggestedRepliesConfig, onChoice: (choice: string) => void): void {
    this.toastShowService.dismissInteractiveReplies();
    this.toastShowService.showInteractiveReply(config, (values: string[]) => {
      this.ngZone.run(() => {
        if (values.length === 0) return;
        onChoice(values[0]);
      });
    });
  }

  private backOptions(): ISuggestedReply[] {
    return this.tourIndex > 0 ? [this.option(ONBOARDING_TOUR_BACK_KEY, ONBOARDING_TOUR_CHOICE.Back)] : [];
  }

  private skipAndEndOptions(): ISuggestedReply[] {
    return [
      this.option(ONBOARDING_TOUR_SKIP_KEY, ONBOARDING_TOUR_CHOICE.Skip),
      this.option(ONBOARDING_TOUR_END_KEY, ONBOARDING_TOUR_CHOICE.End),
    ];
  }

  private option(labelKey: string, value: string): ISuggestedReply {
    return { label: this.translateService.instant(labelKey), value };
  }

  private postTranslated(key: string): void {
    this.transcript.postAssistantMessage(this.translateService.instant(key));
  }
}

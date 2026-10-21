// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Holds the Klacksy first-run setup-tour state (from the welcome payload) as a signal and persists the
 * user's choices via the onboarding-state endpoint. `writeField` writes a single collected answer into
 * its setting row(s) — used only for the `default-language` station, the sole remaining station without
 * a real settings-page field the guided tour can navigate to and focus; every other "ask" station lets
 * the user fill in the real, auto-saving form directly. Completed-station ids that no longer exist in
 * the catalog are ignored for the progress count. The proactive offer is surfaced at most once per
 * browser session; the resumable progress card follows `showCard`. `llmLive` mirrors the backend's LLM
 * availability (missing field is treated as live so offline hints only appear on an explicit false) and
 * can be re-read via `refreshState`. `isTourActive` is the single source of truth for "the setup tour is
 * being offered or run" (status `pending` covers the not-yet-accepted offer, `in_progress` covers the
 * running tour) — presentation code must gate any tour-conflicting UI (warnings, model picker, unrelated
 * proactive chat messages) on it instead of re-deriving tour state locally.
 * The state carries a `kind`: "setup" (installation-wide admin setup tour, missing kind = setup) or "intro"
 * (short per-account intro tour). Catalog, total, progress and pending station always follow the active
 * kind; the intro catalog is narrowed to the stations the user may open. For the intro only `in_progress`
 * counts as an active tour, so an unanswered offer never hides the chat. Every write sends the kind, is
 * applied optimistically and rolled back when the save fails; a welcome payload never downgrades a
 * locally running tour.
 * @param dataAssistant - HTTP API used to persist status/station changes
 * @param dataSettings - HTTP API used to upsert the collected default-language setting row
 * @param authorization - Rights of the signed-in user, used for the intro station filter and the setup gate
 * @param featurePlugins - Enabled feature plugins, used for the feature flag of intro stations
 */

import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataAssistantService } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { ISetting } from 'src/app/domain/models/settings/setting.interface';
import { IOnboardingState } from 'src/app/domain/models/assistant/onboarding-state.interface';
import { ISaveOnboardingStateRequest } from 'src/app/domain/models/assistant/save-onboarding-state-request.interface';
import {
  filterIntroStations,
  IOnboardingStation,
  ONBOARDING_KIND,
  ONBOARDING_OFFERED_EVENT,
  ONBOARDING_RESTART_STATUSES,
  ONBOARDING_SETUP_OPEN_STATUSES,
  ONBOARDING_STATIONS,
  ONBOARDING_STATUS,
  OnboardingKind,
} from 'src/app/domain/constants/onboarding-stations';
import { IOnboardingAskField } from 'src/app/domain/constants/onboarding-ask-field.interface';
import { AuthorizationService } from './authorization.service';
import { FeaturePluginStateService } from './feature-plugin-state.service';

const SESSION_OFFER_KEY_PREFIX = 'klacksy.onboarding.offeredSession.';
const SESSION_OFFER_FLAG = '1';
const INTRO_SNOOZE_LIMIT = 2;

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly dataAssistant = inject(DataAssistantService);
  private readonly dataSettings = inject(DataSettingsVariousService);
  private readonly authorization = inject(AuthorizationService);
  private readonly featurePlugins = inject(FeaturePluginStateService);

  private readonly stateSignal = signal<IOnboardingState | null>(null);
  private readonly tourStartRequestSignal = signal(0);
  private readonly requestedTourKindSignal = signal<OnboardingKind | null>(null);
  private consumedTourStartRequest = 0;

  readonly state = this.stateSignal.asReadonly();
  readonly tourStartRequested = this.tourStartRequestSignal.asReadonly();
  readonly requestedTourKind = this.requestedTourKindSignal.asReadonly();
  readonly activeKind = computed<OnboardingKind>(() => this.stateSignal()?.kind ?? ONBOARDING_KIND.Setup);
  readonly isIntro = computed(() => this.activeKind() === ONBOARDING_KIND.Intro);
  readonly isLegacyOffer = computed(() => this.stateSignal()?.isLegacyOffer ?? false);
  readonly showCard = computed(() => this.stateSignal()?.showCard ?? false);
  readonly status = computed(() => this.stateSignal()?.status ?? '');
  readonly llmLive = computed(() => this.stateSignal()?.llmLive ?? true);
  readonly isTourActive = computed(() => {
    const status = this.status();
    if (this.isIntro()) {
      return status === ONBOARDING_STATUS.InProgress;
    }
    return status === ONBOARDING_STATUS.Pending || status === ONBOARDING_STATUS.InProgress;
  });

  private readonly introCatalog = computed(() =>
    filterIntroStations(
      (permission) => this.authorization.hasPermission(permission),
      (feature) => this.featurePlugins.isPluginEnabled(feature),
    ),
  );

  readonly catalog = computed<readonly IOnboardingStation[]>(() =>
    this.isIntro() ? this.introCatalog() : ONBOARDING_STATIONS,
  );
  readonly total = computed(() => this.catalog().length);
  readonly progress = computed(() => {
    const known = new Set(this.catalog().map((station) => station.id));
    return (this.stateSignal()?.completedStations ?? []).filter((id) => known.has(id)).length;
  });

  /**
   * Takes the onboarding slice of a welcome payload. A tour running locally is never downgraded: while
   * the local status is in_progress only an in_progress slice of the same kind is taken (stations merged).
   * @param onboarding - Slice from the welcome payload; missing kind = setup
   */
  applyWelcome(onboarding?: IOnboardingState | null): void {
    const incoming = onboarding ? this.withKind(onboarding, onboarding.kind ?? ONBOARDING_KIND.Setup) : null;
    const local = this.stateSignal();
    if (local?.status === ONBOARDING_STATUS.InProgress) {
      if (!incoming || incoming.kind !== this.kindOf(local) || incoming.status !== ONBOARDING_STATUS.InProgress) {
        return;
      }
      this.stateSignal.set({
        ...incoming,
        completedStations: [...new Set([...local.completedStations, ...incoming.completedStations])],
      });
      return;
    }
    this.stateSignal.set(incoming);
  }

  showsAdminSetupHint(): boolean {
    return this.isIntro() && this.authorization.isAdmin;
  }

  shouldOffer(): boolean {
    return this.stateSignal()?.shouldOffer ?? false;
  }

  accept(kind: OnboardingKind = this.activeKind()): void {
    this.persist({ kind, status: ONBOARDING_STATUS.InProgress }, (current) => this.inProgressState(current, kind));
  }

  /**
   * Decides which tour a start request opens. A planner never gets the setup tour; an explicit setup
   * request needs the admin role, a request without kind opens the setup tour only while the admin's
   * setup state is still open.
   * @param requested - Kind named by the request (skill parameter or caller), may be missing or unknown
   */
  resolveTourKind(requested?: string | null): OnboardingKind {
    const isAdmin = this.authorization.isAdmin;
    if (requested === ONBOARDING_KIND.Setup) {
      return isAdmin ? ONBOARDING_KIND.Setup : ONBOARDING_KIND.Intro;
    }
    if (requested === ONBOARDING_KIND.Intro) {
      return ONBOARDING_KIND.Intro;
    }
    return isAdmin && this.isSetupOpen() ? ONBOARDING_KIND.Setup : ONBOARDING_KIND.Intro;
  }

  requestTourStart(kind?: OnboardingKind): void {
    this.requestedTourKindSignal.set(kind ?? this.activeKind());
    this.tourStartRequestSignal.update((n) => n + 1);
  }

  // Recreated components (e.g. the aside's floating-mode host swap) re-run their tour-start
  // effect on mount with the counter's current value, not just on an actual increment. This
  // lets the effect claim a request exactly once regardless of how many components observe it.
  consumeTourStartRequest(): boolean {
    const current = this.tourStartRequestSignal();
    if (current <= this.consumedTourStartRequest) {
      return false;
    }
    this.consumedTourStartRequest = current;
    return true;
  }

  reportOffered(): void {
    if (!this.isIntro()) {
      return;
    }
    this.persist({ status: ONBOARDING_OFFERED_EVENT }, (current) =>
      current?.isLegacyOffer
        ? { ...current, status: ONBOARDING_STATUS.LegacyOffered, isLegacyOffer: false, shouldOffer: false }
        : current,
    );
  }

  snooze(): void {
    this.persist({ status: ONBOARDING_STATUS.Snoozed }, (current) => this.snoozedState(current));
  }

  dismiss(onSaved?: () => void): void {
    this.persist(
      { status: ONBOARDING_STATUS.Dismissed },
      (current) => this.closedState(current, ONBOARDING_STATUS.Dismissed),
      onSaved,
    );
  }

  completeTour(): void {
    this.persist(
      { status: ONBOARDING_STATUS.Completed },
      (current) => this.closedState(current, ONBOARDING_STATUS.Completed),
    );
  }

  markStationCompleted(stationId: string): void {
    this.persist({ completedStation: stationId }, (current) =>
      current && !current.completedStations.includes(stationId)
        ? { ...current, completedStations: [...current.completedStations, stationId] }
        : current,
    );
  }

  setAdvancedExplainDepth(): Observable<void> {
    return this.dataAssistant.setAdvancedExplainDepth();
  }

  /**
   * Re-reads (and optionally extends) the state of one tour. A response for another kind than the one
   * held locally is returned to the caller but never replaces the local state.
   * @param completedStationId - Station to mark completed in the same round trip
   * @param kind - Tour to read; defaults to the active one
   */
  refreshState(completedStationId?: string, kind: OnboardingKind = this.activeKind()): Observable<IOnboardingState> {
    const request: ISaveOnboardingStateRequest = completedStationId
      ? { kind, completedStation: completedStationId }
      : { kind };
    return this.dataAssistant.saveOnboardingState(request).pipe(
      tap((state) => {
        const local = this.stateSignal();
        if (local === null || this.kindOf(local) === kind) {
          this.stateSignal.set(this.withKind(state, kind));
        }
      }),
    );
  }

  stationAt(index: number): IOnboardingStation | undefined {
    return this.catalog()[index];
  }

  firstPendingStation(): IOnboardingStation {
    const catalog = this.catalog();
    return catalog[this.firstPendingIndex()] ?? catalog[0];
  }

  firstPendingIndex(): number {
    const catalog = this.catalog();
    const done = new Set(this.stateSignal()?.completedStations ?? []);
    const index = catalog.findIndex((station) => !done.has(station.id));
    return index < 0 ? catalog.length : index;
  }

  writeField(field: IOnboardingAskField, rawText: string): Observable<unknown> {
    const value = rawText.trim();
    const writes: Observable<ISetting>[] = [];

    if (field.kind === 'zipPlace') {
      const separator = value.indexOf(' ');
      const zip = separator > 0 ? value.slice(0, separator).trim() : value;
      const place = separator > 0 ? value.slice(separator + 1).trim() : '';
      writes.push(this.writeSetting(field.settingTypes[0], zip));
      if (place) {
        writes.push(this.writeSetting(field.settingTypes[1], place));
      }
    } else {
      writes.push(this.writeSetting(field.settingTypes[0], value));
    }

    return writes.length > 0 ? forkJoin(writes) : of(null);
  }

  hasOfferedThisSession(kind: OnboardingKind = this.activeKind()): boolean {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_OFFER_KEY_PREFIX + kind) === SESSION_OFFER_FLAG;
  }

  markOfferedThisSession(kind: OnboardingKind = this.activeKind()): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_OFFER_KEY_PREFIX + kind, SESSION_OFFER_FLAG);
    }
  }

  private isSetupOpen(): boolean {
    const state = this.stateSignal();
    return !!state && this.kindOf(state) === ONBOARDING_KIND.Setup && ONBOARDING_SETUP_OPEN_STATUSES.includes(state.status);
  }

  private kindOf(state: IOnboardingState): OnboardingKind {
    return state.kind ?? ONBOARDING_KIND.Setup;
  }

  private withKind(state: IOnboardingState, kind: OnboardingKind): IOnboardingState {
    return state.kind ? state : { ...state, kind };
  }

  private inProgressState(current: IOnboardingState | null, kind: OnboardingKind): IOnboardingState {
    if (!current || this.kindOf(current) !== kind) {
      return {
        kind,
        shouldOffer: false,
        llmLive: current?.llmLive,
        showCard: true,
        status: ONBOARDING_STATUS.InProgress,
        completedStations: [],
      };
    }
    const restart = kind === ONBOARDING_KIND.Intro && ONBOARDING_RESTART_STATUSES.includes(current.status);
    return {
      ...current,
      kind,
      shouldOffer: false,
      showCard: true,
      status: ONBOARDING_STATUS.InProgress,
      isLegacyOffer: false,
      completedStations: restart ? [] : current.completedStations,
      snoozeCount: restart ? 0 : current.snoozeCount,
    };
  }

  private snoozedState(current: IOnboardingState | null): IOnboardingState | null {
    if (!current) {
      return current;
    }
    if (this.kindOf(current) !== ONBOARDING_KIND.Intro) {
      return { ...current, shouldOffer: false, status: ONBOARDING_STATUS.Snoozed };
    }
    if (current.isLegacyOffer || current.status === ONBOARDING_STATUS.LegacyOffered) {
      return { ...current, shouldOffer: false, isLegacyOffer: false, status: ONBOARDING_STATUS.LegacyOffered };
    }
    const snoozeCount = (current.snoozeCount ?? 0) + 1;
    return {
      ...current,
      shouldOffer: false,
      snoozeCount,
      status: snoozeCount >= INTRO_SNOOZE_LIMIT ? ONBOARDING_STATUS.Dismissed : ONBOARDING_STATUS.Snoozed,
    };
  }

  private closedState(current: IOnboardingState | null, status: string): IOnboardingState | null {
    return current ? { ...current, shouldOffer: false, showCard: false, isLegacyOffer: false, status } : current;
  }

  private writeSetting(type: string, value: string): Observable<ISetting> {
    return this.dataSettings.addSetting({ id: undefined, type, value });
  }

  private persist(
    request: ISaveOnboardingStateRequest,
    optimistic: (current: IOnboardingState | null) => IOnboardingState | null,
    onSaved?: () => void,
  ): void {
    const kind = request.kind ?? this.activeKind();
    const previous = this.stateSignal();
    const optimisticState = optimistic(previous);
    this.stateSignal.set(optimisticState);
    this.dataAssistant.saveOnboardingState({ ...request, kind }).subscribe({
      next: (state) => {
        this.stateSignal.set(this.withKind(state, kind));
        onSaved?.();
      },
      error: () => {
        if (this.stateSignal() === optimisticState) {
          this.stateSignal.set(previous);
        }
      },
    });
  }
}

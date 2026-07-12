// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Holds the Klacksy first-run setup-tour state (from the welcome payload) as a signal, persists the
 * user's choices via the onboarding-state endpoint, and drives the per-field "ask" capture for the
 * collect-and-write stations (title, address, default-language) by writing the answers as settings rows.
 * Completed-station ids that no longer exist in the catalog are ignored for the progress count. The
 * proactive offer is surfaced at most once per browser session; the resumable progress card follows
 * `showCard`. `llmLive` mirrors the backend's LLM availability (missing field is treated as live so
 * offline hints only appear on an explicit false) and can be re-read via `refreshState`.
 * @param dataAssistant - HTTP API used to persist status/station changes
 * @param dataSettings - HTTP API used to upsert the collected title/address setting rows
 */

import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataAssistantService } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { ISetting } from 'src/app/domain/models/settings/settings-various-class';
import {
  IOnboardingState,
  ISaveOnboardingStateRequest,
} from 'src/app/domain/models/assistant/welcome.interface';
import {
  IOnboardingAskField,
  IOnboardingStation,
  ONBOARDING_STATIONS,
  ONBOARDING_STATUS,
  onboardingAskFields,
} from 'src/app/domain/constants/onboarding-stations';

const SESSION_OFFER_KEY = 'klacksy.onboarding.offeredSession';

interface IAskCursor {
  stationId: string;
  fieldIndex: number;
}

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly dataAssistant = inject(DataAssistantService);
  private readonly dataSettings = inject(DataSettingsVariousService);

  private readonly stateSignal = signal<IOnboardingState | null>(null);
  private readonly askSignal = signal<IAskCursor | null>(null);
  private readonly tourStartRequestSignal = signal(0);

  readonly state = this.stateSignal.asReadonly();
  readonly tourStartRequested = this.tourStartRequestSignal.asReadonly();
  readonly showCard = computed(() => this.stateSignal()?.showCard ?? false);
  readonly status = computed(() => this.stateSignal()?.status ?? '');
  readonly llmLive = computed(() => this.stateSignal()?.llmLive ?? true);
  private readonly knownStationIds = new Set(ONBOARDING_STATIONS.map((station) => station.id));

  readonly total = ONBOARDING_STATIONS.length;
  readonly progress = computed(
    () => (this.stateSignal()?.completedStations ?? []).filter((id) => this.knownStationIds.has(id)).length,
  );

  applyWelcome(onboarding?: IOnboardingState | null): void {
    this.stateSignal.set(onboarding ?? null);
  }

  shouldOffer(): boolean {
    return this.stateSignal()?.shouldOffer ?? false;
  }

  accept(): void {
    this.persist({ status: ONBOARDING_STATUS.InProgress });
  }

  requestTourStart(): void {
    this.tourStartRequestSignal.update((n) => n + 1);
  }

  snooze(): void {
    this.persist({ status: ONBOARDING_STATUS.Snoozed });
  }

  dismiss(): void {
    this.persist({ status: ONBOARDING_STATUS.Dismissed });
  }

  completeTour(): void {
    this.persist({ status: ONBOARDING_STATUS.Completed });
  }

  markStationCompleted(stationId: string): void {
    this.persist({ completedStation: stationId });
  }

  refreshState(completedStationId?: string): Observable<IOnboardingState> {
    const request: ISaveOnboardingStateRequest = completedStationId
      ? { completedStation: completedStationId }
      : {};
    return this.dataAssistant
      .saveOnboardingState(request)
      .pipe(tap((state) => this.stateSignal.set(state)));
  }

  firstPendingStation(): IOnboardingStation {
    return ONBOARDING_STATIONS[this.firstPendingIndex()] ?? ONBOARDING_STATIONS[0];
  }

  firstPendingIndex(): number {
    const done = new Set(this.stateSignal()?.completedStations ?? []);
    const index = ONBOARDING_STATIONS.findIndex((station) => !done.has(station.id));
    return index < 0 ? ONBOARDING_STATIONS.length : index;
  }

  isAwaitingAnswer(): boolean {
    return this.askSignal() !== null;
  }

  currentAskStationId(): string | null {
    return this.askSignal()?.stationId ?? null;
  }

  beginAsk(stationId: string): void {
    this.askSignal.set({ stationId, fieldIndex: 0 });
  }

  cancelAsk(): void {
    this.askSignal.set(null);
  }

  currentAskField(): IOnboardingAskField | null {
    const cursor = this.askSignal();
    if (!cursor) {
      return null;
    }
    return onboardingAskFields(cursor.stationId)[cursor.fieldIndex] ?? null;
  }

  advanceAskField(): IOnboardingAskField | null {
    const cursor = this.askSignal();
    if (!cursor) {
      return null;
    }
    const nextIndex = cursor.fieldIndex + 1;
    this.askSignal.set({ stationId: cursor.stationId, fieldIndex: nextIndex });
    return onboardingAskFields(cursor.stationId)[nextIndex] ?? null;
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

  hasOfferedThisSession(): boolean {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_OFFER_KEY) === '1';
  }

  markOfferedThisSession(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_OFFER_KEY, '1');
    }
  }

  private writeSetting(type: string, value: string): Observable<ISetting> {
    return this.dataSettings.addSetting({ id: undefined, type, value });
  }

  private persist(request: ISaveOnboardingStateRequest): void {
    this.dataAssistant.saveOnboardingState(request).subscribe({
      next: (state) => this.stateSignal.set(state),
      error: () => {
        /* keep current state on failure — onboarding is best-effort */
      },
    });
  }
}

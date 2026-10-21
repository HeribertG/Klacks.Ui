// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { OnboardingService } from './onboarding.service';
import { DataAssistantService } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { ISetting } from 'src/app/domain/models/settings/setting.interface';
import { AppSetting } from 'src/app/domain/models/settings/app-setting-class';
import { IOnboardingState } from 'src/app/domain/models/assistant/onboarding-state.interface';
import { ISaveOnboardingStateRequest } from 'src/app/domain/models/assistant/save-onboarding-state-request.interface';
import {
    INTRO_STATION,
    INTRO_STATIONS,
    onboardingAskFields,
    ONBOARDING_KIND,
    ONBOARDING_NAV_ICON,
    ONBOARDING_OFFERED_EVENT,
    ONBOARDING_STATIONS,
    ONBOARDING_STATUS,
} from 'src/app/domain/constants/onboarding-stations';
import { AuthorizationService } from './authorization.service';
import { FeaturePluginStateService } from './feature-plugin-state.service';
import { PERMISSIONS, ROLE_ADMIN, ROLE_AUTHORISED } from 'src/app/domain/constants/permissions.constants';
import { MESSAGING_PLUGIN_NAME } from 'src/app/domain/constants/feature-plugin.constants';

describe('OnboardingService', () => {
    let service: OnboardingService;
    let saveOnboardingState: ReturnType<typeof vi.fn>;
    let addSetting: ReturnType<typeof vi.fn>;
    let rights: Set<string>;
    let enabledPlugins: Set<string>;

    const echoSetting = (request: ISetting): ISetting => ({
        id: request.id ?? 'new-id',
        type: request.type,
        value: request.value,
    });

    const state = (overrides: Partial<IOnboardingState> = {}): IOnboardingState => ({
        shouldOffer: false,
        showCard: true,
        status: ONBOARDING_STATUS.InProgress,
        completedStations: [],
        ...overrides,
    });

    beforeEach(() => {
        saveOnboardingState = vi.fn((request: ISaveOnboardingStateRequest) =>
            of(state({ status: request.status ?? ONBOARDING_STATUS.InProgress })),
        );
        addSetting = vi.fn((request: ISetting) => of(echoSetting(request)));
        rights = new Set<string>([PERMISSIONS.CanUseAssistant]);
        enabledPlugins = new Set<string>();
        const authorizationMock = {
            hasPermission: (permission: string) => rights.has(ROLE_ADMIN) || rights.has(permission),
            get isAdmin() {
                return rights.has(ROLE_ADMIN);
            },
        };

        TestBed.configureTestingModule({
            providers: [
                OnboardingService,
                { provide: DataAssistantService, useValue: { saveOnboardingState } },
                { provide: DataSettingsVariousService, useValue: { addSetting } },
                { provide: AuthorizationService, useValue: authorizationMock },
                { provide: FeaturePluginStateService, useValue: { isPluginEnabled: (name: string) => enabledPlugins.has(name) } },
            ],
        });
        service = TestBed.inject(OnboardingService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('writeField', () => {
        it('writes a single text field into its setting type (trimmed)', () => {
            const field = onboardingAskFields('title')[0];

            service.writeField(field, '  Acme AG  ').subscribe();

            expect(addSetting).toHaveBeenCalledTimes(1);
            expect(addSetting).toHaveBeenCalledWith({ id: undefined, type: AppSetting.APP_NAME, value: 'Acme AG' });
        });

        it('splits a zipPlace field into two settings on the first space', () => {
            const field = onboardingAskFields('address')[2];

            service.writeField(field, '8001 Zürich West').subscribe();

            expect(addSetting).toHaveBeenCalledTimes(2);
            expect(addSetting).toHaveBeenNthCalledWith(1, { id: undefined, type: AppSetting.APP_ADDRESS_ZIP, value: '8001' });
            expect(addSetting).toHaveBeenNthCalledWith(2, { id: undefined, type: AppSetting.APP_ADDRESS_PLACE, value: 'Zürich West' });
        });

        it('writes only the zip when no place is given', () => {
            const field = onboardingAskFields('address')[2];

            service.writeField(field, '8001').subscribe();

            expect(addSetting).toHaveBeenCalledTimes(1);
            expect(addSetting).toHaveBeenCalledWith({ id: undefined, type: AppSetting.APP_ADDRESS_ZIP, value: '8001' });
        });

        it('writes the default-language answer into DEFAULT_LANGUAGE', () => {
            const field = onboardingAskFields('default-language')[0];

            service.writeField(field, ' fr ').subscribe();

            expect(addSetting).toHaveBeenCalledTimes(1);
            expect(addSetting).toHaveBeenCalledWith({ id: undefined, type: AppSetting.DEFAULT_LANGUAGE, value: 'fr' });
        });
    });

    describe('firstPendingIndex', () => {
        it('is 0 when nothing is completed', () => {
            expect(service.firstPendingIndex()).toBe(0);
        });

        it('skips completed stations from the front', () => {
            service.applyWelcome(state({ completedStations: ['title', 'branding', 'address'] }));

            expect(service.firstPendingIndex()).toBe(3);
            expect(service.firstPendingStation()).toBe(ONBOARDING_STATIONS[3]);
        });

        it('equals the station count when everything is completed', () => {
            service.applyWelcome(state({ completedStations: ONBOARDING_STATIONS.map((station) => station.id) }));

            expect(service.firstPendingIndex()).toBe(ONBOARDING_STATIONS.length);
        });
    });

    describe('progress', () => {
        it('counts only station ids that exist in the catalog', () => {
            service.applyWelcome(state({ completedStations: ['title', 'llm-klacksy', 'address'] }));

            expect(service.progress()).toBe(2);
        });

        it('never exceeds the total even when the state holds only orphaned ids', () => {
            service.applyWelcome(state({ completedStations: ['llm-klacksy', 'removed-station'] }));

            expect(service.progress()).toBe(0);
            expect(service.progress()).toBeLessThanOrEqual(service.total());
        });
    });

    describe('persisting choices', () => {
        it('completeTour persists the completed status and updates the signal', () => {
            service.completeTour();

            expect(saveOnboardingState).toHaveBeenCalledWith({ kind: ONBOARDING_KIND.Setup, status: ONBOARDING_STATUS.Completed });
            expect(service.status()).toBe(ONBOARDING_STATUS.Completed);
        });

        it('markStationCompleted persists the station id', () => {
            service.markStationCompleted('calendar');

            expect(saveOnboardingState).toHaveBeenCalledWith({ kind: ONBOARDING_KIND.Setup, completedStation: 'calendar' });
        });
    });

    describe('llmLive', () => {
        it('defaults to live when no state is present', () => {
            expect(service.llmLive()).toBe(true);
        });

        it('defaults to live when the backend omits the field', () => {
            service.applyWelcome(state());

            expect(service.llmLive()).toBe(true);
        });

        it('reflects an explicit offline flag from the backend', () => {
            service.applyWelcome(state({ llmLive: false }));

            expect(service.llmLive()).toBe(false);
        });
    });

    describe('refreshState', () => {
        it('re-reads the state with an empty request and updates the signal', () => {
            saveOnboardingState.mockReturnValue(of(state({ llmLive: true })));
            service.applyWelcome(state({ llmLive: false }));

            service.refreshState().subscribe();

            expect(saveOnboardingState).toHaveBeenCalledWith({ kind: ONBOARDING_KIND.Setup });
            expect(service.llmLive()).toBe(true);
        });

        it('persists the completed station in the same round trip when given', () => {
            saveOnboardingState.mockReturnValue(of(state({ llmLive: false, completedStations: ['llm-provider'] })));

            service.refreshState('llm-provider').subscribe();

            expect(saveOnboardingState).toHaveBeenCalledWith({ kind: ONBOARDING_KIND.Setup, completedStation: 'llm-provider' });
            expect(service.llmLive()).toBe(false);
            expect(service.progress()).toBe(1);
        });
    });

    describe('station catalog', () => {
        it('every station carries a known main-nav icon id', () => {
            const knownIconIds = Object.values(ONBOARDING_NAV_ICON);
            for (const station of ONBOARDING_STATIONS) {
                expect(knownIconIds).toContain(station.navIconId);
            }
        });
    });

    describe('tour start requests', () => {
        it('increments the tourStartRequested signal on each request', () => {
            expect(service.tourStartRequested()).toBe(0);

            service.requestTourStart();
            service.requestTourStart();

            expect(service.tourStartRequested()).toBe(2);
        });

        it('consumeTourStartRequest claims a request only once', () => {
            service.requestTourStart();

            expect(service.consumeTourStartRequest()).toBe(true);
            expect(service.consumeTourStartRequest()).toBe(false);
        });

        it('consumeTourStartRequest claims each new request exactly once', () => {
            service.requestTourStart();
            expect(service.consumeTourStartRequest()).toBe(true);

            expect(service.consumeTourStartRequest()).toBe(false);

            service.requestTourStart();
            expect(service.consumeTourStartRequest()).toBe(true);
            expect(service.consumeTourStartRequest()).toBe(false);
        });
    });

    describe('intro tour (kind intro)', () => {
        const intro = (overrides: Partial<IOnboardingState> = {}): IOnboardingState =>
            state({ kind: ONBOARDING_KIND.Intro, shouldOffer: true, showCard: false, status: ONBOARDING_STATUS.Pending, ...overrides });

        const echoIntro = (request: ISaveOnboardingStateRequest): IOnboardingState =>
            intro({ kind: request.kind, status: request.status ?? ONBOARDING_STATUS.InProgress, shouldOffer: false });

        describe('active catalog', () => {
            it('switches total, progress and firstPendingIndex to the intro catalog', () => {
                service.applyWelcome(intro({ completedStations: [INTRO_STATION.Schedule, 'title', 'branding'] }));

                expect(service.catalog().every((station) => INTRO_STATIONS.includes(station))).toBe(true);
                expect(service.total()).toBe(service.catalog().length);
                expect(service.progress()).toBe(1);
                expect(service.firstPendingIndex()).toBe(1);
                expect(service.firstPendingStation().id).toBe(INTRO_STATION.Shifts);
            });

            it('keeps the setup catalog when the slice carries no kind', () => {
                service.applyWelcome(state({ completedStations: ['title'] }));

                expect(service.catalog()).toBe(ONBOARDING_STATIONS);
                expect(service.total()).toBe(ONBOARDING_STATIONS.length);
                expect(service.firstPendingIndex()).toBe(1);
            });

            it('stationAt reads the active catalog and is undefined past its end', () => {
                service.applyWelcome(intro());

                expect(service.stationAt(0)?.id).toBe(INTRO_STATION.Schedule);
                expect(service.stationAt(service.total())).toBeUndefined();
            });
        });

        describe('station filter', () => {
            it('drops period closing and messaging for a planner', () => {
                service.applyWelcome(intro());

                const ids = service.catalog().map((station) => station.id);
                expect(ids).not.toContain(INTRO_STATION.PeriodClosing);
                expect(ids).not.toContain(INTRO_STATION.Messaging);
                expect(ids).toContain(INTRO_STATION.Schedule);
                expect(ids).toContain(INTRO_STATION.Klacksy);
            });

            it('drops the messaging station while the plugin is not enabled, even for a supervisor', () => {
                rights.add(ROLE_AUTHORISED);
                service.applyWelcome(intro());

                expect(service.catalog().map((station) => station.id)).not.toContain(INTRO_STATION.Messaging);
            });

            it('offers all seven stations to an admin with the messaging plugin enabled', () => {
                rights.add(ROLE_ADMIN);
                enabledPlugins.add(MESSAGING_PLUGIN_NAME);
                service.applyWelcome(intro());

                expect(service.total()).toBe(INTRO_STATIONS.length);
                expect(INTRO_STATIONS.length).toBeLessThanOrEqual(7);
            });
        });

        describe('isTourActive', () => {
            it('is false for a pending intro offer so an unanswered offer never hides the chat', () => {
                service.applyWelcome(intro());

                expect(service.isTourActive()).toBe(false);
            });

            it('is true while the intro runs', () => {
                service.applyWelcome(intro({ status: ONBOARDING_STATUS.InProgress, shouldOffer: false }));

                expect(service.isTourActive()).toBe(true);
            });
        });

        describe('applyWelcome never downgrades a running tour', () => {
            it('keeps a local in_progress against a pending slice of the same kind', () => {
                saveOnboardingState.mockReturnValue(new Subject<IOnboardingState>());
                service.applyWelcome(intro());
                service.accept();

                service.applyWelcome(intro({ status: ONBOARDING_STATUS.Pending }));

                expect(service.status()).toBe(ONBOARDING_STATUS.InProgress);
                expect(service.activeKind()).toBe(ONBOARDING_KIND.Intro);
            });

            it('keeps the running intro when a setup slice arrives', () => {
                service.applyWelcome(intro({ status: ONBOARDING_STATUS.InProgress, completedStations: [INTRO_STATION.Schedule] }));

                service.applyWelcome(state({ kind: ONBOARDING_KIND.Setup, status: ONBOARDING_STATUS.Pending }));

                expect(service.activeKind()).toBe(ONBOARDING_KIND.Intro);
                expect(service.progress()).toBe(1);
            });

            it('keeps the running tour when the slice is missing', () => {
                service.applyWelcome(intro({ status: ONBOARDING_STATUS.InProgress }));

                service.applyWelcome(null);

                expect(service.status()).toBe(ONBOARDING_STATUS.InProgress);
            });

            it('merges the stations of an in_progress slice of the same kind', () => {
                service.applyWelcome(intro({ status: ONBOARDING_STATUS.InProgress, completedStations: [INTRO_STATION.Schedule] }));

                service.applyWelcome(intro({ status: ONBOARDING_STATUS.InProgress, completedStations: [INTRO_STATION.Shifts] }));

                expect(service.state()?.completedStations).toEqual([INTRO_STATION.Schedule, INTRO_STATION.Shifts]);
            });

            it('takes the server slice when nothing runs locally', () => {
                service.applyWelcome(intro({ status: ONBOARDING_STATUS.Completed, shouldOffer: false }));

                service.applyWelcome(intro({ status: ONBOARDING_STATUS.Pending }));

                expect(service.status()).toBe(ONBOARDING_STATUS.Pending);
            });
        });

        describe('optimistic persist', () => {
            it('applies the change before the server answers and sends the kind', () => {
                const pending = new Subject<IOnboardingState>();
                saveOnboardingState.mockReturnValue(pending);
                service.applyWelcome(intro());

                service.accept();

                expect(service.status()).toBe(ONBOARDING_STATUS.InProgress);
                expect(service.showCard()).toBe(true);
                expect(saveOnboardingState).toHaveBeenCalledWith({ kind: ONBOARDING_KIND.Intro, status: ONBOARDING_STATUS.InProgress });
            });

            it('rolls back to the previous state when the save fails', () => {
                saveOnboardingState.mockReturnValue(throwError(() => new Error('offline')));
                const before = intro({ status: ONBOARDING_STATUS.InProgress, shouldOffer: false, completedStations: [INTRO_STATION.Schedule] });
                service.applyWelcome(before);

                service.markStationCompleted(INTRO_STATION.Shifts);

                expect(service.state()).toEqual(before);
                expect(service.progress()).toBe(1);
            });

            it('does not roll back over a newer local change', () => {
                const first = new Subject<IOnboardingState>();
                saveOnboardingState.mockReturnValueOnce(first).mockReturnValueOnce(new Subject<IOnboardingState>());
                service.applyWelcome(intro({ status: ONBOARDING_STATUS.InProgress, shouldOffer: false }));

                service.markStationCompleted(INTRO_STATION.Schedule);
                service.markStationCompleted(INTRO_STATION.Shifts);
                first.error(new Error('offline'));

                expect(service.state()?.completedStations).toEqual([INTRO_STATION.Schedule, INTRO_STATION.Shifts]);
            });

            it('clears finished stations locally on a restart from completed', () => {
                saveOnboardingState.mockReturnValue(new Subject<IOnboardingState>());
                service.applyWelcome(intro({ status: ONBOARDING_STATUS.Completed, shouldOffer: false, completedStations: INTRO_STATIONS.map((s) => s.id) }));

                service.accept(ONBOARDING_KIND.Intro);

                expect(service.firstPendingIndex()).toBe(0);
                expect(service.progress()).toBe(0);
            });

            it('starts the intro from an empty state when the active slice is the setup tour', () => {
                saveOnboardingState.mockReturnValue(new Subject<IOnboardingState>());
                service.applyWelcome(state({ status: ONBOARDING_STATUS.Pending, completedStations: ['title'] }));

                service.accept(ONBOARDING_KIND.Intro);

                expect(service.activeKind()).toBe(ONBOARDING_KIND.Intro);
                expect(service.firstPendingIndex()).toBe(0);
                expect(saveOnboardingState).toHaveBeenCalledWith({ kind: ONBOARDING_KIND.Intro, status: ONBOARDING_STATUS.InProgress });
            });
        });

        describe('offer reactions', () => {
            it('reports the offer once as an event and turns a legacy offer into legacy_offered', () => {
                saveOnboardingState.mockReturnValue(new Subject<IOnboardingState>());
                service.applyWelcome(intro({ status: ONBOARDING_STATUS.LegacyOffer, isLegacyOffer: true }));

                service.reportOffered();

                expect(saveOnboardingState).toHaveBeenCalledWith({ kind: ONBOARDING_KIND.Intro, status: ONBOARDING_OFFERED_EVENT });
                expect(service.status()).toBe(ONBOARDING_STATUS.LegacyOffered);
                expect(service.shouldOffer()).toBe(false);
                expect(service.isLegacyOffer()).toBe(false);
            });

            it('keeps a new account offerable after reporting the offer', () => {
                saveOnboardingState.mockReturnValue(new Subject<IOnboardingState>());
                service.applyWelcome(intro());

                service.reportOffered();

                expect(service.status()).toBe(ONBOARDING_STATUS.Pending);
            });

            it('never reports an offer for the setup tour', () => {
                service.applyWelcome(state({ status: ONBOARDING_STATUS.Pending, shouldOffer: true }));

                service.reportOffered();

                expect(saveOnboardingState).not.toHaveBeenCalled();
            });

            it('dismisses on the second explicit later', () => {
                saveOnboardingState.mockReturnValue(new Subject<IOnboardingState>());
                service.applyWelcome(intro({ status: ONBOARDING_STATUS.Snoozed, snoozeCount: 1 }));

                service.snooze();

                expect(service.status()).toBe(ONBOARDING_STATUS.Dismissed);
            });

            it('calls back only after the dismissal was saved', () => {
                const pending = new Subject<IOnboardingState>();
                saveOnboardingState.mockReturnValue(pending);
                service.applyWelcome(intro());
                const onSaved = vi.fn();

                service.dismiss(onSaved);
                expect(onSaved).not.toHaveBeenCalled();
                pending.next(intro({ status: ONBOARDING_STATUS.Dismissed, shouldOffer: false }));

                expect(onSaved).toHaveBeenCalledTimes(1);
            });

            it('does not call back when the dismissal fails', () => {
                saveOnboardingState.mockReturnValue(throwError(() => new Error('offline')));
                service.applyWelcome(intro());
                const onSaved = vi.fn();

                service.dismiss(onSaved);

                expect(onSaved).not.toHaveBeenCalled();
                expect(service.status()).toBe(ONBOARDING_STATUS.Pending);
            });
        });

        describe('resolveTourKind', () => {
            it('never gives a planner the setup tour, not even on explicit request', () => {
                service.applyWelcome(state({ status: ONBOARDING_STATUS.Pending }));

                expect(service.resolveTourKind(ONBOARDING_KIND.Setup)).toBe(ONBOARDING_KIND.Intro);
                expect(service.resolveTourKind(undefined)).toBe(ONBOARDING_KIND.Intro);
            });

            it('falls back to intro for an admin without an open setup state', () => {
                rights.add(ROLE_ADMIN);
                service.applyWelcome(intro());

                expect(service.resolveTourKind(undefined)).toBe(ONBOARDING_KIND.Intro);
                expect(service.resolveTourKind('unknown')).toBe(ONBOARDING_KIND.Intro);
            });

            it('opens the setup tour for an admin with an open setup state when no kind is named', () => {
                rights.add(ROLE_ADMIN);
                service.applyWelcome(state({ status: ONBOARDING_STATUS.Snoozed }));

                expect(service.resolveTourKind(undefined)).toBe(ONBOARDING_KIND.Setup);
                expect(service.resolveTourKind(ONBOARDING_KIND.Intro)).toBe(ONBOARDING_KIND.Intro);
            });

            it('honours an explicit setup request from an admin', () => {
                rights.add(ROLE_ADMIN);
                service.applyWelcome(intro({ status: ONBOARDING_STATUS.Completed }));

                expect(service.resolveTourKind(ONBOARDING_KIND.Setup)).toBe(ONBOARDING_KIND.Setup);
            });

            it('carries the requested kind with the tour start request', () => {
                service.requestTourStart(ONBOARDING_KIND.Intro);

                expect(service.requestedTourKind()).toBe(ONBOARDING_KIND.Intro);
            });
        });

        describe('session gate and refresh', () => {
            afterEach(() => sessionStorage.clear());

            it('gates the offer per kind', () => {
                service.markOfferedThisSession(ONBOARDING_KIND.Setup);

                expect(service.hasOfferedThisSession(ONBOARDING_KIND.Setup)).toBe(true);
                expect(service.hasOfferedThisSession(ONBOARDING_KIND.Intro)).toBe(false);
            });

            it('never lets a refresh of another kind replace the local state', () => {
                saveOnboardingState.mockReturnValue(of(state({ status: ONBOARDING_STATUS.Completed })));
                service.applyWelcome(intro());

                service.refreshState(undefined, ONBOARDING_KIND.Setup).subscribe();

                expect(saveOnboardingState).toHaveBeenCalledWith({ kind: ONBOARDING_KIND.Setup });
                expect(service.activeKind()).toBe(ONBOARDING_KIND.Intro);
                expect(service.status()).toBe(ONBOARDING_STATUS.Pending);
            });

            it('stamps the requested kind onto a server answer without kind', () => {
                saveOnboardingState.mockImplementation((request: ISaveOnboardingStateRequest) =>
                    of(state({ status: request.status ?? ONBOARDING_STATUS.InProgress })),
                );
                service.applyWelcome(intro());

                service.accept();

                expect(service.activeKind()).toBe(ONBOARDING_KIND.Intro);
            });

            it('echo helper keeps the intro kind', () => {
                saveOnboardingState.mockImplementation((request: ISaveOnboardingStateRequest) => of(echoIntro(request)));
                service.applyWelcome(intro());

                service.completeTour();

                expect(service.activeKind()).toBe(ONBOARDING_KIND.Intro);
                expect(service.status()).toBe(ONBOARDING_STATUS.Completed);
            });
        });
    });
});

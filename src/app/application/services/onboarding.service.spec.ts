// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OnboardingService } from './onboarding.service';
import { DataAssistantService } from 'src/app/infrastructure/api/assistant/data-assistant.service';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { ISetting, AppSetting } from 'src/app/domain/models/settings/settings-various-class';
import { IOnboardingState, ISaveOnboardingStateRequest } from 'src/app/domain/models/assistant/welcome.interface';
import { onboardingAskFields, ONBOARDING_NAV_ICON, ONBOARDING_STATIONS, ONBOARDING_STATUS } from 'src/app/domain/constants/onboarding-stations';

describe('OnboardingService', () => {
    let service: OnboardingService;
    let saveOnboardingState: ReturnType<typeof vi.fn>;
    let addSetting: ReturnType<typeof vi.fn>;

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

        TestBed.configureTestingModule({
            providers: [
                OnboardingService,
                { provide: DataAssistantService, useValue: { saveOnboardingState } },
                { provide: DataSettingsVariousService, useValue: { addSetting } },
            ],
        });
        service = TestBed.inject(OnboardingService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('ask-state lifecycle', () => {
        it('walks the address fields in order and ends after the last one', () => {
            const fields = onboardingAskFields('address');

            expect(service.isAwaitingAnswer()).toBe(false);

            service.beginAsk('address');
            expect(service.isAwaitingAnswer()).toBe(true);
            expect(service.currentAskStationId()).toBe('address');
            expect(service.currentAskField()).toBe(fields[0]);

            expect(service.advanceAskField()).toBe(fields[1]);
            expect(service.advanceAskField()).toBe(fields[2]);
            expect(service.advanceAskField()).toBe(fields[3]);
            expect(service.advanceAskField()).toBeNull();
        });

        it('cancelAsk clears the cursor', () => {
            service.beginAsk('title');
            service.cancelAsk();

            expect(service.isAwaitingAnswer()).toBe(false);
            expect(service.currentAskStationId()).toBeNull();
            expect(service.currentAskField()).toBeNull();
        });

        it('advanceAskField returns null when no ask is active', () => {
            expect(service.advanceAskField()).toBeNull();
        });
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
            expect(service.progress()).toBeLessThanOrEqual(service.total);
        });
    });

    describe('persisting choices', () => {
        it('completeTour persists the completed status and updates the signal', () => {
            service.completeTour();

            expect(saveOnboardingState).toHaveBeenCalledWith({ status: ONBOARDING_STATUS.Completed });
            expect(service.status()).toBe(ONBOARDING_STATUS.Completed);
        });

        it('markStationCompleted persists the station id', () => {
            service.markStationCompleted('calendar');

            expect(saveOnboardingState).toHaveBeenCalledWith({ completedStation: 'calendar' });
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
    });
});

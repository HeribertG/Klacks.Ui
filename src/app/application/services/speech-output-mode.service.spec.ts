// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SpeechOutputModeService } from './speech-output-mode.service';
import { OnboardingService } from './onboarding.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { ISpeechSettings, SpeechSettings } from 'src/app/domain/models/settings/speech-settings.model';
import { OutputMode } from 'src/app/domain/constants/speech-constants';

describe('SpeechOutputModeService', () => {
    let service: SpeechOutputModeService;
    let speechSettings: ReturnType<typeof signal<ISpeechSettings>>;
    let tourActive: ReturnType<typeof signal<boolean>>;

    const withMode = (mode: string): ISpeechSettings => ({ ...new SpeechSettings(), outputMode: mode });

    beforeEach(() => {
        speechSettings = signal<ISpeechSettings>(withMode(OutputMode.Both));
        tourActive = signal(false);

        TestBed.configureTestingModule({
            providers: [
                SpeechOutputModeService,
                { provide: AppSettingsManagementService, useValue: { speechSettings } },
                { provide: OnboardingService, useValue: { isTourActive: tourActive } },
            ],
        });
        service = TestBed.inject(SpeechOutputModeService);
    });

    describe('without an active tour', () => {
        it.each([OutputMode.Text, OutputMode.Both, OutputMode.BothAuto, OutputMode.Audio])(
            'passes through the raw setting %s',
            (mode) => {
                speechSettings.set(withMode(mode));

                expect(service.mode()).toBe(mode);
            },
        );

        it('reports floating mode for audio and both-auto only', () => {
            speechSettings.set(withMode(OutputMode.Audio));
            expect(service.isFloatingMode()).toBe(true);

            speechSettings.set(withMode(OutputMode.BothAuto));
            expect(service.isFloatingMode()).toBe(true);

            speechSettings.set(withMode(OutputMode.Both));
            expect(service.isFloatingMode()).toBe(false);
        });
    });

    describe('while the setup tour is active', () => {
        beforeEach(() => tourActive.set(true));

        it.each([OutputMode.Audio, OutputMode.BothAuto])('degrades %s to both', (mode) => {
            speechSettings.set(withMode(mode));

            expect(service.mode()).toBe(OutputMode.Both);
            expect(service.isFloatingMode()).toBe(false);
            expect(service.isAutoSpeakMode()).toBe(false);
            expect(service.isAudioOnlyMode()).toBe(false);
        });

        it.each([OutputMode.Text, OutputMode.Both])('leaves %s untouched', (mode) => {
            speechSettings.set(withMode(mode));

            expect(service.mode()).toBe(mode);
        });

        it('never rewrites the persisted setting', () => {
            speechSettings.set(withMode(OutputMode.Audio));

            expect(service.mode()).toBe(OutputMode.Both);
            expect(speechSettings().outputMode).toBe(OutputMode.Audio);
        });

        it('restores the raw mode once the tour ends', () => {
            speechSettings.set(withMode(OutputMode.Audio));
            expect(service.mode()).toBe(OutputMode.Both);

            tourActive.set(false);

            expect(service.mode()).toBe(OutputMode.Audio);
            expect(service.isAudioOnlyMode()).toBe(true);
        });
    });

    it('reports text-only mode from the effective value', () => {
        speechSettings.set(withMode(OutputMode.Text));
        expect(service.isTextOnlyMode()).toBe(true);

        speechSettings.set(withMode(OutputMode.Audio));
        expect(service.isTextOnlyMode()).toBe(false);
    });
});

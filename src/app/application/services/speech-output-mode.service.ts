// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Single source of truth for the speech output mode the UI must actually behave by, as opposed to
 * the raw user setting. The guided setup tour runs inside the regular chat panel, so while the tour
 * is offered or running the floating voice modes ('audio', 'both-auto') are degraded to 'both': the
 * chat panel stays mounted and nothing is spoken automatically. The persisted setting is never
 * modified — as soon as the tour ends, the user's own choice applies again. Presentation code must
 * read the mode from here instead of `AppSettingsManagementService`; the settings page itself is the
 * one exception, since it edits the raw value.
 * @param appSettings - Store holding the persisted speech settings
 * @param onboarding - Owner of the setup-tour state that triggers the degradation
 */

import { computed, inject, Injectable } from '@angular/core';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { OutputMode } from 'src/app/domain/constants/speech-constants';
import { OnboardingService } from './onboarding.service';

const TOUR_OUTPUT_MODE = OutputMode.Both;

@Injectable({ providedIn: 'root' })
export class SpeechOutputModeService {
  private readonly appSettings = inject(AppSettingsManagementService);
  private readonly onboarding = inject(OnboardingService);

  readonly mode = computed<string>(() => {
    const mode = this.appSettings.speechSettings().outputMode;
    if (!this.onboarding.isTourActive()) {
      return mode;
    }
    return this.isFloating(mode) ? TOUR_OUTPUT_MODE : mode;
  });

  readonly isFloatingMode = computed<boolean>(() => this.isFloating(this.mode()));
  readonly isAutoSpeakMode = computed<boolean>(() => this.mode() === OutputMode.BothAuto);
  readonly isAudioOnlyMode = computed<boolean>(() => this.mode() === OutputMode.Audio);
  readonly isTextOnlyMode = computed<boolean>(() => this.mode() === OutputMode.Text);

  private isFloating(mode: string): boolean {
    return mode === OutputMode.Audio || mode === OutputMode.BothAuto;
  }
}

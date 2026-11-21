// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Consent dialog of the local voice: shows the full OpenRAIL-M licence text (scrollable), a mandatory checkbox and the
 * button "Accept licence and install", which stays disabled until the checkbox is ticked and the text has loaded.
 * @param license - Licence text and version, null while loading or when loading failed
 * @param loadFailed - True when the licence text could not be loaded
 * @param busy - True while the install request is being sent
 * @param accepted - Emits the licence version the administrator accepted
 * @param dismissed - Emits when the dialog is closed without accepting
 */
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LOCAL_TTS_KEYS } from 'src/app/domain/constants/local-tts.constants';
import { LocalTtsLicense } from 'src/app/domain/models/assistant/local-tts-license.interface';

@Component({
  selector: 'app-local-tts-license-dialog',
  templateUrl: './local-tts-license-dialog.component.html',
  styleUrls: ['./local-tts-license-dialog.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocalTtsLicenseDialogComponent {
  readonly license = input<LocalTtsLicense | null>(null);
  readonly loadFailed = input(false);
  readonly busy = input(false);
  readonly accepted = output<string>();
  readonly dismissed = output<void>();

  readonly Keys = LOCAL_TTS_KEYS;
  readonly consentGiven = signal(false);
  readonly canAccept = computed(() => this.consentGiven() && !!this.license() && !this.busy());

  onConsentChange(event: Event): void {
    this.consentGiven.set((event.target as HTMLInputElement).checked);
  }

  onAccept(): void {
    const license = this.license();
    if (!this.canAccept() || !license) {
      return;
    }
    this.accepted.emit(license.version);
  }

  onClose(): void {
    this.dismissed.emit();
  }
}

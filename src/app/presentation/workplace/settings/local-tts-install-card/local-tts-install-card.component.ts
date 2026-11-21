// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Install card of the local voice (Supertonic 3) inside the speech settings: status, download size, the last failed
 * installation and the button that opens the licence dialog. Installing always needs a fresh consent in the dialog,
 * also for a retry after an error. The card never changes the selected speech output provider.
 * @param localTts - Shared status and actions of the local voice; the card attaches while it is shown
 * @param dialogOpen - Whether the licence dialog is shown
 * @param sizeMegabytes - Download size of the model in megabytes (decimal), from the status
 */
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LocalTtsEngineService } from 'src/app/domain/services/speech/local-tts-engine.service';
import { BYTES_PER_MEGABYTE, LOCAL_TTS_KEYS } from 'src/app/domain/constants/local-tts.constants';
import { LocalTtsLicenseDialogComponent } from './local-tts-license-dialog/local-tts-license-dialog.component';

@Component({
  selector: 'app-local-tts-install-card',
  templateUrl: './local-tts-install-card.component.html',
  styleUrls: ['./local-tts-install-card.component.scss'],
  standalone: true,
  imports: [TranslateModule, LocalTtsLicenseDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocalTtsInstallCardComponent implements OnInit, OnDestroy {
  readonly localTts = inject(LocalTtsEngineService);

  readonly Keys = LOCAL_TTS_KEYS;
  readonly dialogOpen = signal(false);
  readonly sizeMegabytes = computed(() => {
    const bytes = this.localTts.status()?.sizeBytes ?? 0;
    return Math.round(bytes / BYTES_PER_MEGABYTE);
  });

  ngOnInit(): void {
    void this.localTts.attach();
  }

  ngOnDestroy(): void {
    this.localTts.detach();
  }

  openDialog(): void {
    if (!this.localTts.canInstall()) {
      return;
    }
    this.dialogOpen.set(true);
    void this.localTts.loadLicense();
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  async onLicenseAccepted(licenseVersion: string): Promise<void> {
    await this.localTts.install(licenseVersion);
    this.dialogOpen.set(false);
  }
}

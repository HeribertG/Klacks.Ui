// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Standalone page component for the privacy policy (Datenschutzerklarung).
 * Accessible without authentication from the login page and main menu.
 * Appends the playground passage only while the public playground token limit is active.
 */
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PlaygroundDeviceService } from 'src/app/domain/services/playground/playground-device.service';
import { LegalBackButtonComponent } from '../legal-back-button/legal-back-button.component';

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
  standalone: true,
  imports: [TranslateModule, LegalBackButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyComponent {
  readonly playgroundLimitActive = inject(PlaygroundDeviceService).limitActive;
}

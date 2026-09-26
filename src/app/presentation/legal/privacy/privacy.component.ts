// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Standalone page component for the privacy policy (Datenschutzerklarung).
 * Accessible without authentication from the login page and main menu.
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LegalBackButtonComponent } from '../legal-back-button/legal-back-button.component';

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
  standalone: true,
  imports: [TranslateModule, LegalBackButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyComponent {}

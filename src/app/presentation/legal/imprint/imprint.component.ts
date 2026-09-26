// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Standalone page component for the legal imprint (Impressum).
 * Accessible without authentication from the login page and main menu.
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LegalBackButtonComponent } from '../legal-back-button/legal-back-button.component';

@Component({
  selector: 'app-imprint',
  templateUrl: './imprint.component.html',
  styleUrl: './imprint.component.scss',
  standalone: true,
  imports: [TranslateModule, LegalBackButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImprintComponent {}

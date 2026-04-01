// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Standalone page component for the privacy policy (Datenschutzerklarung).
 * Accessible without authentication from the login page and main menu.
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.scss'],
  standalone: true,
  imports: [TranslateModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyComponent {}

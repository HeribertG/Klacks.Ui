// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Standalone page component for the legal imprint (Impressum).
 * Accessible without authentication from the login page and main menu.
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-imprint',
  templateUrl: './imprint.component.html',
  styleUrl: './imprint.component.scss',
  standalone: true,
  imports: [TranslateModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImprintComponent {}

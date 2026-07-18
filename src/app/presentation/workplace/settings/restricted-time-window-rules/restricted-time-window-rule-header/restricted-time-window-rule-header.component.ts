// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Presentational column header for the restricted time window rules list.
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-restricted-time-window-rule-header',
  templateUrl: './restricted-time-window-rule-header.component.html',
  styleUrls: ['./restricted-time-window-rule-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestrictedTimeWindowRuleHeaderComponent {
}

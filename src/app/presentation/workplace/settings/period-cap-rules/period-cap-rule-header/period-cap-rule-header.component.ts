// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Presentational column header for the period cap rule list.
 * Renders static column labels; holds no state and emits no events.
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-period-cap-rule-header',
  templateUrl: './period-cap-rule-header.component.html',
  styleUrls: ['./period-cap-rule-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodCapRuleHeaderComponent {}

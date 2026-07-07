// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Table header for the calendar selection settings list.
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-calendar-selection-header',
  templateUrl: './calendar-selection-header.component.html',
  styleUrls: ['./calendar-selection-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarSelectionHeaderComponent {
}

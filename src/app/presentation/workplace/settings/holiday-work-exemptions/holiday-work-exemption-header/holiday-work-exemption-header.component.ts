// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-holiday-work-exemption-header',
  templateUrl: './holiday-work-exemption-header.component.html',
  styleUrls: ['./holiday-work-exemption-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayWorkExemptionHeaderComponent {
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-scheduling-rule-header',
  templateUrl: './scheduling-rule-header.component.html',
  styleUrls: ['./scheduling-rule-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulingRuleHeaderComponent {
}

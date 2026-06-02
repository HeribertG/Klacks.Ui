// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Header row for the qualifications settings list showing the emoji and name column labels.
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-qualifications-header',
  templateUrl: './qualifications-header.component.html',
  styleUrls: ['./qualifications-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualificationsHeaderComponent {
}

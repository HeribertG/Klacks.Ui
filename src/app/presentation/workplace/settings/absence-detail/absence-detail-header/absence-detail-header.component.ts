// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-absence-detail-header',
  templateUrl: './absence-detail-header.component.html',
  styleUrls: ['./absence-detail-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
})
export class AbsenceDetailHeaderComponent {
  public translate = inject(TranslateService);
}

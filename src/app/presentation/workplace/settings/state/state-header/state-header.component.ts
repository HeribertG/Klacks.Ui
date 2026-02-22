// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-state-header',
  templateUrl: './state-header.component.html',
  styleUrls: ['./state-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
})
export class StateHeaderComponent {
  public translate = inject(TranslateService);
}

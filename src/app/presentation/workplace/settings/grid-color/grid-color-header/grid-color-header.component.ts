// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-grid-color-header',
  templateUrl: './grid-color-header.component.html',
  styleUrls: ['./grid-color-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
})
export class GridColorHeaderComponent {
  public translate = inject(TranslateService);
}

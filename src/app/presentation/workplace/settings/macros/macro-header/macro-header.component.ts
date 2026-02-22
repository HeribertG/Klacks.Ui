// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-macro-header',
  templateUrl: './macro-header.component.html',
  styleUrls: ['./macro-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
})
export class MacroHeaderComponent {
  public translate = inject(TranslateService);
}

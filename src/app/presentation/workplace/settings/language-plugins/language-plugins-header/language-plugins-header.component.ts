// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-language-plugins-header',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './language-plugins-header.component.html',
  styleUrls: ['./language-plugins-header.component.scss']
})
export class LanguagePluginsHeaderComponent {
  translate = inject(TranslateService);
}

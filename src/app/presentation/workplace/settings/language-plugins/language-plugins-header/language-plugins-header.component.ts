// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-language-plugins-header',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './language-plugins-header.component.html',
  styleUrls: ['./language-plugins-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguagePluginsHeaderComponent {
}

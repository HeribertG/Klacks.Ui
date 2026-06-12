// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-personal-access-tokens-header',
  templateUrl: './personal-access-tokens-header.component.html',
  styleUrls: ['./personal-access-tokens-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalAccessTokensHeaderComponent {
}

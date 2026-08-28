// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-learned-phrases-header',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './learned-phrases-header.component.html',
  styleUrls: ['./learned-phrases-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnedPhrasesHeaderComponent {}

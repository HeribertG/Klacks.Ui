// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-learned-capabilities-header',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './learned-capabilities-header.component.html',
  styleUrls: ['./learned-capabilities-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnedCapabilitiesHeaderComponent {}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-unfulfillable-wishes-header',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './unfulfillable-wishes-header.component.html',
  styleUrls: ['./unfulfillable-wishes-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnfulfillableWishesHeaderComponent {}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-user-administration-header',
  templateUrl: './user-administration-header.component.html',
  styleUrls: ['./user-administration-header.component.scss'],
  standalone: true,
  imports: [TranslateModule, NgbModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAdministrationHeaderComponent {
}

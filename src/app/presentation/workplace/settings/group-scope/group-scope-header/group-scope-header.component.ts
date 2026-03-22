// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-group-scope-header',
  imports: [TranslateModule],
  templateUrl: './group-scope-header.component.html',
  styleUrl: './group-scope-header.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupScopeHeaderComponent {
}

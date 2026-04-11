// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-audit-tab',
  standalone: true,
  imports: [TranslateModule],
  template: `<div class="tab-content">{{ 'periodClosing.tabs.audit' | translate }}</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditTabComponent {}

import { Component, inject } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-scheduling-rule-header',
  templateUrl: './scheduling-rule-header.component.html',
  styleUrls: ['./scheduling-rule-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
})
export class SchedulingRuleHeaderComponent {
  public translate = inject(TranslateService);
}

import { Component, inject } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-break-context-header',
  templateUrl: './break-context-header.component.html',
  styleUrls: ['./break-context-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
})
export class BreakContextHeaderComponent {
  public translate = inject(TranslateService);
}

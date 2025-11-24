import { Component, inject } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-branches-header',
  templateUrl: './branches-header.component.html',
  styleUrls: ['./branches-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
})
export class BranchesHeaderComponent {
  public translate = inject(TranslateService);
}

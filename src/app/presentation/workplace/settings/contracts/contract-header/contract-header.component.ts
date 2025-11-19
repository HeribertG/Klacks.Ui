import { Component, inject } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-contract-header',
  templateUrl: './contract-header.component.html',
  styleUrls: ['./contract-header.component.scss'],
  standalone: true,
  imports: [TranslateModule],
})
export class ContractHeaderComponent {
  public translate = inject(TranslateService);
}
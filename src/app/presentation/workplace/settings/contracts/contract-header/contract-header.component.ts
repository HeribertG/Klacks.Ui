import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-contract-header',
  templateUrl: './contract-header.component.html',
  styleUrls: ['./contract-header.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
})
export class ContractHeaderComponent {
  public translate = inject(TranslateService);
}
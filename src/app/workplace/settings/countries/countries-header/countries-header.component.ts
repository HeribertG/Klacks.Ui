import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-countries-header',
  templateUrl: './countries-header.component.html',
  styleUrls: ['./countries-header.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
})
export class CountriesHeaderComponent {
  public translate = inject(TranslateService);
}

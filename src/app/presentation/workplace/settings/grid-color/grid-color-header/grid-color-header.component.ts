import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-grid-color-header',
  templateUrl: './grid-color-header.component.html',
  styleUrls: ['./grid-color-header.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
})
export class GridColorHeaderComponent {
  public translate = inject(TranslateService);
}

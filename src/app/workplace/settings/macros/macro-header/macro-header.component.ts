import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-macro-header',
  templateUrl: './macro-header.component.html',
  styleUrls: ['./macro-header.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
})
export class MacroHeaderComponent {
  public translate = inject(TranslateService);
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-state-header',
  templateUrl: './state-header.component.html',
  styleUrls: ['./state-header.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
})
export class StateHeaderComponent {
  public translate = inject(TranslateService);
}

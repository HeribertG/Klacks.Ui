import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-llm-providers-header',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './llm-providers-header.component.html',
  styleUrls: ['./llm-providers-header.component.scss']
})
export class LLMProvidersHeaderComponent {
  public translate = inject(TranslateService);
}
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-llm-models-header',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './llm-models-header.component.html',
  styleUrls: ['./llm-models-header.component.scss']
})
export class LLMModelsHeaderComponent {
  constructor(public translate: TranslateService) {}
}
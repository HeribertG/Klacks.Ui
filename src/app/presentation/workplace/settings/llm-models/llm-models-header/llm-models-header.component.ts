// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-llm-models-header',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './llm-models-header.component.html',
  styleUrls: ['./llm-models-header.component.scss']
})
export class LLMModelsHeaderComponent {
  translate = inject(TranslateService);
}
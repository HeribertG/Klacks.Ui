// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-llm-providers-header',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './llm-providers-header.component.html',
  styleUrls: ['./llm-providers-header.component.scss']
})
export class LLMProvidersHeaderComponent {
  public translate = inject(TranslateService);
}
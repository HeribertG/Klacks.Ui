// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-llm-models-header',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './llm-models-header.component.html',
  styleUrls: ['./llm-models-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LLMModelsHeaderComponent {
}
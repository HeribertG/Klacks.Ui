// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-llm-providers-header',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './llm-providers-header.component.html',
  styleUrls: ['./llm-providers-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LLMProvidersHeaderComponent {
}
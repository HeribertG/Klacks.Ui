// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Column header for the LLM sync log card: Date, Provider, New, Failed, Deactivated.
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-llm-sync-log-header',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './llm-sync-log-header.component.html',
  styleUrls: ['./llm-sync-log-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LlmSyncLogHeaderComponent {}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Expandable row showing one sync run summary and per-model test results.
 * @param data - The sync log entry to display
 */
import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ILLMSyncLogEntry } from 'src/app/domain/models/assistant/llm-sync-log.interface';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';

@Component({
  selector: 'app-llm-sync-log-row',
  standalone: true,
  imports: [TranslateModule, IconAngleDownComponent, IconAngleRightComponent],
  templateUrl: './llm-sync-log-row.component.html',
  styleUrls: ['./llm-sync-log-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LlmSyncLogRowComponent {
  readonly data = input.required<ILLMSyncLogEntry>();

  protected isExpanded = signal(false);

  toggleExpand(): void {
    this.isExpanded.update(v => !v);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}

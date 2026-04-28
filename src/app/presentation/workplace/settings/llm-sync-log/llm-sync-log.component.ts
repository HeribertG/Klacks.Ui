// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Read-only settings card showing the full LLM model sync history with per-model test results.
 * Loads all sync notifications on init and displays them in reverse chronological order.
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DataSyncLogService } from 'src/app/infrastructure/api/assistant/data-sync-log.service';
import { ILLMSyncLogEntry } from 'src/app/domain/models/assistant/llm-sync-log.interface';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { LlmSyncLogHeaderComponent } from './llm-sync-log-header/llm-sync-log-header.component';
import { LlmSyncLogRowComponent } from './llm-sync-log-row/llm-sync-log-row.component';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-llm-sync-log',
  standalone: true,
  imports: [
    TranslateModule,
    SpinnerModule,
    SettingsListCardComponent,
    LlmSyncLogHeaderComponent,
    LlmSyncLogRowComponent,
  ],
  templateUrl: './llm-sync-log.component.html',
  styleUrls: ['./llm-sync-log.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LlmSyncLogComponent implements OnInit {
  private readonly syncLogService = inject(DataSyncLogService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected entries = signal<ILLMSyncLogEntry[]>([]);
  protected isLoading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.syncLogService.getHistory());
      this.entries.set(data);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }
}

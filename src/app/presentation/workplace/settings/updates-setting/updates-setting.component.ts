// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Admin Updates card: shows current/available version, recent operation history, lets the admin
 * configure auto-update behaviour and trigger an update or rollback.
 * @param status - Current version and active/last operation state
 * @param config - Auto-update configuration (channel, schedule, retention)
 * @param history - Recent update operation history
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { DataManagementUpdateService } from 'src/app/domain/services/update/data-management-update.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import {
  IUpdateConfig,
  IUpdateHistoryItem,
  IUpdateStatus,
} from 'src/app/infrastructure/api/settings/data-update.service';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { IconRefreshGreyComponent } from 'src/app/presentation/icons/icon-refresh-grey.component';
import {
  DataWhisperPluginService,
  WhisperModelAlias,
  WhisperOperationTypes,
} from 'src/app/infrastructure/api/assistant/data-whisper-plugin.service';

const UPDATE_CHANNELS = ['Stable', 'Beta'];
const CONTINUABLE_HISTORY_STATUSES = ['Pending', 'Failed', 'Cancelled', 'RollbackFailed'];
const RETRYABLE_OPERATION_TYPES = [
  'Update',
  'Rollback',
  WhisperOperationTypes.Install,
  WhisperOperationTypes.Uninstall,
];
const DELETE_BLOCKED_MESSAGE_KEY = 'settings.updates.history.delete.blocked';

@Component({
  selector: 'app-updates-setting',
  templateUrl: './updates-setting.component.html',
  styleUrls: ['./updates-setting.component.scss'],
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TranslateModule,
    NgbModule,
    TimeInputComponent,
    TrashIconRedComponent,
    IconRefreshGreyComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdatesSettingComponent implements OnInit, OnDestroy {
  private dataUpdateService = inject(DataManagementUpdateService);
  private settingsService = inject(DataManagementSettingsService);
  private dataWhisperPluginService = inject(DataWhisperPluginService);
  private destroy$ = new Subject<void>();

  public readonly channels = UPDATE_CHANNELS;
  public status = signal<IUpdateStatus | null>(null);
  public history = signal<IUpdateHistoryItem[]>([]);
  public config = signal<IUpdateConfig | null>(null);
  public busy = signal(false);
  public actionMessage = signal<string>('');

  constructor() {
    // Mirror the centrally-loaded auto-update config into the local form model. Persistence runs
    // through AppSettingsManagementService (Settings table, auto-save) like every other setting.
    effect(() => {
      const c = this.settingsService.appSettings.updateConfigSettings();
      this.config.set({ ...c });
    });
  }

  ngOnInit(): void {
    this.reload();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public reload(): void {
    this.dataUpdateService.getStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(s => this.status.set(s));
    this.dataUpdateService.getHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe(h => this.history.set(h));
  }

  public async triggerNow(): Promise<void> {
    await this.runAction(() => firstValueFrom(this.dataUpdateService.triggerUpdate()));
  }

  public async rollback(): Promise<void> {
    await this.runAction(() => firstValueFrom(this.dataUpdateService.rollbackUpdate()));
  }

  public canContinueHistoryEntry(item: IUpdateHistoryItem): boolean {
    return CONTINUABLE_HISTORY_STATUSES.includes(item.status) && RETRYABLE_OPERATION_TYPES.includes(item.operationType);
  }

  public async deleteHistoryEntry(item: IUpdateHistoryItem): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(this.dataUpdateService.deleteHistoryEntry(item.id));
      this.actionMessage.set('');
      this.reload();
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict) {
        this.actionMessage.set(DELETE_BLOCKED_MESSAGE_KEY);
        return;
      }
      throw error;
    } finally {
      this.busy.set(false);
    }
  }

  public async continueHistoryEntry(item: IUpdateHistoryItem): Promise<void> {
    this.busy.set(true);
    try {
      if (item.status === 'Pending') {
        // The single-active-operation guard on the backend treats this row itself as the active
        // operation, so re-enqueuing without removing it first would always be rejected.
        await firstValueFrom(this.dataUpdateService.deleteHistoryEntry(item.id));
      }
      const result = await this.reissue(item);
      this.actionMessage.set(result.reason);
    } finally {
      this.busy.set(false);
      this.reload();
    }
  }

  private reissue(item: IUpdateHistoryItem): Promise<{ reason: string }> {
    switch (item.operationType) {
      case 'Rollback':
        return firstValueFrom(this.dataUpdateService.rollbackUpdate());
      case WhisperOperationTypes.Install:
        return this.dataWhisperPluginService.install(item.targetVersion as WhisperModelAlias);
      case WhisperOperationTypes.Uninstall:
        return this.dataWhisperPluginService.uninstall();
      default:
        return firstValueFrom(this.dataUpdateService.triggerUpdate());
    }
  }

  public onConfigChange(): void {
    const current = this.config();
    if (current) {
      this.settingsService.appSettings.updateConfigSettings.set({ ...current });
      this.settingsService.settingsChangeTrigger.update(v => v + 1);
    }
  }

  public parseTime(str: string): OwnTime {
    const parts = (str || '00:00').split(':');
    return OwnTime.forTime(parts[0] ?? '00', parts[1] ?? '00');
  }

  public onWindowStartChange(time: OwnTime): void {
    const c = this.config();
    if (!c) return;
    c.maintenanceWindowStart = `${time.hours.padStart(2, '0')}:${time.minutes.padStart(2, '0')}`;
    this.onConfigChange();
  }

  public onWindowEndChange(time: OwnTime): void {
    const c = this.config();
    if (!c) return;
    c.maintenanceWindowEnd = `${time.hours.padStart(2, '0')}:${time.minutes.padStart(2, '0')}`;
    this.onConfigChange();
  }

  private async runAction(action: () => Promise<{ reason: string }>): Promise<void> {
    this.busy.set(true);
    try {
      const result = await action();
      this.actionMessage.set(result.reason);
      this.reload();
    } finally {
      this.busy.set(false);
    }
  }
}

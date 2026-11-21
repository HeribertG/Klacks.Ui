// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Admin Updates card: shows current/available version, recent operation history, lets the admin
 * configure auto-update behaviour and trigger an update or rollback. History rows that no updater
 * ever claimed are flagged as waiting for the update service instead of showing a bare Pending. The database engine
 * section shows the PostgreSQL major in use and, when a newer one is offered, starts the engine upgrade after a
 * confirmation, or explains why it cannot start yet. A running engine upgrade has no active operation in the status
 * (only the OperationInProgress reason), so it locks the card's actions just like an active normal operation.
 * @param status - Current version and active/last operation state
 * @param config - Auto-update configuration (channel, schedule, retention)
 * @param history - Recent update operation history
 * @param engineMessage - Translation key of the outcome of the last engine upgrade start
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { DataManagementUpdateService } from 'src/app/domain/services/update/data-management-update.service';
import { UpdateQueueHealthService } from 'src/app/domain/services/update/update-queue-health.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { IUpdateConfig } from 'src/app/domain/models/settings/update-config.interface';
import { IUpdateHistoryItem } from 'src/app/domain/models/settings/update-history-item.interface';
import { IUpdateStatus } from 'src/app/domain/models/settings/update-status.interface';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { IconRefreshGreyComponent } from 'src/app/presentation/icons/icon-refresh-grey.component';
import { WhisperOperationTypes } from 'src/app/domain/constants/whisper-operation.constants';
import { WhisperModelAlias } from 'src/app/domain/models/assistant/whisper-model-alias.type';
import { EngineUpgradeBlockedReason } from 'src/app/domain/models/settings/engine-upgrade-blocked-reason.enum';
import { IEngineUpgradeTriggerResult } from 'src/app/domain/models/settings/engine-upgrade-trigger-result.interface';
import {
  ENGINE_UPGRADE_KEYS,
  ENGINE_UPGRADE_MAJOR_PARAM,
  ENGINE_UPGRADE_REASON_KEYS,
  ENGINE_UP_TO_DATE_REASONS,
} from 'src/app/domain/constants/engine-upgrade.constants';
import { playgroundHttpErrorI18nKey } from 'src/app/domain/helpers/playground-token-limit.helper';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';

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
  private queueHealth = inject(UpdateQueueHealthService);
  private modalService = inject(ModalService);
  private translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  public readonly channels = UPDATE_CHANNELS;
  public status = signal<IUpdateStatus | null>(null);
  public history = signal<IUpdateHistoryItem[]>([]);
  public config = signal<IUpdateConfig | null>(null);
  public busy = signal(false);
  public actionMessage = signal<string>('');
  public engineMessage = signal<string>('');
  public readonly engineKeys = ENGINE_UPGRADE_KEYS;
  public readonly engineUpgradeOffered = computed(() => {
    const s = this.status();
    if (!s || s.availableMajor === null || s.availableMajor <= s.currentMajor) {
      return false;
    }
    return s.engineUpgradeBlockedReason === null || !ENGINE_UP_TO_DATE_REASONS.includes(s.engineUpgradeBlockedReason);
  });
  public readonly engineUpgradeRunning = computed(() => {
    const s = this.status();
    return !!s && !s.activeOperation && s.engineUpgradeBlockedReason === EngineUpgradeBlockedReason.OperationInProgress;
  });
  public readonly hasActiveOperation = computed(() => !!this.status()?.activeOperation || this.engineUpgradeRunning());
  public readonly actionsLocked = computed(() => this.busy() || this.hasActiveOperation());
  public readonly engineMajorParams = computed(() => ({ [ENGINE_UPGRADE_MAJOR_PARAM]: this.status()?.availableMajor }));
  public readonly engineBlockedReasonKey = computed(() => {
    const reason = this.status()?.engineUpgradeBlockedReason;
    return reason ? (ENGINE_UPGRADE_REASON_KEYS[reason] ?? '') : '';
  });

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

  public requestEngineUpgrade(): void {
    if (!this.engineUpgradeOffered()) {
      return;
    }
    const params = this.engineMajorParams();
    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translate.instant(ENGINE_UPGRADE_KEYS.CONFIRM_TITLE, params),
      message: this.translate.instant(ENGINE_UPGRADE_KEYS.CONFIRM_MESSAGE, params),
      confirmText: this.translate.instant(ENGINE_UPGRADE_KEYS.CONFIRM_ACTION),
      cancelText: this.translate.instant(ENGINE_UPGRADE_KEYS.CANCEL),
      onConfirm: () => void this.startEngineUpgrade(),
    });
  }

  private async startEngineUpgrade(): Promise<void> {
    this.busy.set(true);
    try {
      const result = await firstValueFrom(this.dataUpdateService.startEngineUpgrade());
      this.engineMessage.set(this.engineResultKey(result));
    } catch (error) {
      this.engineMessage.set(this.engineErrorKey(error));
    } finally {
      this.busy.set(false);
      this.reload();
    }
  }

  private engineResultKey(result: IEngineUpgradeTriggerResult): string {
    if (result.enqueued) {
      return ENGINE_UPGRADE_KEYS.ENQUEUED;
    }
    return (result.blockedReason && ENGINE_UPGRADE_REASON_KEYS[result.blockedReason]) || ENGINE_UPGRADE_KEYS.FAILED;
  }

  private engineErrorKey(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return playgroundHttpErrorI18nKey(error.status, error.error?.errorCode) ?? ENGINE_UPGRADE_KEYS.FAILED;
    }
    return ENGINE_UPGRADE_KEYS.FAILED;
  }

  public isAwaitingUpdater(item: IUpdateHistoryItem): boolean {
    return this.queueHealth.isAwaitingUpdater(item);
  }

  public canContinueHistoryEntry(item: IUpdateHistoryItem): boolean {
    if (this.isAwaitingUpdater(item)) {
      return false;
    }

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
        return this.dataUpdateService.installWhisperPlugin(item.targetVersion as WhisperModelAlias);
      case WhisperOperationTypes.Uninstall:
        return this.dataUpdateService.uninstallWhisperPlugin();
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

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Admin card for the self-hosted Whisper speech recognition plugin: shows install state,
 * lets the admin pick a model, install, switch the model or uninstall, and polls while
 * an operation runs on the updater queue.
 * @param status - Current plugin state including active/last operation
 * @param selectedModel - Model alias chosen via the radio buttons
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  DataWhisperPluginService,
  WhisperModelAlias,
  WhisperModelAliases,
  WhisperOperationResult,
  WhisperOperationStatuses,
  WhisperOperationTypes,
  WhisperPluginStatus,
} from 'src/app/infrastructure/api/assistant/data-whisper-plugin.service';

const POLL_INTERVAL_MS = 5000;

interface WhisperModelOption {
  value: WhisperModelAlias;
  labelKey: string;
  hintKey: string;
}

@Component({
  selector: 'app-whisper-plugin-setting',
  templateUrl: './whisper-plugin-setting.component.html',
  styleUrls: ['./whisper-plugin-setting.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhisperPluginSettingComponent implements OnInit, OnDestroy {
  private dataWhisperPluginService = inject(DataWhisperPluginService);

  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private modelSyncedFromStatus = false;

  public readonly OperationTypes = WhisperOperationTypes;
  public readonly OperationStatuses = WhisperOperationStatuses;

  public readonly modelOptions: WhisperModelOption[] = [
    {
      value: WhisperModelAliases.Small,
      labelKey: 'setting.speech.whisper-plugin.model-small',
      hintKey: 'setting.speech.whisper-plugin.model-small-hint',
    },
    {
      value: WhisperModelAliases.LargeV3Turbo,
      labelKey: 'setting.speech.whisper-plugin.model-large',
      hintKey: 'setting.speech.whisper-plugin.model-large-hint',
    },
  ];

  public status = signal<WhisperPluginStatus | null>(null);
  public busy = signal(false);
  public actionMessage = signal<string>('');
  public selectedModel = signal<WhisperModelAlias>(WhisperModelAliases.LargeV3Turbo);

  public readonly actionsDisabled = computed(() => {
    const s = this.status();
    return this.busy() || !s || !!s.activeOperation || s.otherOperationActive;
  });

  public readonly canSwitchModel = computed(() => {
    const s = this.status();
    return !!s?.installed && s.modelAlias !== this.selectedModel();
  });

  ngOnInit(): void {
    this.reload();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  public async reload(): Promise<void> {
    const status = await this.dataWhisperPluginService.getStatus();
    this.status.set(status);
    this.syncSelectedModel(status);

    if (status?.activeOperation) {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  public async install(): Promise<void> {
    await this.runAction(() => this.dataWhisperPluginService.install(this.selectedModel()));
  }

  public async uninstall(): Promise<void> {
    await this.runAction(() => this.dataWhisperPluginService.uninstall());
  }

  public onModelSelected(model: WhisperModelAlias): void {
    this.selectedModel.set(model);
  }

  private async runAction(action: () => Promise<WhisperOperationResult>): Promise<void> {
    this.busy.set(true);
    try {
      const result = await action();
      this.actionMessage.set(result.reason);
      await this.reload();
    } finally {
      this.busy.set(false);
    }
  }

  private syncSelectedModel(status: WhisperPluginStatus | null): void {
    if (this.modelSyncedFromStatus || !status?.installed || !status.modelAlias) {
      return;
    }
    const known = this.modelOptions.find((o) => o.value === status.modelAlias);
    if (known) {
      this.selectedModel.set(known.value);
    }
    this.modelSyncedFromStatus = true;
  }

  private startPolling(): void {
    if (this.pollHandle !== null) {
      return;
    }
    this.pollHandle = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  private async poll(): Promise<void> {
    const status = await this.dataWhisperPluginService.getStatus();
    this.status.set(status);
    if (!status?.activeOperation) {
      this.stopPolling();
    }
  }
}

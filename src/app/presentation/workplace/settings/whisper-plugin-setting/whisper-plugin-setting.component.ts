// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Admin card for the local speech recognition plugin (Parakeet / Whisper): shows install state, lets the admin pick
 * an engine, install, switch or uninstall. State, polling and the queue actions live in LocalSttEngineService,
 * which this card shares with the speech settings. Engines the installation cannot run are not offered.
 * @param selectedModel - Engine alias chosen via the radio buttons; preselected from the installed engine, otherwise
 *   from the installation default (LocalSttEngineService.defaultAlias) unless the admin already picked one
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
import { LocalSttStatusComponent } from '../local-stt-status/local-stt-status.component';
import { LocalSttEngineService } from 'src/app/domain/services/speech/local-stt-engine.service';
import { WhisperOperationStatuses } from 'src/app/domain/constants/whisper-operation.constants';
import { WhisperModelAlias } from 'src/app/domain/models/assistant/whisper-model-alias.type';
import { WhisperModelAliases } from 'src/app/domain/constants/whisper-model-aliases.constants';
import { LocalSttEngineNames } from 'src/app/domain/constants/local-stt-plugin.constants';
import { WhisperModelOption } from './whisper-model-option.interface';

@Component({
  selector: 'app-whisper-plugin-setting',
  templateUrl: './whisper-plugin-setting.component.html',
  styleUrls: ['./whisper-plugin-setting.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, LocalSttStatusComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { tabindex: '-1' },
})
export class WhisperPluginSettingComponent implements OnInit, OnDestroy {
  public readonly localStt = inject(LocalSttEngineService);

  private modelSyncedFromStatus = false;
  private modelChosenByUser = false;

  public readonly engineNames = LocalSttEngineNames;
  public readonly OperationStatuses = WhisperOperationStatuses;

  private readonly allModelOptions: WhisperModelOption[] = [
    {
      value: WhisperModelAliases.Parakeet,
      labelKey: 'setting.speech.whisper-plugin.model-parakeet',
      hintKey: 'setting.speech.whisper-plugin.model-parakeet-hint',
    },
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

  public readonly selectedModel = signal<WhisperModelAlias>(WhisperModelAliases.Parakeet);

  public readonly modelOptions = computed(() => {
    const supported = this.localStt.supportedAliases();
    return this.allModelOptions.filter((option) => supported.includes(option.value));
  });

  public readonly canSwitchModel = computed(
    () => this.localStt.isInstalled() && this.localStt.installedAlias() !== this.selectedModel(),
  );

  public readonly showAttribution = computed(
    () =>
      this.selectedModel() === WhisperModelAliases.Parakeet ||
      this.localStt.installedAlias() === WhisperModelAliases.Parakeet,
  );

  async ngOnInit(): Promise<void> {
    await this.localStt.attach();
    this.syncSelectedModel();
  }

  ngOnDestroy(): void {
    this.localStt.detach();
  }

  public async install(): Promise<void> {
    await this.localStt.install(this.selectedModel());
  }

  public onModelSelected(model: WhisperModelAlias): void {
    this.modelChosenByUser = true;
    this.selectedModel.set(model);
  }

  private syncSelectedModel(): void {
    if (this.modelSyncedFromStatus || this.modelChosenByUser || !this.localStt.status()) {
      return;
    }
    const installed = this.localStt.installedAlias();
    const options = this.modelOptions();
    const known = options.find((option) => option.value === installed);
    if (known) {
      this.selectedModel.set(known.value);
    } else {
      this.selectedModel.set(this.preferredModel(options));
    }
    this.modelSyncedFromStatus = true;
  }

  private preferredModel(options: WhisperModelOption[]): WhisperModelAlias {
    const preferred = this.localStt.defaultAlias();
    if (options.length === 0 || options.some((option) => option.value === preferred)) {
      return preferred;
    }
    return options[0].value;
  }
}

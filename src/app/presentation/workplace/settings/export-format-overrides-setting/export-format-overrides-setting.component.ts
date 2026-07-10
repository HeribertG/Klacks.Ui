// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Admin card for support-driven export format corrections: lets the admin pick an export format,
 * paste a JSON patch provided by support, preview the patched output as a downloadable test file,
 * and enable, update or remove the stored override without deploying an update.
 * @param data - Loaded override list including the current application version
 * @param selectedFormatKey - Format key chosen in the select box
 * @param patchJson - JSON patch text edited in the textarea
 */
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import {
  DataExportFormatOverridesService,
  ExportFormatFamilies,
  ExportFormatFamily,
  IExportFormatOverrideEntry,
  IExportFormatOverridesResponse,
} from 'src/app/infrastructure/api/settings/data-export-format-overrides.service';
import {
  CONTENT_DISPOSITION_HEADER,
  extractFileNameFromContentDisposition,
  triggerBlobDownload,
} from 'src/app/shared/helpers/file-download.helper';

const FAMILY_SORT_ORDER: ExportFormatFamily[] = [
  ExportFormatFamilies.Order,
  ExportFormatFamilies.Payroll,
  ExportFormatFamilies.ClientPeriod,
];

const FAMILY_LABEL_KEYS: Record<ExportFormatFamily, string> = {
  [ExportFormatFamilies.Order]: 'setting.export-format-overrides.family-order',
  [ExportFormatFamilies.Payroll]: 'setting.export-format-overrides.family-payroll',
  [ExportFormatFamilies.ClientPeriod]: 'setting.export-format-overrides.family-clientperiod',
};

const SAVED_MESSAGE_KEY = 'setting.export-format-overrides.saved';
const DELETED_MESSAGE_KEY = 'setting.export-format-overrides.deleted';
const OVERRIDE_ENABLED_MARKER = '● ';
const OVERRIDE_DISABLED_MARKER = '○ ';
const ALLOWED_KEYS_SEPARATOR = ', ';
const DEFAULT_PATCH_JSON = '{}';
const PREVIEW_FILE_PREFIX = 'preview_';
const PREVIEW_FILE_FALLBACK_EXTENSION = '.txt';

interface ExportFormatOption {
  formatKey: string;
  label: string;
}

interface ExportFormatGroup {
  family: ExportFormatFamily;
  labelKey: string;
  options: ExportFormatOption[];
}

interface VersionWarning {
  created: string;
  current: string;
}

@Component({
  selector: 'app-export-format-overrides-setting',
  templateUrl: './export-format-overrides-setting.component.html',
  styleUrls: ['./export-format-overrides-setting.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportFormatOverridesSettingComponent implements OnInit {
  private dataExportFormatOverridesService = inject(DataExportFormatOverridesService);
  private translateService = inject(TranslateService);

  public data = signal<IExportFormatOverridesResponse | null>(null);
  public selectedFormatKey = signal<string>('');
  public patchJson = signal<string>(DEFAULT_PATCH_JSON);
  public note = signal<string>('');
  public isEnabled = signal<boolean>(false);
  public busy = signal(false);
  public actionMessage = signal<string>('');
  public errorMessage = signal<string>('');

  public readonly formatGroups = computed<ExportFormatGroup[]>(() => {
    const data = this.data();
    if (!data) {
      return [];
    }
    return FAMILY_SORT_ORDER.map((family) => ({
      family,
      labelKey: FAMILY_LABEL_KEYS[family],
      options: data.formats
        .filter((format) => format.family === family)
        .sort((a, b) => a.formatKey.localeCompare(b.formatKey))
        .map((format) => ({
          formatKey: format.formatKey,
          label: this.buildOptionLabel(format),
        })),
    })).filter((group) => group.options.length > 0);
  });

  public readonly selectedFormat = computed<IExportFormatOverrideEntry | null>(() => {
    const data = this.data();
    if (!data) {
      return null;
    }
    return data.formats.find((format) => format.formatKey === this.selectedFormatKey()) ?? null;
  });

  public readonly allowedKeysText = computed<string>(
    () => this.selectedFormat()?.allowedKeys.join(ALLOWED_KEYS_SEPARATOR) ?? ''
  );

  public readonly hasOverride = computed<boolean>(() => !!this.selectedFormat()?.override);

  public readonly versionWarning = computed<VersionWarning | null>(() => {
    const data = this.data();
    const override = this.selectedFormat()?.override;
    if (!data || !override || override.createdUnderVersion === data.currentVersion) {
      return null;
    }
    return { created: override.createdUnderVersion, current: data.currentVersion };
  });

  ngOnInit(): void {
    this.reload();
  }

  public async reload(): Promise<void> {
    try {
      const data = await firstValueFrom(this.dataExportFormatOverridesService.getOverrides());
      this.data.set(data);
      const selectionExists = data.formats.some(
        (format) => format.formatKey === this.selectedFormatKey()
      );
      if (!selectionExists) {
        this.selectedFormatKey.set(data.formats[0]?.formatKey ?? '');
      }
      this.syncFormFromSelection();
    } catch (error) {
      this.errorMessage.set(await this.extractErrorMessage(error));
    }
  }

  public onFormatSelected(formatKey: string): void {
    this.selectedFormatKey.set(formatKey);
    this.actionMessage.set('');
    this.errorMessage.set('');
    this.syncFormFromSelection();
  }

  public async save(): Promise<void> {
    const format = this.selectedFormat();
    if (!format) {
      return;
    }
    await this.runAction(async () => {
      await firstValueFrom(
        this.dataExportFormatOverridesService.saveOverride(format.formatKey, {
          patchJson: this.patchJson(),
          isEnabled: this.isEnabled(),
          note: this.normalizedNote(),
        })
      );
      this.actionMessage.set(this.translateService.instant(SAVED_MESSAGE_KEY));
      await this.reload();
    });
  }

  public async removeOverride(): Promise<void> {
    const format = this.selectedFormat();
    if (!format?.override) {
      return;
    }
    await this.runAction(async () => {
      await firstValueFrom(
        this.dataExportFormatOverridesService.deleteOverride(format.formatKey)
      );
      this.actionMessage.set(this.translateService.instant(DELETED_MESSAGE_KEY));
      await this.reload();
    });
  }

  public async downloadPreview(): Promise<void> {
    const format = this.selectedFormat();
    if (!format) {
      return;
    }
    await this.runAction(async () => {
      const response = await firstValueFrom(
        this.dataExportFormatOverridesService.downloadPreview(
          format.formatKey,
          this.previewPatchJson()
        )
      );
      const fileName =
        extractFileNameFromContentDisposition(response.headers.get(CONTENT_DISPOSITION_HEADER)) ??
        `${PREVIEW_FILE_PREFIX}${format.formatKey}${PREVIEW_FILE_FALLBACK_EXTENSION}`;
      if (response.body) {
        triggerBlobDownload(response.body, fileName);
      }
    });
  }

  private async runAction(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.actionMessage.set('');
    this.errorMessage.set('');
    try {
      await action();
    } catch (error) {
      this.errorMessage.set(await this.extractErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private syncFormFromSelection(): void {
    const override = this.selectedFormat()?.override;
    this.patchJson.set(override?.patchJson ?? DEFAULT_PATCH_JSON);
    this.note.set(override?.note ?? '');
    this.isEnabled.set(override?.isEnabled ?? false);
  }

  private buildOptionLabel(format: IExportFormatOverrideEntry): string {
    if (!format.override) {
      return format.formatKey;
    }
    const marker = format.override.isEnabled ? OVERRIDE_ENABLED_MARKER : OVERRIDE_DISABLED_MARKER;
    return `${marker}${format.formatKey}`;
  }

  private normalizedNote(): string | null {
    const note = this.note().trim();
    return note === '' ? null : note;
  }

  private previewPatchJson(): string | null {
    const patch = this.patchJson().trim();
    return patch === '' ? null : this.patchJson();
  }

  private async extractErrorMessage(error: unknown): Promise<string> {
    if (error instanceof HttpErrorResponse) {
      if (error.error instanceof Blob) {
        try {
          const text = await error.error.text();
          return text !== '' ? text : error.message;
        } catch {
          return error.message;
        }
      }
      if (typeof error.error === 'string' && error.error !== '') {
        return error.error;
      }
      const details = error.error as { message?: string; title?: string; detail?: string } | null;
      return details?.message ?? details?.detail ?? details?.title ?? error.message;
    }
    return error instanceof Error ? error.message : String(error);
  }
}

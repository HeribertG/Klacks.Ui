// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Settings card for choosing which optional export formats are offered. The backend groups
 * formats by brand and family: a brand that has both an order variant (Bestellungen) and a
 * payroll variant (Lohn & Gehalt), such as DATEV, is rendered as one parent with two sub
 * checkboxes; every other brand is a single flat checkbox. csv/json/xml are fixed and always
 * enabled; every other format is toggled here and persisted as the comma-separated
 * ENABLED_EXPORT_FORMATS setting. While a DATEV format is enabled, the DATEV consultant and client number
 * inputs are shown; they are validated against their allowed range and stored as number settings (an empty
 * entry clears the value). Changes are saved immediately.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  DATEV_FORMAT_KEY_PREFIX,
  DATEV_NUMBER_FIELD_ORDER,
  DATEV_NUMBER_LABEL_KEY_PREFIX,
  DATEV_NUMBER_RANGES,
  DATEV_NUMBER_SETTING_KEYS,
  DatevNumberErrorKeys,
  DatevNumberField,
  DatevNumberFields,
} from 'src/app/domain/constants/datev-numbers.constants';
import { datevNumberErrorKey, parseDatevNumber } from 'src/app/domain/helpers/datev-number.helper';
import { NumberRange } from 'src/app/domain/models/settings/number-range.interface';
import { ExportFormatResource } from 'src/app/domain/models/settings/export-format-resource.interface';
import { ExportFormatSettingsService } from 'src/app/domain/services/settings/export-format-settings.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { DatevNumberFieldState } from './datev-number-field-state';
import { FormatFamilyView } from './format-family-view';

const FORMAT_LABEL_PREFIX = 'periodClosing.format.';
const ORDER_FAMILY = 'order';
const PAYROLL_FAMILY = 'payroll';

const DATEV_HINT_ID = 'export-formats-setting-datev-hint';
const DATEV_ERROR_ID_PREFIX = 'export-formats-setting-datev-error-';

const EMPTY_DATEV_FIELD: DatevNumberFieldState = { settingId: undefined, draft: '', errorKey: null, savedValue: null };

@Component({
  selector: 'app-export-formats-setting',
  templateUrl: './export-formats-setting.component.html',
  styleUrls: ['./export-formats-setting.component.scss'],
  standalone: true,
  imports: [TranslateModule, SettingsListCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportFormatsSettingComponent implements OnInit {
  private exportFormatSettings = inject(ExportFormatSettingsService);
  private toastShowService = inject(ToastShowService);
  private translate = inject(TranslateService);

  public isDataLoaded = signal<boolean>(false);
  public formats = signal<ExportFormatResource[]>([]);
  private settingId = signal<string | undefined>(undefined);

  public readonly datevFields = DATEV_NUMBER_FIELD_ORDER;
  public datevNumbers = signal<Record<DatevNumberField, DatevNumberFieldState>>({
    [DatevNumberFields.Consultant]: EMPTY_DATEV_FIELD,
    [DatevNumberFields.Client]: EMPTY_DATEV_FIELD,
  });
  public datevSaving = signal<Record<DatevNumberField, boolean>>({
    [DatevNumberFields.Consultant]: false,
    [DatevNumberFields.Client]: false,
  });
  private queuedDatevCommits = new Set<DatevNumberField>();

  public datevEnabled = computed(() =>
    this.formats().some((f) => f.enabled && f.key.startsWith(DATEV_FORMAT_KEY_PREFIX)),
  );

  public families = computed<FormatFamilyView[]>(() => {
    const byBrand = new Map<string, ExportFormatResource[]>();
    for (const format of this.formats()) {
      const members = byBrand.get(format.brand) ?? [];
      members.push(format);
      byBrand.set(format.brand, members);
    }

    const views: FormatFamilyView[] = [];
    byBrand.forEach((members, brand) => {
      const orders = members.find((m) => m.family === ORDER_FAMILY);
      const payroll = members.find((m) => m.family === PAYROLL_FAMILY);
      const isGroup = !!orders && !!payroll;
      views.push({ brand, orders, payroll, isGroup, single: isGroup ? undefined : members[0] });
    });
    return views;
  });

  ngOnInit(): void {
    this.exportFormatSettings.readEnabledFormatsSettingId().subscribe((id) => this.settingId.set(id));

    this.loadDatevNumbers();

    this.exportFormatSettings.getFormats().subscribe({
      next: (list) => {
        this.formats.set(list);
        this.isDataLoaded.set(true);
      },
      error: () => this.isDataLoaded.set(true),
    });
  }

  labelKey(key: string): string {
    return `${FORMAT_LABEL_PREFIX}${key}`;
  }

  toggle(format: ExportFormatResource): void {
    if (format.fixed) {
      return;
    }
    this.formats.update((list) =>
      list.map((f) => (f.key === format.key ? { ...f, enabled: !f.enabled } : f)),
    );
    this.save();
  }

  groupChecked(view: FormatFamilyView): boolean {
    const slots = [view.orders, view.payroll].filter(
      (f): f is ExportFormatResource => !!f,
    );
    return slots.length > 0 && slots.every((f) => f.enabled);
  }

  toggleGroup(view: FormatFamilyView): void {
    const next = !this.groupChecked(view);
    const keys = [view.orders?.key, view.payroll?.key].filter((k): k is string => !!k);
    this.formats.update((list) =>
      list.map((f) => (keys.includes(f.key) ? { ...f, enabled: next } : f)),
    );
    this.save();
  }

  datevLabelKey(field: DatevNumberField): string {
    return `${DATEV_NUMBER_LABEL_KEY_PREFIX}${field}`;
  }

  datevRange(field: DatevNumberField): NumberRange {
    return DATEV_NUMBER_RANGES[field];
  }

  onDatevInput(field: DatevNumberField, event: Event): void {
    const input = event.target as HTMLInputElement;
    const errorKey = datevNumberErrorKey(input.value, DATEV_NUMBER_RANGES[field], input.validity.badInput);
    this.patchDatevField(field, { draft: input.value, errorKey });
  }

  datevErrorId(field: DatevNumberField): string {
    return `${DATEV_ERROR_ID_PREFIX}${field}`;
  }

  datevDescribedBy(field: DatevNumberField): string {
    return this.datevNumbers()[field].errorKey ? `${DATEV_HINT_ID} ${this.datevErrorId(field)}` : DATEV_HINT_ID;
  }

  onDatevCommit(field: DatevNumberField): void {
    if (this.datevSaving()[field]) {
      this.queuedDatevCommits.add(field);
      return;
    }
    const state = this.datevNumbers()[field];
    const retrying = state.errorKey === DatevNumberErrorKeys.SaveFailed;
    if (state.errorKey && !retrying) {
      return;
    }
    const value = parseDatevNumber(state.draft);
    if (!retrying && value === state.savedValue) {
      return;
    }
    this.queuedDatevCommits.delete(field);
    this.patchDatevField(field, { errorKey: null });
    this.setDatevSaving(field, true);
    this.exportFormatSettings
      .saveNumberSetting(DATEV_NUMBER_SETTING_KEYS[field], state.settingId, value)
      .subscribe({
        next: (saved) => {
          this.patchDatevField(field, { settingId: saved.id ?? state.settingId, savedValue: value });
          this.setDatevSaving(field, false);
          this.toastShowService.showSuccess(
            this.translate.instant('settings.exportFormats.saved'),
            this.translate.instant('settings.exportFormats.title'),
          );
          if (this.queuedDatevCommits.delete(field)) {
            this.onDatevCommit(field);
          }
        },
        error: () => {
          this.queuedDatevCommits.delete(field);
          this.patchDatevField(field, { errorKey: DatevNumberErrorKeys.SaveFailed });
          this.setDatevSaving(field, false);
        },
      });
  }

  private loadDatevNumbers(): void {
    for (const field of DATEV_NUMBER_FIELD_ORDER) {
      this.exportFormatSettings.readDatevNumberSetting(DATEV_NUMBER_SETTING_KEYS[field]).subscribe((state) => {
        this.patchDatevField(field, {
          settingId: state.id,
          draft: state.value === null ? '' : String(state.value),
          savedValue: state.value,
        });
      });
    }
  }

  private patchDatevField(field: DatevNumberField, patch: Partial<DatevNumberFieldState>): void {
    this.datevNumbers.update((all) => ({ ...all, [field]: { ...all[field], ...patch } }));
  }

  private setDatevSaving(field: DatevNumberField, saving: boolean): void {
    this.datevSaving.update((all) => ({ ...all, [field]: saving }));
  }

  private save(): void {
    this.exportFormatSettings.saveEnabledFormats(this.formats(), this.settingId()).subscribe({
      next: (saved) => {
        this.settingId.set(saved.id);
        this.toastShowService.showSuccess(
          this.translate.instant('settings.exportFormats.saved'),
          this.translate.instant('settings.exportFormats.title'),
        );
      },
      error: (err) => {
        const msg: string = err?.error?.message ?? err?.message ?? 'Error';
        this.toastShowService.showError(msg);
      },
    });
  }
}

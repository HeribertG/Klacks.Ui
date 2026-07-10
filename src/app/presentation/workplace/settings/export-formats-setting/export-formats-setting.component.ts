// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for choosing which optional export formats are offered. The backend groups
 * formats by brand and family: a brand that has both an order variant (Bestellungen) and a
 * payroll variant (Lohn & Gehalt), such as DATEV, is rendered as one parent with two sub
 * checkboxes; every other brand is a single flat checkbox. csv/json/xml are fixed and always
 * enabled; every other format is toggled here and persisted as the comma-separated
 * ENABLED_EXPORT_FORMATS setting. Changes are saved immediately.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataExportFormatsService } from 'src/app/infrastructure/api/period-closing/data-export-formats.service';
import { ExportFormatResource } from 'src/app/infrastructure/api/period-closing/models/export-format-resource';
import { DataSettingsVariousService } from 'src/app/infrastructure/api/settings/data-settings-various.service';
import { ISetting } from 'src/app/domain/models/settings/settings-various-class';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { FormatFamilyView } from './format-family-view';

const ENABLED_EXPORT_FORMATS_KEY = 'ENABLED_EXPORT_FORMATS';
const FORMAT_LABEL_PREFIX = 'periodClosing.format.';
const FORMAT_SEPARATOR = ',';
const ORDER_FAMILY = 'order';
const PAYROLL_FAMILY = 'payroll';

@Component({
  selector: 'app-export-formats-setting',
  templateUrl: './export-formats-setting.component.html',
  styleUrls: ['./export-formats-setting.component.scss'],
  standalone: true,
  imports: [TranslateModule, SettingsListCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportFormatsSettingComponent implements OnInit {
  private formatsApi = inject(DataExportFormatsService);
  private settingsApi = inject(DataSettingsVariousService);
  private toastShowService = inject(ToastShowService);
  private translate = inject(TranslateService);

  public isDataLoaded = signal<boolean>(false);
  public formats = signal<ExportFormatResource[]>([]);
  private settingId = signal<string | undefined>(undefined);

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
    this.settingsApi.readSetting(ENABLED_EXPORT_FORMATS_KEY).subscribe({
      next: (setting) => this.settingId.set(setting?.id),
      error: () => this.settingId.set(undefined),
    });

    this.formatsApi.getFormats().subscribe({
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

  private save(): void {
    const value = this.formats()
      .filter((f) => !f.fixed && f.enabled)
      .map((f) => f.key)
      .join(FORMAT_SEPARATOR);

    const setting: ISetting = { id: this.settingId(), type: ENABLED_EXPORT_FORMATS_KEY, value };
    const request$ = this.settingId()
      ? this.settingsApi.updateSetting(setting)
      : this.settingsApi.addSetting(setting);

    request$.subscribe({
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

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * History tab of one report row: loads the stored snapshots of the template and copies one back
 * into the editor.
 * @param version - Snapshot shown in or restored from the history list
 */

import { ChangeDetectorRef, Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LocaleService } from 'src/app/application/services/locale.service';
import { formatCompanyInstant } from 'src/app/domain/helpers/company-date-time.formatter';
import { companyTimeZone } from 'src/app/domain/helpers/calendar-date.helper';
import { ReportTemplateVersion } from 'src/app/domain/models/report/report-template-version.interface';
import { DataManagementReportService } from 'src/app/domain/services/report/data-management-report.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { REPORT_TOAST_NAME } from '../report-row.constants';
import { ReportRowEditorStateService } from './report-row-editor-state.service';

@Injectable()
export class ReportRowVersionsService {
  private state = inject(ReportRowEditorStateService);
  private dataManagementReportService = inject(DataManagementReportService);
  private localeService = inject(LocaleService);
  private toast = inject(ToastShowService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  readonly isLoadingVersions = signal(false);
  readonly versions = signal<ReportTemplateVersion[]>([]);

  reset(): void {
    this.versions.set([]);
  }

  /**
   * Loads the stored snapshots on demand; the template list does not carry them.
   */
  async loadVersions(): Promise<void> {
    const id = this.state.editTemplate.id;
    if (!id || this.isLoadingVersions()) {
      return;
    }

    this.isLoadingVersions.set(true);
    try {
      this.versions.set(await this.dataManagementReportService.loadTemplateVersions(id));
    } catch {
      this.versions.set([]);
      this.toast.showError(this.translate.instant('setting.report.error.versions'), REPORT_TOAST_NAME);
    } finally {
      this.isLoadingVersions.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Copies a snapshot into the editor. Nothing is stored until the user saves.
   */
  restoreVersion(version: ReportTemplateVersion): void {
    const state = this.state;
    state.editName = version.name;
    state.editOrientation = version.pageSetup?.orientation ?? state.editOrientation;
    state.editPageSize = version.pageSetup?.size ?? state.editPageSize;
    state.editMargins = { ...(version.pageSetup?.margins ?? state.editMargins) };
    state.editTemplate = {
      ...state.editTemplate,
      name: version.name,
      pageSetup: state.buildPageSetup(),
      sections: structuredClone(version.sections ?? []),
    };
    this.toast.showInfo(this.translate.instant('setting.report.versionRestored'), REPORT_TOAST_NAME);
    this.cdr.markForCheck();
  }

  formatVersionDate(version: ReportTemplateVersion): string {
    return formatCompanyInstant(version.savedAt, 'dateTime', this.localeService.getLocale(), companyTimeZone()) ?? '';
  }
}

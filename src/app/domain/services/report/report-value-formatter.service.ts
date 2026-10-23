// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Formats the values every report data provider prints: dates in the user locale, weekdays, labelled summaries and
 * the header bindings shared by all report sources.
 * @param field - Report field whose data binding is resolved
 * @param context - Client, group and period of the page being rendered
 */

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { LOCALE_PROVIDER } from 'src/app/domain/interfaces/locale-provider.interface';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { companyToday } from 'src/app/domain/helpers/calendar-date.helper';
import { formatCalendarDate } from 'src/app/domain/helpers/locale-date-format.helper';
import { ReportField } from 'src/app/domain/models/report/report-field.model';
import { ReportHeaderContext } from './report-header-context.interface';
import { WEEKDAY_LABEL_KEYS } from './report-data-provider.constants';

@Injectable({ providedIn: 'root' })
export class ReportValueFormatterService {
  private translate = inject(TranslateService);
  private localeProvider = inject(LOCALE_PROVIDER);

  currentLanguage(): string {
    return this.translate.currentLang || DomainMessages.DEFAULT_LANG;
  }

  formatDate(dateStr: string | Date | undefined): string {
    if (!dateStr) return '';
    return formatCalendarDate(dateStr, this.localeProvider.getLocale()) ?? String(dateStr);
  }

  resolveWeekday(dayIndex: number): string {
    return this.translate.instant(WEEKDAY_LABEL_KEYS[dayIndex] ?? '');
  }

  translatedWeekdayLabels(): string[] {
    return WEEKDAY_LABEL_KEYS.map(d => this.translate.instant(d));
  }

  translatedLabels(keys: string[]): string[] {
    return keys.map(k => this.translate.instant(k));
  }

  withSummaryLabel(i18nKey: string, body: string): string {
    return body ? `${this.translate.instant(i18nKey)}:\n${body}` : '';
  }

  withInlineLabel(i18nKey: string, value: string): string {
    return value ? `${this.translate.instant(i18nKey)}: ${value}` : '';
  }

  resolveCommonHeaderValue(field: ReportField, context: ReportHeaderContext): string | null {
    switch (field.dataBinding) {
      case 'client.name': return context.client?.name ?? '';
      case 'client.firstName': return context.client?.firstName ?? '';
      case 'client.company': return context.client?.company ?? '';
      case 'client.idNumber': return context.client?.idNumber?.toString() ?? '';
      case 'report.period': return `${this.formatDate(context.startDate ?? '')} - ${this.formatDate(context.endDate ?? '')}`;
      case 'report.date': return this.formatDate(companyToday());
      case 'report.groupName': return context.groupName ?? '';
      case 'report.customText': return field.name ?? '';
      default: return null;
    }
  }
}

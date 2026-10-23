// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Picks the report data provider for a report source and owns the schedule and absence providers, which depend on the
 * component-scoped AbsenceLookupService; the other sources come from root-provided provider services.
 * @param sourceId - Report source such as 'schedule', 'group' or 'edit-address'
 * @param dataSetIds - Data sets of the template; the schedule source maps them to entry types
 */

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { ReportField } from '../../models/report/report-field.model';
import { WorkScheduleEntryType } from '../../models/schedule/work-schedule-entry-type.enum';
import { IScheduleCell } from '../../models/schedule/schedule-cell.interface';
import { WorkChangeType } from '../../models/workchange/work-change-type.enum';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import { DataBreakPlaceholderService } from 'src/app/infrastructure/api/break/data-break-placeholder.service';
import { formatTime, hoursToHHMM } from 'src/app/domain/helpers/time-format.helper';
import { daysBetweenDates } from 'src/app/domain/helpers/date.helper';
import { calendarDateKey, companyToday, parseCalendarDate } from 'src/app/domain/helpers/calendar-date.helper';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language.interface';
import { AbsenceReportRow } from 'src/app/domain/models/report/absence-report-row.interface';
import { ReportDataProvider } from './report-data-provider.interface';
import { ReportValueFormatterService } from './report-value-formatter.service';
import { ClientReportDataProviderService } from './client-report-data-provider.service';
import { ClientAvailabilityReportDataProviderService } from './client-availability-report-data-provider.service';
import { GroupReportDataProviderService } from './group-report-data-provider.service';
import { ShiftReportDataProviderService } from './shift-report-data-provider.service';
import { REPORT_MAX_ROWS } from './report-data-provider.constants';

@Injectable()
export class ReportDataProviderService {
  private translate = inject(TranslateService);
  private formatter = inject(ReportValueFormatterService);
  private workScheduleService = inject(DataWorkScheduleService);
  private breakPlaceholderService = inject(DataBreakPlaceholderService);
  private absenceLookup = inject(AbsenceLookupService);
  private clientProviders = inject(ClientReportDataProviderService);
  private clientAvailabilityProviders = inject(ClientAvailabilityReportDataProviderService);
  private groupProviders = inject(GroupReportDataProviderService);
  private shiftProviders = inject(ShiftReportDataProviderService);

  getProvider(sourceId: string, dataSetIds: string[]): ReportDataProvider {
    if (sourceId === 'schedule') return this.scheduleProvider(dataSetIds);
    const key = `${sourceId}/${dataSetIds[0]}`;
    switch (key) {
      case 'absence-gantt/absences': return this.absenceProvider();
      case 'all-address/clients': return this.clientProviders.createListProvider();
      case 'edit-address/details': return this.clientProviders.createDetailProvider();
      case 'client-availability/clients': return this.clientAvailabilityProviders.createListProvider();
      case 'edit-client-availability/details': return this.clientAvailabilityProviders.createDetailProvider();
      case 'group/groups': return this.groupProviders.createListProvider();
      case 'edit-group/details': return this.groupProviders.createDetailProvider();
      case 'shift-table/shifts': return this.shiftProviders.createShiftProvider(ShiftFilterType.Original);
      case 'shift-table-cut/shifts': return this.shiftProviders.createShiftProvider(ShiftFilterType.Shift);
      case 'shift-table-container/shifts': return this.shiftProviders.createShiftProvider(ShiftFilterType.Container);
      case 'container-template/items': return this.shiftProviders.createContainerTemplateProvider();
      default: return this.scheduleProvider(['work']);
    }
  }

  private mapDataSetIdsToEntryTypes(ids: string[]): number[] {
    const map: Record<string, number> = {
      'work': WorkScheduleEntryType.Work,
      'workChange': WorkScheduleEntryType.WorkChange,
      'expenses': WorkScheduleEntryType.Expenses,
      'break': WorkScheduleEntryType.Break,
    };
    return ids.map(id => map[id]).filter(t => t !== undefined);
  }

  private scheduleProvider(dataSetIds: string[]): ReportDataProvider<IScheduleCell> {
    const entryTypes = this.mapDataSetIdsToEntryTypes(dataSetIds);
    return {
      fetchData: async (params) => {
        await this.absenceLookup.loadIfNeeded();
        const response = await firstValueFrom(
          this.workScheduleService.getWorkSchedule({
            startDate: params.startDate!,
            endDate: params.endDate!,
            selectedGroup: params.groupId,
            showEmployees: true,
            showExtern: true,
            clientId: params.clientId,
          })
        );
        let filtered = response.entries.filter(e => entryTypes.includes(e.entryType));
        let clients = response.clients;
        if (params.clientId) {
          filtered = filtered.filter(e => e.clientId === params.clientId);
          clients = clients.filter(c => c.id === params.clientId);
        }
        return {
          rows: filtered,
          clients,
          metadata: { startDate: response.startDate, endDate: response.endDate },
        };
      },
      resolveFieldValue: (field, row: IScheduleCell) => {
        return this.resolveScheduleEntryValue(field, row);
      },
      resolveHeaderValue: (field, context) => {
        return this.formatter.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: (field, rows: IScheduleCell[]) => {
        switch (field.dataBinding) {
          case 'sum.hours': return hoursToHHMM(rows.reduce((s, e) => s + (e.changeTime ?? 0), 0));
          case 'sum.surcharges': return hoursToHHMM(rows.reduce((s, e) => s + (e.surcharges ?? 0), 0));
          case 'sum.workDays': {
            const uniqueDates = new Set(
              rows.filter(e => e.entryType === WorkScheduleEntryType.Work)
                .map(e => calendarDateKey(e.entryDate))
            );
            return uniqueDates.size.toString();
          }
          case 'sum.expenses': return rows
            .filter(e => e.entryType === WorkScheduleEntryType.Expenses)
            .reduce((s, e) => s + (e.amount ?? 0), 0).toFixed(2);
          default: return '';
        }
      },
      buildFormulaVariables: (row: IScheduleCell) => ({
        hours: row.changeTime ?? 0,
        surcharges: row.surcharges ?? 0,
        startTime: row.startTime ?? '',
        endTime: row.endTime ?? '',
        weekday: parseCalendarDate(row.entryDate)?.getDay() ?? 0,
        entryType: row.entryType ?? 0,
        information: row.information ?? '',
        amount: row.amount ?? 0,
        taxable: row.taxable ?? false,
      }),
      buildFooterFormulaVariables: (rows: IScheduleCell[]) => {
        const uniqueDates = new Set(
          rows.filter(e => e.entryType === WorkScheduleEntryType.Work)
            .map(e => calendarDateKey(e.entryDate))
        );
        return {
          totalRows: rows.length,
          totalHours: rows.reduce((s, e) => s + (e.changeTime ?? 0), 0),
          totalSurcharges: rows.reduce((s, e) => s + (e.surcharges ?? 0), 0),
          totalWorkDays: uniqueDates.size,
          totalExpenses: rows
            .filter(e => e.entryType === WorkScheduleEntryType.Expenses)
            .reduce((s, e) => s + (e.amount ?? 0), 0),
        };
      },
      collectResolvedLabelTexts: () => [
        ...this.formatter.translatedWeekdayLabels(),
        ...this.formatter.translatedLabels([
          'general.yes',
          'general.no',
          'schedule.entryType.work',
          'schedule.entryType.workChange',
          'schedule.entryType.break',
          'schedule.entryType.expenses',
          'workChange.abbr.expenses',
          'workChange.abbr.reimbursement',
          'workChange.abbr.briefing',
          'workChange.abbr.debriefing',
          'workChange.abbr.travelStart',
          'workChange.abbr.travelEnd',
          'workChange.abbr.travelWithin',
          'workChange.abbr.replacement',
          'workChange.abbr.correction',
        ]),
      ],
    };
  }

  private absenceProvider(): ReportDataProvider<AbsenceReportRow> {
    return {
      fetchData: async (params) => {
        await this.absenceLookup.loadIfNeeded();
        const allAbsenceFilters = [
          ...this.absenceLookup.absences().filter(a => !!a.id).map(a => ({ id: a.id!, name: '', checked: true })),
          ...this.absenceLookup.absenceDetails().filter(d => !!d.id).map(d => ({ id: d.id!, name: '', checked: true })),
        ];
        const year = params.year
          ?? (parseCalendarDate(params.startDate) ?? companyToday()).getFullYear();
        const response = await firstValueFrom(
          this.breakPlaceholderService.getClientList({
            currentYear: year,
            absences: allAbsenceFilters,
            selectedGroup: params.groupId,
            showEmployees: true,
            showExtern: true,
            searchString: '',
            orderBy: 'name',
            sortOrder: 'asc',
            numberOfItemsPerPage: REPORT_MAX_ROWS,
            requiredPage: 0,
            numberOfItemOnPreviousPage: undefined,
            firstItemOnLastPage: undefined,
            isPreviousPage: undefined,
            isNextPage: undefined,
            individualSort: false,
          })
        );
        const clients = params.clientId
          ? response.clients.filter(c => c.id === params.clientId)
          : response.clients;
        const rows = clients.flatMap(client =>
          (client.breakPlaceholders ?? []).map(bp => ({
            ...bp,
            clientName: client.name,
            clientFirstName: client.firstName,
          }))
        );
        return { rows, clients, metadata: { totalClients: response.totalCount } };
      },
      resolveFieldValue: (field, row) => {
        const lang = this.formatter.currentLanguage();
        switch (field.dataBinding) {
          case 'absence.clientName': return row.clientName ?? '';
          case 'absence.clientFirstName': return row.clientFirstName ?? '';
          case 'absence.absenceName': return this.absenceLookup.getNameForEntryId(row.absenceId, lang);
          case 'absence.from': return this.formatter.formatDate(row.from);
          case 'absence.until': return this.formatter.formatDate(row.until);
          case 'absence.value': {
            const absenceName = this.absenceLookup.findAbsenceForEntryId(row.absenceId);
            const defaultValue = absenceName?.defaultValue;
            if (defaultValue && defaultValue > 0 && row.from && row.until) {
              const diff = Math.floor(daysBetweenDates(parseCalendarDate(row.from), parseCalendarDate(row.until))) + 1;
              return (diff * defaultValue).toString();
            }
            return '';
          }
          case 'absence.information': return row.information ?? '';
          default: return '';
        }
      },
      resolveHeaderValue: (field, context) => {
        return this.formatter.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: (field, rows) => {
        if (field.dataBinding === 'absence.totalCount') return rows.length.toString();
        if (field.dataBinding === 'absence.totalValue') {
          const total = rows.reduce((sum: number, row) => {
            const absence = this.absenceLookup.findAbsenceForEntryId(row.absenceId);
            const defaultValue = absence?.defaultValue ?? 0;
            if (defaultValue > 0 && row.from && row.until) {
              const diff = Math.floor(daysBetweenDates(parseCalendarDate(row.from), parseCalendarDate(row.until))) + 1;
              return sum + diff * defaultValue;
            }
            return sum;
          }, 0);
          return total.toString();
        }
        return '';
      },
      buildFormulaVariables: (row) => ({
        fromDate: row.from ?? '',
        untilDate: row.until ?? '',
        absenceName: this.absenceLookup.getNameForEntryId(row.absenceId, this.formatter.currentLanguage()),
        defaultValue: this.absenceLookup.findAbsenceForEntryId(row.absenceId)?.defaultValue ?? 0,
        clientName: row.clientName ?? '',
        clientFirstName: row.clientFirstName ?? '',
      }),
      buildFooterFormulaVariables: (rows) => ({
        totalRows: rows.length,
        totalValue: rows.reduce((sum: number, row) => {
          const absence = this.absenceLookup.findAbsenceForEntryId(row.absenceId);
          const defaultValue = absence?.defaultValue ?? 0;
          if (defaultValue > 0 && row.from && row.until) {
            const diff = Math.floor(daysBetweenDates(parseCalendarDate(row.from), parseCalendarDate(row.until))) + 1;
            return sum + diff * defaultValue;
          }
          return sum;
        }, 0),
      }),
    };
  }

  private resolveScheduleEntryValue(field: ReportField, entry: IScheduleCell): string {
    switch (field.dataBinding) {
      case 'entry.date':
      case 'expense.date':
        return this.formatter.formatDate(entry.entryDate);
      case 'entry.weekday':
        return this.formatter.resolveWeekday(parseCalendarDate(entry.entryDate)?.getDay() ?? 0);
      case 'entry.startTime':
        return formatTime(entry.startTime);
      case 'entry.endTime':
        return formatTime(entry.endTime);
      case 'entry.hours':
        return hoursToHHMM(entry.changeTime);
      case 'entry.surcharges':
        return hoursToHHMM(entry.surcharges);
      case 'entry.shiftName':
      case 'expense.shiftName':
        return entry.entryName ?? '';
      case 'entry.shiftAbbr':
        return this.getScheduleAbbreviation(entry);
      case 'entry.type':
        return this.getEntryTypeLabel(entry.entryType);
      case 'entry.information':
        return entry.information ?? '';
      case 'entry.description':
      case 'expense.description':
        if (entry.description) {
          return getLocalizedValue(entry.description as IMultiLanguage, this.formatter.currentLanguage());
        }
        return '';
      case 'expense.amount':
        return entry.amount != null ? entry.amount.toFixed(2) : '';
      case 'expense.taxable':
        return entry.taxable != null
          ? (entry.taxable ? this.translate.instant('general.yes') : this.translate.instant('general.no'))
          : '';
      default:
        return '';
    }
  }

  private getEntryTypeLabel(type: number): string {
    switch (type) {
      case WorkScheduleEntryType.Work: return this.translate.instant('schedule.entryType.work');
      case WorkScheduleEntryType.WorkChange: return this.translate.instant('schedule.entryType.workChange');
      case WorkScheduleEntryType.Break: return this.translate.instant('schedule.entryType.break');
      case WorkScheduleEntryType.Expenses: return this.translate.instant('schedule.entryType.expenses');
      default: return '';
    }
  }

  private getScheduleAbbreviation(entry: IScheduleCell): string {
    if (entry.entryType === WorkScheduleEntryType.Expenses) {
      return entry.taxable
        ? this.translate.instant('workChange.abbr.reimbursement')
        : this.translate.instant('workChange.abbr.expenses');
    }
    if (entry.entryType === WorkScheduleEntryType.WorkChange) {
      return this.translate.instant(this.resolveWorkChangeAbbrKey(entry));
    }
    if (entry.entryType === WorkScheduleEntryType.Break) {
      return this.absenceLookup.getAbbreviationForEntryId(entry.entryId, this.formatter.currentLanguage());
    }
    return entry.abbreviation ?? '';
  }

  private resolveWorkChangeAbbrKey(entry: IScheduleCell): string {
    switch (entry.workChangeType) {
      case WorkChangeType.Briefing: return 'workChange.abbr.briefing';
      case WorkChangeType.Debriefing: return 'workChange.abbr.debriefing';
      case WorkChangeType.TravelStart: return 'workChange.abbr.travelStart';
      case WorkChangeType.TravelEnd: return 'workChange.abbr.travelEnd';
      case WorkChangeType.TravelWithin: return 'workChange.abbr.travelWithin';
      case WorkChangeType.ReplacementStart:
      case WorkChangeType.ReplacementEnd:
      case WorkChangeType.ReplacementWithin:
        return 'workChange.abbr.replacement';
      case WorkChangeType.CorrectionStart:
      case WorkChangeType.CorrectionEnd:
        return 'workChange.abbr.correction';
      default:
        return entry.replaceClientId
          ? 'workChange.abbr.replacement'
          : 'workChange.abbr.correction';
    }
  }
}

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { ReportField, ReportFieldType } from '../../models/report/report-field.model';
import { IScheduleCell, IWorkScheduleClient, WorkScheduleEntryType } from '../../models/work-schedule-class';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/data-work-schedule.service';
import { DataBreakPlaceholderService } from 'src/app/infrastructure/api/data-break-placeholder.service';
import { DataClientService } from 'src/app/infrastructure/api/data-client.service';
import { DataGroupService } from 'src/app/infrastructure/api/data-group.service';
import { DataShiftService } from 'src/app/infrastructure/api/data-shift.service';
import { DataContainerTemplateService } from 'src/app/infrastructure/api/data-container-template.service';
import { hoursToHHMM } from 'src/app/shared/helpers/time-format.helper';

export interface ReportFetchParams {
  groupId?: string;
  startDate?: string;
  endDate?: string;
  clientId?: string;
  year?: number;
  containerId?: string;
}

export interface ReportData {
  rows: any[];
  clients?: any[];
  metadata?: Record<string, any>;
}

export interface ReportHeaderContext {
  client?: any;
  groupName?: string;
  startDate?: string;
  endDate?: string;
  metadata?: Record<string, any>;
}

export interface ReportDataProvider {
  fetchData(params: ReportFetchParams): Promise<ReportData>;
  resolveFieldValue(field: ReportField, row: any): string;
  resolveHeaderValue(field: ReportField, context: ReportHeaderContext): string;
  resolveFooterValue(field: ReportField, rows: any[]): string;
}

@Injectable({ providedIn: 'root' })
export class ReportDataProviderService {
  private translate = inject(TranslateService);
  private workScheduleService = inject(DataWorkScheduleService);
  private breakPlaceholderService = inject(DataBreakPlaceholderService);
  private clientService = inject(DataClientService);
  private groupService = inject(DataGroupService);
  private shiftService = inject(DataShiftService);
  private containerTemplateService = inject(DataContainerTemplateService);

  getProvider(sourceId: string, dataSetIds: string[]): ReportDataProvider {
    if (sourceId === 'schedule') return this.scheduleProvider(dataSetIds);
    const key = `${sourceId}/${dataSetIds[0]}`;
    switch (key) {
      case 'absence-gantt/absences': return this.absenceProvider();
      case 'all-address/clients': return this.allAddressProvider();
      case 'edit-address/details': return this.editAddressProvider();
      case 'group/groups': return this.groupProvider();
      case 'shift-table/shifts': return this.shiftProvider();
      case 'container-template/items': return this.containerTemplateProvider();
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

  private resolveCommonHeaderValue(field: ReportField, context: ReportHeaderContext): string | null {
    switch (field.dataBinding) {
      case 'client.name': return context.client?.name ?? '';
      case 'client.firstName': return context.client?.firstName ?? '';
      case 'client.company': return context.client?.company ?? '';
      case 'client.idNumber': return context.client?.idNumber?.toString() ?? '';
      case 'report.period': return `${this.formatDate(context.startDate ?? '')} - ${this.formatDate(context.endDate ?? '')}`;
      case 'report.date': return this.formatDate(new Date().toISOString());
      case 'report.groupName': return context.groupName ?? '';
      case 'report.customText': return field.name ?? '';
      default: return null;
    }
  }

  private scheduleProvider(dataSetIds: string[]): ReportDataProvider {
    const entryTypes = this.mapDataSetIdsToEntryTypes(dataSetIds);
    return {
      fetchData: async (params) => {
        const response = await firstValueFrom(
          this.workScheduleService.getWorkSchedule({
            startDate: params.startDate!,
            endDate: params.endDate!,
            selectedGroup: params.groupId,
            showEmployees: true,
            showExtern: true,
          })
        );
        const filtered = response.entries.filter(e => entryTypes.includes(e.entryType));
        return {
          rows: filtered,
          clients: response.clients,
          metadata: { startDate: response.startDate, endDate: response.endDate },
        };
      },
      resolveFieldValue: (field, row: IScheduleCell) => {
        return this.resolveScheduleEntryValue(field, row);
      },
      resolveHeaderValue: (field, context) => {
        return this.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: (field, rows: IScheduleCell[]) => {
        switch (field.dataBinding) {
          case 'sum.hours': return hoursToHHMM(rows.reduce((s, e) => s + (e.changeTime ?? 0), 0));
          case 'sum.surcharges': return hoursToHHMM(rows.reduce((s, e) => s + (e.surcharges ?? 0), 0));
          case 'sum.workDays': {
            const uniqueDates = new Set(
              rows.filter(e => e.entryType === WorkScheduleEntryType.Work)
                .map(e => new Date(e.entryDate).toDateString())
            );
            return uniqueDates.size.toString();
          }
          case 'sum.expenses': return rows
            .filter(e => e.entryType === WorkScheduleEntryType.Expenses)
            .reduce((s, e) => s + (e.amount ?? 0), 0).toFixed(2);
          default: return '';
        }
      },
    };
  }

  private absenceProvider(): ReportDataProvider {
    return {
      fetchData: async (params) => {
        const year = params.year ?? new Date().getFullYear();
        const response = await firstValueFrom(
          this.breakPlaceholderService.getClientList({
            currentYear: year,
            absences: [],
            selectedGroup: params.groupId,
            showEmployees: true,
            showExtern: true,
            searchString: '',
            orderBy: 'name',
            sortOrder: 'asc',
            numberOfItemsPerPage: 10000,
            requiredPage: 0,
            numberOfItemOnPreviousPage: undefined,
            firstItemOnLastPage: undefined,
            isPreviousPage: undefined,
            isNextPage: undefined,
            hoursSortOrder: undefined,
          })
        );
        const rows = response.clients.flatMap(client =>
          (client.breakPlaceholders ?? []).map((bp: any) => ({
            ...bp,
            clientName: client.name,
            clientFirstName: client.firstName,
          }))
        );
        return { rows, metadata: { totalClients: response.totalCount } };
      },
      resolveFieldValue: (field, row) => {
        switch (field.dataBinding) {
          case 'absence.clientName': return row.clientName ?? '';
          case 'absence.clientFirstName': return row.clientFirstName ?? '';
          case 'absence.absenceName': return row.absence?.name?.[this.translate.currentLang] ?? row.absence?.name?.de ?? '';
          case 'absence.from': return this.formatDate(row.from);
          case 'absence.until': return this.formatDate(row.until);
          case 'absence.information': return row.information ?? '';
          default: return '';
        }
      },
      resolveHeaderValue: (field, context) => {
        return this.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: (field, rows) => {
        if (field.dataBinding === 'absence.totalCount') return rows.length.toString();
        return '';
      },
    };
  }

  private allAddressProvider(): ReportDataProvider {
    return {
      fetchData: async (params) => {
        const response = await firstValueFrom(
          this.clientService.readClientList({
            searchString: '',
            orderBy: 'name',
            sortOrder: 'asc',
            numberOfItemsPerPage: 10000,
            requiredPage: 0,
            numberOfItemOnPreviousPage: undefined,
            firstItemOnLastPage: undefined,
            isPreviousPage: undefined,
            isNextPage: undefined,
            scopeFromFlag: undefined,
            scopeUntilFlag: undefined,
            scopeFrom: undefined,
            scopeUntil: undefined,
            showDeleteEntries: false,
            macroFilter: undefined,
            clientType: undefined,
            searchOnlyByName: undefined,
            male: undefined,
            female: undefined,
            legalEntity: undefined,
            intersexuality: undefined,
            companyAddress: undefined,
            invoiceAddress: undefined,
            homeAddress: undefined,
            countriesHaveBeenReadIn: false,
            countries: [],
            activeMembership: undefined,
            formerMembership: undefined,
            futureMembership: undefined,
            hasAnnotation: undefined,
            list: [],
            filteredStateToken: [],
            selectedGroup: params.groupId,
            employee: true,
            externEmp: true,
            customer: true,
          } as any)
        );
        return { rows: response.clients, metadata: { totalCount: response.maxItems } };
      },
      resolveFieldValue: (field, row) => {
        switch (field.dataBinding) {
          case 'client.list.idNumber': return row.idNumber?.toString() ?? '';
          case 'client.list.company': return row.company ?? '';
          case 'client.list.firstName': return row.firstName ?? '';
          case 'client.list.name': return row.name ?? '';
          case 'client.list.gender': return this.resolveGender(row.gender);
          case 'client.list.type': return row.typeAbbreviation ?? row.type?.toString() ?? '';
          case 'client.list.birthdate': return this.formatDate(row.birthdate);
          default: return '';
        }
      },
      resolveHeaderValue: (field, context) => {
        return this.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: (field, rows) => {
        if (field.dataBinding === 'client.totalCount') return rows.length.toString();
        return '';
      },
    };
  }

  private editAddressProvider(): ReportDataProvider {
    return {
      fetchData: async (params) => {
        if (!params.clientId) return { rows: [] };
        const client = await firstValueFrom(this.clientService.getClient(params.clientId));
        return {
          rows: client.addresses ?? [],
          clients: [client],
          metadata: { client },
        };
      },
      resolveFieldValue: (field, row) => {
        switch (field.dataBinding) {
          case 'address.type': return this.resolveAddressType(row.type);
          case 'address.street': return [row.street, row.street2, row.street3].filter(Boolean).join(', ');
          case 'address.zip': return row.zip ?? '';
          case 'address.city': return row.city ?? '';
          case 'address.country': return row.country ?? '';
          case 'address.validFrom': return this.formatDate(row.validFrom);
          default: return '';
        }
      },
      resolveHeaderValue: (field, context) => {
        return this.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: () => '',
    };
  }

  private groupProvider(): ReportDataProvider {
    return {
      fetchData: async (params) => {
        const response = await firstValueFrom(
          this.groupService.readGroupList({
            searchString: '',
            orderBy: 'name',
            sortOrder: 'asc',
            numberOfItemsPerPage: 10000,
            requiredPage: 0,
            numberOfItemOnPreviousPage: undefined,
            firstItemOnLastPage: undefined,
            isPreviousPage: undefined,
            isNextPage: undefined,
            activeDateRange: true,
            formerDateRange: false,
            futureDateRange: false,
            showDeleteEntries: false,
            selectedGroup: params.groupId,
          } as any)
        );
        return { rows: response.groups, metadata: { totalCount: response.maxItems } };
      },
      resolveFieldValue: (field, row) => {
        switch (field.dataBinding) {
          case 'group.name': return row.name ?? '';
          case 'group.description': return row.description ?? '';
          case 'group.validFrom': return this.formatDate(row.validFrom);
          case 'group.validUntil': return this.formatDate(row.validUntil);
          case 'group.clientsCount': return row.clientsCount?.toString() ?? '0';
          case 'group.shiftsCount': return row.shiftsCount?.toString() ?? '0';
          default: return '';
        }
      },
      resolveHeaderValue: (field, context) => {
        return this.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: (field, rows) => {
        if (field.dataBinding === 'group.totalCount') return rows.length.toString();
        return '';
      },
    };
  }

  private shiftProvider(): ReportDataProvider {
    return {
      fetchData: async () => {
        const response = await firstValueFrom(
          this.shiftService.readShiftList({
            searchString: '',
            orderBy: 'name',
            sortOrder: 'asc',
            numberOfItemsPerPage: 10000,
            requiredPage: 0,
            numberOfItemOnPreviousPage: undefined,
            firstItemOnLastPage: undefined,
            isPreviousPage: undefined,
            isNextPage: undefined,
            activeDateRange: true,
            formerDateRange: false,
            futureDateRange: false,
            showDeleteEntries: false,
            filterType: 0,
          } as any)
        );
        return { rows: response.shifts, metadata: { totalCount: response.maxItems } };
      },
      resolveFieldValue: (field, row) => {
        switch (field.dataBinding) {
          case 'shift.name': return row.name ?? '';
          case 'shift.abbreviation': return row.abbreviation ?? '';
          case 'shift.startShift': return this.formatTime(row.startShift);
          case 'shift.endShift': return this.formatTime(row.endShift);
          case 'shift.fromDate': return this.formatDate(row.fromDate);
          case 'shift.untilDate': return this.formatDate(row.untilDate);
          case 'shift.workTime': return hoursToHHMM(row.workTime);
          case 'shift.description': return row.description ?? '';
          default: return '';
        }
      },
      resolveHeaderValue: (field, context) => {
        return this.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: (field, rows) => {
        if (field.dataBinding === 'shift.totalCount') return rows.length.toString();
        return '';
      },
    };
  }

  private containerTemplateProvider(): ReportDataProvider {
    return {
      fetchData: async (params) => {
        if (!params.containerId) return { rows: [] };
        const templates = await firstValueFrom(
          this.containerTemplateService.getTemplates(params.containerId)
        );
        const rows = templates.flatMap(t =>
          t.containerTemplateItems.map(item => ({
            ...item,
            weekday: t.weekday,
            templateFromTime: t.fromTime,
            templateUntilTime: t.untilTime,
          }))
        );
        return { rows, metadata: { totalCount: rows.length } };
      },
      resolveFieldValue: (field, row) => {
        switch (field.dataBinding) {
          case 'ct.weekday': return this.resolveWeekday(row.weekday);
          case 'ct.fromTime': return this.formatTime(row.startShift ?? row.templateFromTime);
          case 'ct.untilTime': return this.formatTime(row.endShift ?? row.templateUntilTime);
          case 'ct.shiftName': return row.shift?.name ?? '';
          case 'ct.briefingTime': return this.formatTime(row.briefingTime);
          case 'ct.debriefingTime': return this.formatTime(row.debriefingTime);
          case 'ct.travelTimeBefore': return this.formatTime(row.travelTimeBefore);
          case 'ct.travelTimeAfter': return this.formatTime(row.travelTimeAfter);
          default: return '';
        }
      },
      resolveHeaderValue: (field, context) => {
        return this.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: (field, rows) => {
        if (field.dataBinding === 'ct.totalCount') return rows.length.toString();
        return '';
      },
    };
  }

  private resolveScheduleEntryValue(field: ReportField, entry: IScheduleCell): string {
    switch (field.dataBinding) {
      case 'entry.date':
      case 'expense.date':
        return this.formatDate(entry.entryDate?.toString() ?? '');
      case 'entry.weekday':
        return this.resolveWeekday(new Date(entry.entryDate).getDay());
      case 'entry.startTime':
        return this.formatTime(entry.startTime);
      case 'entry.endTime':
        return this.formatTime(entry.endTime);
      case 'entry.hours':
        return hoursToHHMM(entry.changeTime);
      case 'entry.surcharges':
        return hoursToHHMM(entry.surcharges);
      case 'entry.shiftName':
      case 'expense.shiftName':
        return entry.entryName ?? '';
      case 'entry.shiftAbbr':
        return entry.abbreviation ?? '';
      case 'entry.type':
        return this.getEntryTypeLabel(entry.entryType);
      case 'entry.information':
        return entry.information ?? '';
      case 'entry.description':
      case 'expense.description':
        if (entry.description) {
          const lang = this.translate.currentLang || 'de';
          return (entry.description as Record<string, string>)[lang] ?? '';
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

  private formatDate(dateStr: string | Date | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    return date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatTime(time: string | undefined): string {
    if (!time) return '';
    return time.substring(0, 5);
  }

  private resolveWeekday(dayIndex: number): string {
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return this.translate.instant(days[dayIndex] ?? '');
  }

  private resolveGender(gender: number | string): string {
    switch (Number(gender)) {
      case 0: return this.translate.instant('general.male');
      case 1: return this.translate.instant('general.female');
      default: return '';
    }
  }

  private resolveAddressType(type: number): string {
    switch (type) {
      case 0: return this.translate.instant('address.type.company');
      case 1: return this.translate.instant('address.type.invoice');
      case 2: return this.translate.instant('address.type.home');
      default: return '';
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
}

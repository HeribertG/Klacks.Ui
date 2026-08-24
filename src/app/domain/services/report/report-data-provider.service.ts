// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { ReportField } from '../../models/report/report-field.model';
import { ExternalVariables } from 'src/app/infrastructure/scripting/script.service';
import { IScheduleCell, WorkScheduleEntryType } from '../../models/schedule/work-schedule-class';
import { WorkChangeType } from '../../models/workchange/work-change';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import { DataBreakPlaceholderService } from 'src/app/infrastructure/api/break/data-break-placeholder.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { DataContainerTemplateService } from 'src/app/infrastructure/api/container/data-container-template.service';
import { DataQualificationService } from 'src/app/infrastructure/api/settings/data-qualification.service';
import { DataContractService } from 'src/app/infrastructure/api/contract/data-contract.service';
import { DataClientAvailabilityService } from 'src/app/infrastructure/api/client-availability/data-client-availability.service';
import { hoursToHHMM, timeToMinutes } from 'src/app/shared/helpers/time-format.helper';
import { daysBetweenDates } from 'src/app/shared/helpers/date.helper';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { ClientConfigService } from 'src/app/domain/services/client/client-config.service';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';
import { EntityTypeEnum } from 'src/app/domain/enums/client-enum';
import { Filter } from 'src/app/domain/models/client/filter';
import { IClientExportSelection } from 'src/app/domain/models/client/i-client-export-selection';
import { GroupFilter, IGroup, IGroupItem } from 'src/app/domain/models/group/group-class';
import { PaymentInterval } from 'src/app/domain/models/contract/contract-class';
import { ICalendarSelection } from 'src/app/domain/models/calendar/calendar-selection-class';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/calendar/data-calendar-selection.service';
import { htmlToPlainText } from 'src/app/shared/helpers/html-sanitizer.helper';
import { ShiftFilter } from 'src/app/domain/models/shift/shift-data-class';
import { IClient, ICommunication, IClientContract } from 'src/app/domain/models/client/client-class';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { IContract } from 'src/app/domain/models/contract/contract-class';
import { IClientAvailabilityClientFilter } from 'src/app/domain/models/client-availability/client-availability-client-filter.interface';
import { IClientAvailabilityRange } from 'src/app/domain/models/client-availability/client-availability-range.interface';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { formatPhoneNumber } from 'src/app/shared/helpers/phone.helper';

import { DomainMessages } from 'src/app/domain/constants/messages';

const REPORT_MAX_ROWS = 10000;

const GROUP_PATH_SEPARATOR = ' > ';

const PAYMENT_INTERVAL_LABEL_KEYS: Readonly<Record<PaymentInterval, string>> = {
  [PaymentInterval.Weekly]: 'settings.work.payment-weekly',
  [PaymentInterval.Biweekly]: 'settings.work.payment-biweekly',
  [PaymentInterval.Monthly]: 'settings.work.payment-monthly',
  [PaymentInterval.Individual]: 'settings.work.payment-individual',
  [PaymentInterval.MonthlyTargetHours]: 'settings.work.payment-monthly-target-hours',
};

const FULL_LIST_PAGINATION = {
  numberOfItemsPerPage: REPORT_MAX_ROWS,
  requiredPage: 0,
  numberOfItemOnPreviousPage: undefined,
  firstItemOnLastPage: undefined,
  isPreviousPage: undefined,
  isNextPage: undefined,
} as const;

export interface ReportFetchParams {
  groupId?: string;
  startDate?: string;
  endDate?: string;
  clientId?: string;
  year?: number;
  containerId?: string;
  clientFilter?: Filter;
  clientSelection?: IClientExportSelection;
  groupFilter?: GroupFilter;
  shiftFilter?: ShiftFilter;
  cardVisibility?: Record<string, boolean>;
  clientAvailabilityFilter?: IClientAvailabilityClientFilter;
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
  buildFormulaVariables?(row: any): ExternalVariables;
  buildFooterFormulaVariables?(rows: any[]): ExternalVariables;
  collectResolvedLabelTexts?(): string[];
}

@Injectable()
export class ReportDataProviderService {
  private translate = inject(TranslateService);
  private workScheduleService = inject(DataWorkScheduleService);
  private breakPlaceholderService = inject(DataBreakPlaceholderService);
  private clientService = inject(DataClientService);
  private groupService = inject(DataGroupService);
  private shiftService = inject(DataShiftService);
  private containerTemplateService = inject(DataContainerTemplateService);
  private qualificationService = inject(DataQualificationService);
  private contractService = inject(DataContractService);
  private clientConfigService = inject(ClientConfigService);
  private absenceLookup = inject(AbsenceLookupService);
  private dataClientAvailability = inject(DataClientAvailabilityService);
  private calendarSelectionService = inject(DataCalendarSelectionService);

  getProvider(sourceId: string, dataSetIds: string[]): ReportDataProvider {
    if (sourceId === 'schedule') return this.scheduleProvider(dataSetIds);
    const key = `${sourceId}/${dataSetIds[0]}`;
    switch (key) {
      case 'absence-gantt/absences': return this.absenceProvider();
      case 'all-address/clients': return this.allAddressProvider();
      case 'edit-address/details': return this.editAddressProvider();
      case 'client-availability/clients': return this.clientAvailabilityListProvider();
      case 'edit-client-availability/details': return this.editClientAvailabilityProvider();
      case 'group/groups': return this.groupProvider();
      case 'edit-group/details': return this.editGroupProvider();
      case 'shift-table/shifts': return this.shiftProvider(ShiftFilterType.Original);
      case 'shift-table-cut/shifts': return this.shiftProvider(ShiftFilterType.Shift);
      case 'shift-table-container/shifts': return this.shiftProvider(ShiftFilterType.Container);
      case 'container-template/items': return this.containerTemplateProvider();
      default: return this.scheduleProvider(['work']);
    }
  }

  private applyClientSelection(rows: any[], selection?: IClientExportSelection): any[] {
    if (!selection || selection.selection.length === 0) {
      return rows;
    }
    if (!selection.selectAll && !selection.invertedSelection) {
      return rows.filter(r => selection.selection.includes(r.id));
    }
    if (selection.invertedSelection) {
      return rows.filter(r => !selection.selection.includes(r.id));
    }
    return rows;
  }

  private translatedWeekdayLabels(): string[] {
    return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].map(d => this.translate.instant(d));
  }

  private translatedLabels(keys: string[]): string[] {
    return keys.map(k => this.translate.instant(k));
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
      buildFormulaVariables: (row: IScheduleCell) => ({
        hours: row.changeTime ?? 0,
        surcharges: row.surcharges ?? 0,
        startTime: row.startTime ?? '',
        endTime: row.endTime ?? '',
        weekday: row.entryDate ? new Date(row.entryDate).getDay() : 0,
        entryType: row.entryType ?? 0,
        information: row.information ?? '',
        amount: row.amount ?? 0,
        taxable: row.taxable ?? false,
      }),
      buildFooterFormulaVariables: (rows: IScheduleCell[]) => {
        const uniqueDates = new Set(
          rows.filter(e => e.entryType === WorkScheduleEntryType.Work)
            .map(e => new Date(e.entryDate).toDateString())
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
        ...this.translatedWeekdayLabels(),
        ...this.translatedLabels([
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

  private absenceProvider(): ReportDataProvider {
    return {
      fetchData: async (params) => {
        await this.absenceLookup.loadIfNeeded();
        const allAbsenceFilters = [
          ...this.absenceLookup.absences().filter(a => !!a.id).map(a => ({ id: a.id!, name: '', checked: true })),
          ...this.absenceLookup.absenceDetails().filter(d => !!d.id).map(d => ({ id: d.id!, name: '', checked: true })),
        ];
        const year = params.year
          ?? (params.startDate ? new Date(params.startDate).getFullYear() : new Date().getFullYear());
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
          ? response.clients.filter((c: any) => c.id === params.clientId)
          : response.clients;
        const rows = clients.flatMap(client =>
          (client.breakPlaceholders ?? []).map((bp: any) => ({
            ...bp,
            clientName: client.name,
            clientFirstName: client.firstName,
          }))
        );
        return { rows, clients, metadata: { totalClients: response.totalCount } };
      },
      resolveFieldValue: (field, row) => {
        const lang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
        switch (field.dataBinding) {
          case 'absence.clientName': return row.clientName ?? '';
          case 'absence.clientFirstName': return row.clientFirstName ?? '';
          case 'absence.absenceName': return this.absenceLookup.getNameForEntryId(row.absenceId, lang);
          case 'absence.from': return this.formatDate(row.from);
          case 'absence.until': return this.formatDate(row.until);
          case 'absence.value': {
            const absenceName = this.absenceLookup.findAbsenceForEntryId(row.absenceId);
            const defaultValue = absenceName?.defaultValue;
            if (defaultValue && defaultValue > 0 && row.from && row.until) {
              const diff = Math.floor(daysBetweenDates(new Date(row.from), new Date(row.until))) + 1;
              return (diff * defaultValue).toString();
            }
            return '';
          }
          case 'absence.information': return row.information ?? '';
          default: return '';
        }
      },
      resolveHeaderValue: (field, context) => {
        return this.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: (field, rows) => {
        if (field.dataBinding === 'absence.totalCount') return rows.length.toString();
        if (field.dataBinding === 'absence.totalValue') {
          const total = rows.reduce((sum: number, row: any) => {
            const absence = this.absenceLookup.findAbsenceForEntryId(row.absenceId);
            const defaultValue = absence?.defaultValue ?? 0;
            if (defaultValue > 0 && row.from && row.until) {
              const diff = Math.floor(daysBetweenDates(new Date(row.from), new Date(row.until))) + 1;
              return sum + diff * defaultValue;
            }
            return sum;
          }, 0);
          return total.toString();
        }
        return '';
      },
      buildFormulaVariables: (row: any) => ({
        fromDate: row.from ?? '',
        untilDate: row.until ?? '',
        absenceName: this.absenceLookup.getNameForEntryId(row.absenceId, this.translate.currentLang || DomainMessages.DEFAULT_LANG),
        defaultValue: this.absenceLookup.findAbsenceForEntryId(row.absenceId)?.defaultValue ?? 0,
        clientName: row.clientName ?? '',
        clientFirstName: row.clientFirstName ?? '',
      }),
      buildFooterFormulaVariables: (rows: any[]) => ({
        totalRows: rows.length,
        totalValue: rows.reduce((sum: number, row: any) => {
          const absence = this.absenceLookup.findAbsenceForEntryId(row.absenceId);
          const defaultValue = absence?.defaultValue ?? 0;
          if (defaultValue > 0 && row.from && row.until) {
            const diff = Math.floor(daysBetweenDates(new Date(row.from), new Date(row.until))) + 1;
            return sum + diff * defaultValue;
          }
          return sum;
        }, 0),
      }),
    };
  }

  private allAddressProvider(): ReportDataProvider {
    return {
      fetchData: async (params) => {
        const filter = params.clientFilter
          ? { ...params.clientFilter, ...FULL_LIST_PAGINATION }
          : {
            searchString: '',
            orderBy: 'name',
            sortOrder: 'asc',
            ...FULL_LIST_PAGINATION,
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
          };
        const response = await firstValueFrom(this.clientService.readClientList(filter as any));
        const rows = this.applyClientSelection(response.clients, params.clientSelection);
        return { rows, metadata: { totalCount: rows.length } };
      },
      resolveFieldValue: (field, row) => {
        switch (field.dataBinding) {
          case 'client.list.idNumber': return row.idNumber?.toString() ?? '';
          case 'client.list.company': return row.company ?? '';
          case 'client.list.firstName': return row.firstName ?? '';
          case 'client.list.name': return row.name ?? '';
          case 'client.list.gender': return this.resolveGender(row.gender);
          case 'client.list.type': return this.resolveClientType(row.type);
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
      buildFormulaVariables: (row: any) => ({
        idNumber: row.idNumber ?? 0,
        name: row.name ?? '',
        firstName: row.firstName ?? '',
        company: row.company ?? '',
        birthdate: row.birthdate ?? '',
        gender: row.gender ?? 0,
      }),
      buildFooterFormulaVariables: (rows: any[]) => ({
        totalRows: rows.length,
      }),
      collectResolvedLabelTexts: () =>
        this.translatedLabels(['general.male', 'general.female']),
    };
  }

  private editAddressProvider(): ReportDataProvider {
    const isCardVisible = (cardVisibility: Record<string, boolean> | undefined, card: string): boolean =>
      cardVisibility?.[card] !== false;

    return {
      fetchData: async (params) => {
        if (!params.clientId) return { rows: [] };
        const [client, qualifications, contracts] = await Promise.all([
          firstValueFrom(this.clientService.getClient(params.clientId)),
          firstValueFrom(this.qualificationService.getQualificationList()),
          firstValueFrom(this.contractService.getList()),
        ]);
        const cardVisibility = params.cardVisibility;
        return {
          rows: isCardVisible(cardVisibility, 'persona') ? (client.addresses ?? []) : [],
          clients: [client],
          metadata: { client, qualifications, contracts, cardVisibility },
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
        const client = context.client as IClient | undefined;
        const qualifications = (context.metadata?.['qualifications'] as IQualification[] | undefined) ?? [];
        const contracts = (context.metadata?.['contracts'] as IContract[] | undefined) ?? [];
        const cardVisibility = context.metadata?.['cardVisibility'] as Record<string, boolean> | undefined;
        const visible = (card: string) => isCardVisible(cardVisibility, card);
        switch (field.dataBinding) {
          case 'client.photo': return visible('image') ? this.resolveClientPhoto(client) : '';
          case 'client.phones': return visible('persona') ? this.joinCommunications(client, true) : '';
          case 'client.emails': return visible('persona') ? this.joinCommunications(client, false) : '';
          case 'client.birthdate': return visible('persona') ? this.formatDate(client?.birthdate) : '';
          case 'client.employmentType': return visible('membership') ? this.resolveEmploymentType(client?.type) : '';
          case 'client.entryDate': return visible('membership') ? this.formatDate(client?.membership?.validFrom) : '';
          case 'client.contractsSummary':
            return visible('contracts') ? this.withSummaryLabel('setting.report.field.clientContractsSummary', this.buildContractsSummary(client, contracts)) : '';
          case 'client.groupsSummary':
            return visible('groups') ? this.withSummaryLabel('setting.report.field.clientGroupsSummary', this.buildGroupsSummary(client)) : '';
          case 'client.qualificationsSummary':
            return visible('qualifications') ? this.withSummaryLabel('setting.report.field.clientQualificationsSummary', this.buildQualificationsSummary(client, qualifications)) : '';
          case 'client.notesSummary':
            return visible('note') ? this.withSummaryLabel('setting.report.field.clientNotesSummary', this.buildNotesSummary(client)) : '';
          default: return this.resolveCommonHeaderValue(field, context) ?? '';
        }
      },
      resolveFooterValue: () => '',
      buildFormulaVariables: (row: any) => ({
        type: row.type ?? 0,
        zip: row.zip ?? '',
        city: row.city ?? '',
        country: row.country ?? '',
        validFrom: row.validFrom ?? '',
      }),
      buildFooterFormulaVariables: (rows: any[]) => ({
        totalRows: rows.length,
      }),
      collectResolvedLabelTexts: () =>
        this.translatedLabels([
          'ADDRES_TYPE0_NAME',
          'ADDRES_TYPE1_NAME',
          'ADDRES_TYPE2_NAME',
          'ADDRES_TYPE_UNDEFINED',
          'address.edit-address.membership.type.employee',
          'address.edit-address.membership.type.externEmp',
          'address.edit-address.membership.type.customer',
          'address.edit-address.qualifications.level.1',
          'address.edit-address.qualifications.level.2',
          'address.edit-address.qualifications.level.3',
          'address.edit-address.qualifications.level.4',
          'address.edit-address.qualifications.level.5',
          'general.yes',
          'general.no',
        ]),
    };
  }

  private clientAvailabilityListProvider(): ReportDataProvider {
    return {
      fetchData: async (params) => {
        const filter: IClientAvailabilityClientFilter = params.clientAvailabilityFilter
          ? { ...params.clientAvailabilityFilter, startRow: 0, rowCount: REPORT_MAX_ROWS }
          : {
            searchString: '',
            startDate: params.startDate ?? '',
            endDate: params.endDate ?? '',
            selectedGroup: params.groupId,
            orderBy: 'name',
            sortOrder: 'asc',
            showEmployees: true,
            showExtern: true,
            individualSort: false,
            startRow: 0,
            rowCount: REPORT_MAX_ROWS,
          };
        const response = await firstValueFrom(this.dataClientAvailability.getClients(filter));
        const clientIds = response.clients.map(c => c.id);
        const totals = clientIds.length > 0
          ? await firstValueFrom(this.dataClientAvailability.getAvailabilityTotals(filter.startDate, filter.endDate, clientIds))
          : [];
        const totalsByClientId = new Map(totals.map(t => [t.clientId, t]));
        const rows = response.clients.map(client => {
          const total = totalsByClientId.get(client.id);
          return {
            ...client,
            totalHours: total?.totalHours ?? 0,
            daysWithAvailability: total?.daysWithAvailability ?? 0,
          };
        });
        return { rows, metadata: { totalCount: rows.length } };
      },
      resolveFieldValue: (field, row) => {
        switch (field.dataBinding) {
          case 'client.list.firstName': return row.firstName ?? '';
          case 'client.list.name': return row.name ?? '';
          case 'client.list.company': return row.company ?? '';
          case 'availability.totalHours': return hoursToHHMM(row.totalHours ?? 0);
          case 'availability.daysWithAvailability': return (row.daysWithAvailability ?? 0).toString();
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
      buildFormulaVariables: (row: any) => ({
        name: row.name ?? '',
        firstName: row.firstName ?? '',
        company: row.company ?? '',
        totalHours: row.totalHours ?? 0,
        daysWithAvailability: row.daysWithAvailability ?? 0,
      }),
      buildFooterFormulaVariables: (rows: any[]) => ({
        totalRows: rows.length,
      }),
    };
  }

  private editClientAvailabilityProvider(): ReportDataProvider {
    return {
      fetchData: async (params) => {
        if (!params.clientId || !params.startDate || !params.endDate) return { rows: [] };
        const [ranges, client] = await Promise.all([
          firstValueFrom(this.dataClientAvailability.getAvailabilityRanges(params.startDate, params.endDate, [params.clientId])),
          firstValueFrom(this.clientService.getClient(params.clientId)),
        ]);
        const rows = [...ranges].sort((a, b) => a.date.localeCompare(b.date));
        return { rows, clients: [client], metadata: { client } };
      },
      resolveFieldValue: (field, row: IClientAvailabilityRange) => {
        switch (field.dataBinding) {
          case 'availability.date': return this.formatDate(row.date);
          case 'availability.weekday': return this.resolveWeekday(new Date(row.date).getDay());
          case 'availability.ranges': return row.ranges ?? '';
          case 'availability.hours': return hoursToHHMM(this.computeHoursFromRanges(row.ranges));
          default: return '';
        }
      },
      resolveHeaderValue: (field, context) => {
        return this.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: () => '',
      buildFormulaVariables: (row: IClientAvailabilityRange) => ({
        date: row.date ?? '',
        ranges: row.ranges ?? '',
        hours: this.computeHoursFromRanges(row.ranges),
      }),
      buildFooterFormulaVariables: (rows: IClientAvailabilityRange[]) => ({
        totalRows: rows.length,
        totalHours: rows.reduce((s, r) => s + this.computeHoursFromRanges(r.ranges), 0),
      }),
      collectResolvedLabelTexts: () => this.translatedWeekdayLabels(),
    };
  }

  private groupProvider(): ReportDataProvider {
    return {
      fetchData: async (params) => {
        const filter = params.groupFilter
          ? { ...params.groupFilter, ...FULL_LIST_PAGINATION }
          : {
            searchString: '',
            orderBy: 'name',
            sortOrder: 'asc',
            ...FULL_LIST_PAGINATION,
            activeDateRange: true,
            formerDateRange: false,
            futureDateRange: false,
            showDeleteEntries: false,
            selectedGroup: params.groupId,
          };
        const response = await firstValueFrom(this.groupService.readGroupList(filter as any));
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
      buildFormulaVariables: (row: any) => ({
        name: row.name ?? '',
        parentName: row.parentName ?? '',
      }),
      buildFooterFormulaVariables: (rows: any[]) => ({
        totalRows: rows.length,
      }),
    };
  }

  private editGroupProvider(): ReportDataProvider {
    return {
      fetchData: async (params) => {
        const groupId = params.groupId ?? (await this.resolveFallbackGroupId());
        if (!groupId) return { rows: [] };

        const [group, path, calendars] = await Promise.all([
          firstValueFrom(this.groupService.getGroup(groupId)),
          firstValueFrom(this.groupService.getPathToNode(groupId)).catch(() => [] as IGroup[]),
          firstValueFrom(this.calendarSelectionService.getList()).catch(() => [] as ICalendarSelection[]),
        ]);
        const treeNode = await this.resolveGroupTreeNode(group);

        const rows = [...(group.groupItems ?? [])].sort((a, b) =>
          `${a.client?.name ?? ''} ${a.client?.firstName ?? ''}`.localeCompare(`${b.client?.name ?? ''} ${b.client?.firstName ?? ''}`)
        );
        return {
          rows,
          metadata: { group, path, calendars, treeNode, totalCount: rows.length },
        };
      },
      resolveFieldValue: (field, row: IGroupItem) => {
        switch (field.dataBinding) {
          case 'groupMember.idNumber': return row.client?.idNumber?.toString() ?? '';
          case 'groupMember.company': return row.client?.company ?? '';
          case 'groupMember.firstName': return row.client?.firstName ?? '';
          case 'groupMember.name': return row.client?.name ?? '';
          case 'groupMember.validFrom': return this.formatDate(row.validFrom);
          case 'groupMember.validUntil': return this.formatDate(row.validUntil);
          default: return '';
        }
      },
      resolveHeaderValue: (field, context) => {
        const group = context.metadata?.['group'] as IGroup | undefined;
        const path = (context.metadata?.['path'] as IGroup[] | undefined) ?? [];
        const calendars = (context.metadata?.['calendars'] as ICalendarSelection[] | undefined) ?? [];
        const treeNode = context.metadata?.['treeNode'] as IGroup | undefined;
        switch (field.dataBinding) {
          case 'group.name': return group?.name ?? '';
          case 'group.description': return this.withSummaryLabel('setting.report.field.groupDescription', htmlToPlainText(group?.description ?? ''));
          case 'group.validFrom': return this.withInlineLabel('setting.report.field.groupValidFrom', this.formatDate(group?.validFrom));
          case 'group.validUntil': return this.withInlineLabel('setting.report.field.groupValidUntil', this.formatDate(group?.validUntil));
          case 'group.path': return this.withInlineLabel('setting.report.field.groupPath', this.buildGroupPath(path, group));
          case 'group.paymentInterval': return this.withInlineLabel('setting.report.field.groupPaymentInterval', this.resolvePaymentInterval(group?.paymentInterval));
          case 'group.calendarName': return this.withInlineLabel('setting.report.field.groupCalendarName', calendars.find(c => c.id === group?.calendarSelectionId)?.name ?? '');
          case 'group.clientsCount': return this.withInlineLabel('setting.report.field.groupClientsCount', (group?.clientsCount ?? 0).toString());
          case 'group.shiftsCount':
            return treeNode
              ? this.withInlineLabel('setting.report.field.groupShiftsCount', (treeNode.shiftsCount ?? 0).toString())
              : '';
          case 'group.membersSummary':
            return this.withSummaryLabel('setting.report.field.groupMembersSummary', this.buildGroupMembersSummary(treeNode));
          case 'group.subGroupsSummary':
            return this.withSummaryLabel('setting.report.field.groupSubGroupsSummary', this.buildSubGroupsSummary(treeNode));
          default: return this.resolveCommonHeaderValue(field, context) ?? '';
        }
      },
      resolveFooterValue: (field, rows) => {
        if (field.dataBinding === 'groupMember.totalCount') return rows.length.toString();
        return '';
      },
      buildFormulaVariables: (row: IGroupItem) => ({
        idNumber: row.client?.idNumber ?? 0,
        company: row.client?.company ?? '',
        firstName: row.client?.firstName ?? '',
        name: row.client?.name ?? '',
      }),
      buildFooterFormulaVariables: (rows: IGroupItem[]) => ({
        totalRows: rows.length,
      }),
      collectResolvedLabelTexts: () =>
        this.translatedLabels([
          ...Object.values(PAYMENT_INTERVAL_LABEL_KEYS),
          'setting.report.field.groupDescription',
          'setting.report.field.groupValidFrom',
          'setting.report.field.groupValidUntil',
          'setting.report.field.groupPath',
          'setting.report.field.groupPaymentInterval',
          'setting.report.field.groupCalendarName',
          'setting.report.field.groupClientsCount',
          'setting.report.field.groupShiftsCount',
          'setting.report.field.groupMembersSummary',
          'setting.report.field.groupSubGroupsSummary',
          'setting.report.field.groupMemberEmployees',
          'setting.report.field.groupMemberExternEmps',
          'setting.report.field.groupMemberCustomers',
        ]),
    };
  }

  private async resolveFallbackGroupId(): Promise<string | undefined> {
    const filter = {
      searchString: '',
      orderBy: 'name',
      sortOrder: 'asc',
      ...FULL_LIST_PAGINATION,
      numberOfItemsPerPage: 1,
      activeDateRange: true,
      formerDateRange: false,
      futureDateRange: false,
      showDeleteEntries: false,
      selectedGroup: undefined,
    };
    try {
      const response = await firstValueFrom(this.groupService.readGroupList(filter as any));
      return response.groups?.[0]?.id;
    } catch {
      return undefined;
    }
  }

  private async resolveGroupTreeNode(group: IGroup): Promise<IGroup | undefined> {
    const rootId = group.root ?? group.id;
    if (!rootId) return undefined;
    try {
      const tree = await firstValueFrom(this.groupService.getGroupTree(rootId));
      return this.findGroupInTree(tree.nodes ?? [], group.id);
    } catch {
      return undefined;
    }
  }

  private findGroupInTree(nodes: IGroup[], id: string | undefined): IGroup | undefined {
    if (!id) return undefined;
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = this.findGroupInTree(node.children ?? [], id);
      if (found) return found;
    }
    return undefined;
  }

  private buildGroupPath(path: IGroup[], group: IGroup | undefined): string {
    const names = path.map(p => p.name).filter(Boolean);
    if (names.length === 0) {
      return group?.name ?? '';
    }
    return names.join(GROUP_PATH_SEPARATOR);
  }

  private resolvePaymentInterval(interval: PaymentInterval | undefined): string {
    const key = PAYMENT_INTERVAL_LABEL_KEYS[interval ?? PaymentInterval.Monthly];
    return key ? this.translate.instant(key) : '';
  }

  private buildGroupMembersSummary(treeNode: IGroup | undefined): string {
    if (!treeNode) return '';
    const parts: string[] = [
      `${this.translate.instant('setting.report.field.groupMemberEmployees')}: ${treeNode.employeesCount ?? 0}`,
      `${this.translate.instant('setting.report.field.groupMemberExternEmps')}: ${treeNode.externEmpsCount ?? 0}`,
      `${this.translate.instant('setting.report.field.groupMemberCustomers')}: ${treeNode.customersCount ?? 0}`,
    ];
    return parts.join('\n');
  }

  private buildSubGroupsSummary(treeNode: IGroup | undefined): string {
    return (treeNode?.children ?? [])
      .filter(child => !!child.name)
      .map(child => `${child.name} (${child.clientsCount ?? 0})`)
      .join('\n');
  }

  private shiftProvider(filterType: ShiftFilterType): ReportDataProvider {
    return {
      fetchData: async (params) => {
        const filter = params.shiftFilter
          ? { ...params.shiftFilter, ...FULL_LIST_PAGINATION, filterType }
          : {
            searchString: '',
            orderBy: 'name',
            sortOrder: 'asc',
            ...FULL_LIST_PAGINATION,
            activeDateRange: true,
            formerDateRange: false,
            futureDateRange: false,
            showDeleteEntries: false,
            filterType,
          };
        const response = await firstValueFrom(this.shiftService.readShiftList(filter as any));
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
      buildFormulaVariables: (row: any) => ({
        name: row.name ?? '',
        abbreviation: row.abbreviation ?? '',
        workTime: row.workTime ?? 0,
        startShift: row.startShift ?? '',
        endShift: row.endShift ?? '',
      }),
      buildFooterFormulaVariables: (rows: any[]) => ({
        totalRows: rows.length,
        totalWorkTime: rows.reduce((s: number, r: any) => s + (r.workTime ?? 0), 0),
      }),
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
      collectResolvedLabelTexts: () => this.translatedWeekdayLabels(),
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
        return this.getScheduleAbbreviation(entry);
      case 'entry.type':
        return this.getEntryTypeLabel(entry.entryType);
      case 'entry.information':
        return entry.information ?? '';
      case 'entry.description':
      case 'expense.description':
        if (entry.description) {
          const lang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
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

  private computeHoursFromRanges(ranges: string): number {
    if (!ranges) return 0;
    return ranges.split(',').reduce((sum, part) => {
      const [start, end] = part.split('-');
      if (!start || !end) return sum;
      const minutes = timeToMinutes(end) - timeToMinutes(start);
      return minutes > 0 ? sum + minutes / 60 : sum;
    }, 0);
  }

  private resolveGender(gender: number | string): string {
    switch (Number(gender)) {
      case 0: return this.translate.instant('general.male');
      case 1: return this.translate.instant('general.female');
      default: return '';
    }
  }

  private resolveClientType(type: number): string {
    switch (Number(type)) {
      case EntityTypeEnum.employee: return this.translate.instant('address.edit-address.membership.type.employee');
      case EntityTypeEnum.externEmp: return this.translate.instant('address.edit-address.membership.type.externEmp');
      case EntityTypeEnum.customer: return this.translate.instant('address.edit-address.membership.type.customer');
      default: return '';
    }
  }

  private resolveAddressType(type: number): string {
    switch (type) {
      case 0: return this.translate.instant('ADDRES_TYPE0_NAME');
      case 1: return this.translate.instant('ADDRES_TYPE1_NAME');
      case 2: return this.translate.instant('ADDRES_TYPE2_NAME');
      default: return this.translate.instant('ADDRES_TYPE_UNDEFINED');
    }
  }

  private withSummaryLabel(i18nKey: string, body: string): string {
    return body ? `${this.translate.instant(i18nKey)}:\n${body}` : '';
  }

  private withInlineLabel(i18nKey: string, value: string): string {
    return value ? `${this.translate.instant(i18nKey)}: ${value}` : '';
  }

  private resolveClientPhoto(client: IClient | undefined): string {
    const image = client?.clientImage;
    if (!image?.imageData || !image.contentType) return '';
    return `data:${image.contentType};base64,${image.imageData}`;
  }

  private joinCommunications(client: IClient | undefined, wantPhone: boolean): string {
    const wantedTypes = new Set(
      (wantPhone
        ? this.clientConfigService.communicationTypePhoneList()
        : this.clientConfigService.communicationTypeEmailList()
      ).map(t => t.type)
    );
    const list = (client?.communications ?? []).filter((c: ICommunication) => wantedTypes.has(c.type));
    const values = list.map((c: ICommunication) => wantPhone ? this.formatPhoneWithPrefix(c) : c.value);
    return values.filter(Boolean).join(', ');
  }

  private formatPhoneWithPrefix(c: ICommunication): string {
    if (!c.prefix) {
      return formatPhoneNumber(c.value);
    }
    const number = formatPhoneNumber(c.value).replace(/[()]/g, '');
    return `(${c.prefix}) ${number}`;
  }

  private resolveEmploymentType(type: number | string | undefined): string {
    switch (Number(type)) {
      case 0: return this.translate.instant('address.edit-address.membership.type.employee');
      case 1: return this.translate.instant('address.edit-address.membership.type.externEmp');
      case 2: return this.translate.instant('address.edit-address.membership.type.customer');
      default: return '';
    }
  }

  private buildContractsSummary(client: IClient | undefined, contracts: IContract[]): string {
    const clientContracts = client?.clientContracts ?? [];
    return clientContracts
      .filter((c: IClientContract) => !!c.contractId)
      .map((c: IClientContract) => {
        const name = contracts.find(x => x.id === c.contractId)?.name ?? '';
        const from = this.formatDate(c.fromDate);
        const until = c.untilDate ? this.formatDate(c.untilDate) : '';
        const period = until ? `${from} – ${until}` : from;
        const active = c.isActive ? this.translate.instant('general.yes') : this.translate.instant('general.no');
        return `${name}: ${period} (${active})`;
      })
      .join('\n');
  }

  private buildGroupsSummary(client: IClient | undefined): string {
    const groups = client?.groupItems ?? [];
    return groups
      .filter(g => !!g.groupName)
      .map(g => {
        const from = this.formatDate(g.validFrom);
        const until = g.validUntil ? this.formatDate(g.validUntil) : '';
        const period = until ? `${from} – ${until}` : from;
        return `${g.groupName}: ${period}`;
      })
      .join('\n');
  }

  private buildQualificationsSummary(client: IClient | undefined, qualifications: IQualification[]): string {
    const items = client?.qualifications ?? [];
    const lang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
    return items
      .filter(q => !!q.qualificationId)
      .map(q => {
        const qualification = qualifications.find(x => x.id === q.qualificationId);
        const name = qualification ? getLocalizedValue(qualification.name, lang) : '';
        const level = this.translate.instant(`address.edit-address.qualifications.level.${q.level}`);
        return `${name} (${level})`;
      })
      .join('\n');
  }

  private buildNotesSummary(client: IClient | undefined): string {
    const notes = (client?.annotations ?? [])
      .map(a => a.note?.trim())
      .filter((n): n is string => !!n);
    return notes.join('\n');
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
        ? this.translate.instant('workChange.abbr.expenses')
        : this.translate.instant('workChange.abbr.reimbursement');
    }
    if (entry.entryType === WorkScheduleEntryType.WorkChange) {
      return this.translate.instant(this.resolveWorkChangeAbbrKey(entry));
    }
    if (entry.entryType === WorkScheduleEntryType.Break) {
      const lang = this.translate.currentLang || DomainMessages.DEFAULT_LANG;
      return this.absenceLookup.getAbbreviationForEntryId(entry.entryId, lang);
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

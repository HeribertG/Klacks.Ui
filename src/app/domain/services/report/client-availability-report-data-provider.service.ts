// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Report data providers for the client availability list (with hour totals per client) and the availability detail
 * of a single client.
 * @param params - Fetch parameters with the screen filter, the period and the client id
 */

import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { DataClientAvailabilityService } from 'src/app/infrastructure/api/client-availability/data-client-availability.service';
import { hoursToHHMM } from 'src/app/domain/helpers/time-format.helper';
import { parseCalendarDate } from 'src/app/domain/helpers/calendar-date.helper';
import { computeHoursFromRanges } from 'src/app/domain/helpers/report-data-value.helper';
import { IClientAvailabilityClientFilter } from 'src/app/domain/models/client-availability/client-availability-client-filter.interface';
import { IClientAvailabilityRange } from 'src/app/domain/models/client-availability/client-availability-range.interface';
import { ClientAvailabilityReportRow } from 'src/app/domain/models/report/client-availability-report-row.interface';
import { ReportDataProvider } from './report-data-provider.interface';
import { ReportValueFormatterService } from './report-value-formatter.service';
import { REPORT_MAX_ROWS } from './report-data-provider.constants';

@Injectable({ providedIn: 'root' })
export class ClientAvailabilityReportDataProviderService {
  private formatter = inject(ReportValueFormatterService);
  private clientService = inject(DataClientService);
  private dataClientAvailability = inject(DataClientAvailabilityService);

  createListProvider(): ReportDataProvider<ClientAvailabilityReportRow> {
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
        return this.formatter.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: (field, rows) => {
        if (field.dataBinding === 'client.totalCount') return rows.length.toString();
        return '';
      },
      buildFormulaVariables: (row) => ({
        name: row.name ?? '',
        firstName: row.firstName ?? '',
        company: row.company ?? '',
        totalHours: row.totalHours ?? 0,
        daysWithAvailability: row.daysWithAvailability ?? 0,
      }),
      buildFooterFormulaVariables: (rows) => ({
        totalRows: rows.length,
      }),
    };
  }

  createDetailProvider(): ReportDataProvider<IClientAvailabilityRange> {
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
          case 'availability.date': return this.formatter.formatDate(row.date);
          case 'availability.weekday': return this.formatter.resolveWeekday(parseCalendarDate(row.date)?.getDay() ?? 0);
          case 'availability.ranges': return row.ranges ?? '';
          case 'availability.hours': return hoursToHHMM(computeHoursFromRanges(row.ranges));
          default: return '';
        }
      },
      resolveHeaderValue: (field, context) => {
        return this.formatter.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: () => '',
      buildFormulaVariables: (row: IClientAvailabilityRange) => ({
        date: row.date ?? '',
        ranges: row.ranges ?? '',
        hours: computeHoursFromRanges(row.ranges),
      }),
      buildFooterFormulaVariables: (rows: IClientAvailabilityRange[]) => ({
        totalRows: rows.length,
        totalHours: rows.reduce((s, r) => s + computeHoursFromRanges(r.ranges), 0),
      }),
      collectResolvedLabelTexts: () => this.formatter.translatedWeekdayLabels(),
    };
  }
}

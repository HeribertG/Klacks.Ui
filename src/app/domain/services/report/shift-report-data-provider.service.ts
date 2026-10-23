// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Report data providers for the shift tables (original, cut and container shifts) and the container template items.
 * @param filterType - Which shift table is printed; it always overrides the filter type of the screen filter
 * @param params - Fetch parameters with the screen filter or the container id
 */

import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { DataContainerTemplateService } from 'src/app/infrastructure/api/container/data-container-template.service';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { ContainerTemplateReportRow } from 'src/app/domain/models/report/container-template-report-row.interface';
import { formatTime, hoursToHHMM } from 'src/app/domain/helpers/time-format.helper';
import { ReportDataProvider } from './report-data-provider.interface';
import { ReportValueFormatterService } from './report-value-formatter.service';
import { FULL_LIST_PAGINATION } from './report-data-provider.constants';

@Injectable({ providedIn: 'root' })
export class ShiftReportDataProviderService {
  private formatter = inject(ReportValueFormatterService);
  private shiftService = inject(DataShiftService);
  private containerTemplateService = inject(DataContainerTemplateService);

  createShiftProvider(filterType: ShiftFilterType): ReportDataProvider<IShift> {
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
        const response = await firstValueFrom(this.shiftService.readShiftList(filter));
        return { rows: response.shifts, metadata: { totalCount: response.maxItems } };
      },
      resolveFieldValue: (field, row) => {
        switch (field.dataBinding) {
          case 'shift.name': return row.name ?? '';
          case 'shift.abbreviation': return row.abbreviation ?? '';
          case 'shift.startShift': return formatTime(row.startShift);
          case 'shift.endShift': return formatTime(row.endShift);
          case 'shift.fromDate': return this.formatter.formatDate(row.fromDate);
          case 'shift.untilDate': return this.formatter.formatDate(row.untilDate);
          case 'shift.workTime': return hoursToHHMM(row.workTime);
          case 'shift.description': return row.description ?? '';
          default: return '';
        }
      },
      resolveHeaderValue: (field, context) => {
        return this.formatter.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: (field, rows) => {
        if (field.dataBinding === 'shift.totalCount') return rows.length.toString();
        return '';
      },
      buildFormulaVariables: (row) => ({
        name: row.name ?? '',
        abbreviation: row.abbreviation ?? '',
        workTime: row.workTime ?? 0,
        startShift: row.startShift ?? '',
        endShift: row.endShift ?? '',
      }),
      buildFooterFormulaVariables: (rows) => ({
        totalRows: rows.length,
        totalWorkTime: rows.reduce((s: number, r) => s + (r.workTime ?? 0), 0),
      }),
    };
  }

  createContainerTemplateProvider(): ReportDataProvider<ContainerTemplateReportRow> {
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
          case 'ct.weekday': return this.formatter.resolveWeekday(row.weekday);
          case 'ct.fromTime': return formatTime(row.startShift ?? row.templateFromTime);
          case 'ct.untilTime': return formatTime(row.endShift ?? row.templateUntilTime);
          case 'ct.shiftName': return row.shift?.name ?? '';
          case 'ct.briefingTime': return formatTime(row.briefingTime);
          case 'ct.debriefingTime': return formatTime(row.debriefingTime);
          case 'ct.travelTimeBefore': return formatTime(row.travelTimeBefore);
          case 'ct.travelTimeAfter': return formatTime(row.travelTimeAfter);
          default: return '';
        }
      },
      resolveHeaderValue: (field, context) => {
        return this.formatter.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: (field, rows) => {
        if (field.dataBinding === 'ct.totalCount') return rows.length.toString();
        return '';
      },
      collectResolvedLabelTexts: () => this.formatter.translatedWeekdayLabels(),
    };
  }
}

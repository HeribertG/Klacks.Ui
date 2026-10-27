// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Report data providers for the group list and the group detail print (members, path, calendar, tree counts).
 * @param params - Fetch parameters with the screen filter and the group id; without a group the first group is used
 * @param context - Header context carrying the fetched group, its path, the calendars and the tree node
 */

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { DataCalendarSelectionService } from 'src/app/infrastructure/api/calendar/data-calendar-selection.service';
import { HTML_TEXT_CONVERTER } from 'src/app/domain/interfaces/html-text-converter.interface';
import { IGroup } from 'src/app/domain/models/group/group.interface';
import { IGroupItem } from 'src/app/domain/models/group/group-item.interface';
import { ICalendarSelection } from 'src/app/domain/models/calendar/calendar-selection.interface';
import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';
import { GroupReportRow } from 'src/app/domain/models/report/group-report-row.interface';
import { buildGroupPath, buildSubGroupsSummary, findGroupInTree } from 'src/app/domain/helpers/report-data-value.helper';
import { ReportDataProvider } from './report-data-provider.interface';
import { ReportValueFormatterService } from './report-value-formatter.service';
import { FULL_LIST_PAGINATION, PAYMENT_INTERVAL_LABEL_KEYS } from './report-data-provider.constants';

@Injectable({ providedIn: 'root' })
export class GroupReportDataProviderService {
  private translate = inject(TranslateService);
  private htmlTextConverter = inject(HTML_TEXT_CONVERTER);
  private formatter = inject(ReportValueFormatterService);
  private groupService = inject(DataGroupService);
  private calendarSelectionService = inject(DataCalendarSelectionService);

  createListProvider(): ReportDataProvider<GroupReportRow> {
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
        const response = await firstValueFrom(this.groupService.readGroupList(filter));
        return { rows: response.groups, metadata: { totalCount: response.maxItems } };
      },
      resolveFieldValue: (field, row) => {
        switch (field.dataBinding) {
          case 'group.name': return row.name ?? '';
          case 'group.description': return row.description ?? '';
          case 'group.validFrom': return this.formatter.formatDate(row.validFrom);
          case 'group.validUntil': return this.formatter.formatDate(row.validUntil);
          case 'group.clientsCount': return row.clientsCount?.toString() ?? '0';
          case 'group.shiftsCount': return row.shiftsCount?.toString() ?? '0';
          default: return '';
        }
      },
      resolveHeaderValue: (field, context) => {
        return this.formatter.resolveCommonHeaderValue(field, context) ?? '';
      },
      resolveFooterValue: (field, rows) => {
        if (field.dataBinding === 'group.totalCount') return rows.length.toString();
        return '';
      },
      buildFormulaVariables: (row) => ({
        name: row.name ?? '',
        parentName: row.parentName ?? '',
      }),
      buildFooterFormulaVariables: (rows) => ({
        totalRows: rows.length,
      }),
    };
  }

  createDetailProvider(): ReportDataProvider<IGroupItem> {
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
          case 'groupMember.validFrom': return this.formatter.formatDate(row.validFrom);
          case 'groupMember.validUntil': return this.formatter.formatDate(row.validUntil);
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
          case 'group.description': return this.formatter.withSummaryLabel('setting.report.field.groupDescription', this.htmlTextConverter.htmlToPlainText(group?.description ?? ''));
          case 'group.validFrom': return this.formatter.withInlineLabel('setting.report.field.groupValidFrom', this.formatter.formatDate(group?.validFrom));
          case 'group.validUntil': return this.formatter.withInlineLabel('setting.report.field.groupValidUntil', this.formatter.formatDate(group?.validUntil));
          case 'group.path': return this.formatter.withInlineLabel('setting.report.field.groupPath', buildGroupPath(path, group));
          case 'group.paymentInterval': return this.formatter.withInlineLabel('setting.report.field.groupPaymentInterval', this.resolvePaymentInterval(group?.paymentInterval));
          case 'group.calendarName': return this.formatter.withInlineLabel('setting.report.field.groupCalendarName', calendars.find(c => c.id === group?.calendarSelectionId)?.name ?? '');
          case 'group.clientsCount': return this.formatter.withInlineLabel('setting.report.field.groupClientsCount', (group?.clientsCount ?? 0).toString());
          case 'group.shiftsCount':
            return treeNode
              ? this.formatter.withInlineLabel('setting.report.field.groupShiftsCount', (treeNode.shiftsCount ?? 0).toString())
              : '';
          case 'group.membersSummary':
            return this.formatter.withSummaryLabel('setting.report.field.groupMembersSummary', this.buildGroupMembersSummary(treeNode));
          case 'group.subGroupsSummary':
            return this.formatter.withSummaryLabel('setting.report.field.groupSubGroupsSummary', buildSubGroupsSummary(treeNode));
          default: return this.formatter.resolveCommonHeaderValue(field, context) ?? '';
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
        this.formatter.translatedLabels([
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
      const response = await firstValueFrom(this.groupService.readGroupList(filter));
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
      return findGroupInTree(tree.nodes ?? [], group.id);
    } catch {
      return undefined;
    }
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
}

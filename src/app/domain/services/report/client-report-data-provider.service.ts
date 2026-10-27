// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Report data providers for the address list and the address detail print, including the client summaries
 * (contracts, groups, qualifications, notes) and the card visibility of the detail mask.
 * @param params - Fetch parameters with the screen filter, the checked rows and the visible cards
 * @param context - Header context carrying the fetched client and the qualification and contract catalogs
 */

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { DataQualificationService } from 'src/app/infrastructure/api/settings/data-qualification.service';
import { DataContractService } from 'src/app/infrastructure/api/contract/data-contract.service';
import { ClientConfigService } from 'src/app/domain/services/client/client-config.service';
import { EntityTypeEnum } from 'src/app/domain/enums/client-enum';
import { IClient, ICommunication, IClientContract } from 'src/app/domain/models/client/client-class';
import { IAddress } from 'src/app/domain/models/client/i-address';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { IContract } from 'src/app/domain/models/contract/contract.interface';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { formatPhoneNumber } from 'src/app/domain/helpers/phone.helper';
import { applyClientSelection, buildNotesSummary } from 'src/app/domain/helpers/report-data-value.helper';
import { ReportDataProvider } from './report-data-provider.interface';
import { ReportValueFormatterService } from './report-value-formatter.service';
import { FULL_LIST_PAGINATION } from './report-data-provider.constants';

@Injectable({ providedIn: 'root' })
export class ClientReportDataProviderService {
  private translate = inject(TranslateService);
  private formatter = inject(ReportValueFormatterService);
  private clientService = inject(DataClientService);
  private qualificationService = inject(DataQualificationService);
  private contractService = inject(DataContractService);
  private clientConfigService = inject(ClientConfigService);

  createListProvider(): ReportDataProvider<IClient> {
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
            withoutGroup: false,
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
        const response = await firstValueFrom(this.clientService.readClientList(filter));
        const rows = applyClientSelection(response.clients, params.clientSelection);
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
          case 'client.list.birthdate': return this.formatter.formatDate(row.birthdate);
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
        idNumber: row.idNumber ?? 0,
        name: row.name ?? '',
        firstName: row.firstName ?? '',
        company: row.company ?? '',
        birthdate: row.birthdate ?? '',
        gender: row.gender ?? 0,
      }),
      buildFooterFormulaVariables: (rows) => ({
        totalRows: rows.length,
      }),
      collectResolvedLabelTexts: () =>
        this.formatter.translatedLabels(['general.male', 'general.female']),
    };
  }

  createDetailProvider(): ReportDataProvider<IAddress> {
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
          case 'address.validFrom': return this.formatter.formatDate(row.validFrom);
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
          case 'client.birthdate': return visible('persona') ? this.formatter.formatDate(client?.birthdate) : '';
          case 'client.employmentType': return visible('membership') ? this.resolveEmploymentType(client?.type) : '';
          case 'client.entryDate': return visible('membership') ? this.formatter.formatDate(client?.membership?.validFrom) : '';
          case 'client.contractsSummary':
            return visible('contracts') ? this.formatter.withSummaryLabel('setting.report.field.clientContractsSummary', this.buildContractsSummary(client, contracts)) : '';
          case 'client.groupsSummary':
            return visible('groups') ? this.formatter.withSummaryLabel('setting.report.field.clientGroupsSummary', this.buildGroupsSummary(client)) : '';
          case 'client.qualificationsSummary':
            return visible('qualifications') ? this.formatter.withSummaryLabel('setting.report.field.clientQualificationsSummary', this.buildQualificationsSummary(client, qualifications)) : '';
          case 'client.notesSummary':
            return visible('note') ? this.formatter.withSummaryLabel('setting.report.field.clientNotesSummary', buildNotesSummary(client)) : '';
          default: return this.formatter.resolveCommonHeaderValue(field, context) ?? '';
        }
      },
      resolveFooterValue: () => '',
      buildFormulaVariables: (row) => ({
        type: row.type ?? 0,
        zip: row.zip ?? '',
        city: row.city ?? '',
        country: row.country ?? '',
        validFrom: row.validFrom ?? '',
      }),
      buildFooterFormulaVariables: (rows) => ({
        totalRows: rows.length,
      }),
      collectResolvedLabelTexts: () =>
        this.formatter.translatedLabels([
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

  private resolveGender(gender: number | string): string {
    switch (Number(gender)) {
      case 0: return this.translate.instant('general.male');
      case 1: return this.translate.instant('general.female');
      default: return '';
    }
  }

  private resolveClientType(type: number | string): string {
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
        const from = this.formatter.formatDate(c.fromDate);
        const until = c.untilDate ? this.formatter.formatDate(c.untilDate) : '';
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
        const from = this.formatter.formatDate(g.validFrom);
        const until = g.validUntil ? this.formatter.formatDate(g.validUntil) : '';
        const period = until ? `${from} – ${until}` : from;
        return `${g.groupName}: ${period}`;
      })
      .join('\n');
  }

  private buildQualificationsSummary(client: IClient | undefined, qualifications: IQualification[]): string {
    const items = client?.qualifications ?? [];
    const lang = this.formatter.currentLanguage();
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
}

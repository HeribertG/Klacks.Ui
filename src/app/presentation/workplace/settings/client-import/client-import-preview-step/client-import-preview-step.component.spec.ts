// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ClientImportPreviewStepComponent } from './client-import-preview-step.component';
import { ClientImportStateService } from 'src/app/domain/services/client/client-import-state.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import {
  CLIENT_IMPORT_FIELDS,
  CLIENT_IMPORT_ISSUE_CODES,
} from 'src/app/domain/constants/client-import.constants';
import { ClientImportIssueSeverity, ClientImportRowStatus } from 'src/app/domain/enums/client-import.enums';
import { IClientImportIssue } from 'src/app/domain/models/client-import/i-client-import-issue';
import { IClientImportPreviewRow } from 'src/app/domain/models/client-import/i-client-import-preview-row';
import { IClientImportRowOverride } from 'src/app/domain/models/client-import/i-client-import-row-override';
import { IClientImportPreviewResult } from 'src/app/domain/models/client-import/i-client-import-preview-result';

const issue = (
  code: string,
  args: Record<string, string> = {},
  field: string | null = null,
  severity = ClientImportIssueSeverity.Warning,
): IClientImportIssue => ({ field, severity, code, args });

const row = (
  status: ClientImportRowStatus,
  issues: IClientImportIssue[] = [],
  rowIndex = 0,
): IClientImportPreviewRow => ({
  rowIndex,
  status,
  record: {
    firstName: null, lastName: null, title: null, gender: null, birthdate: null, street: null, addressLine2: null,
    zip: null, city: null, state: null, country: null, email: null, phone: null, mobile: null,
    entryDate: '2026-01-01', exitDate: null, contractName: null, groupName: null, note: null,
  },
  issues,
  duplicateOfClientId: null,
  duplicateOfName: null,
  duplicateOfRowIndex: null,
});

describe('ClientImportPreviewStepComponent', () => {
  let component: ClientImportPreviewStepComponent;
  let overrides: IClientImportRowOverride[];
  const preview = signal<IClientImportPreviewResult | null>(null);

  beforeEach(() => {
    overrides = [];
    preview.set(null);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ClientImportStateService,
          useValue: {
            countries: signal([{ abbreviation: 'CH', name: { de: 'Schweiz', en: 'Switzerland' } }]),
            overrideFor: (rowIndex: number) => overrides.find((o) => o.rowIndex === rowIndex),
            preview,
          },
        },
        { provide: TranslateService, useValue: { currentLang: 'en', defaultLang: 'en', instant: (key: string) => key } },
        { provide: LocaleService, useValue: { getLocale: () => 'en-US' } },
        { provide: ToastShowService, useValue: { showError: vi.fn() } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new ClientImportPreviewStepComponent());
  });

  describe('issue texts', () => {
    it('resolves every known code to its own key and unknown codes to the generic one', () => {
      for (const code of CLIENT_IMPORT_ISSUE_CODES) {
        expect(component.issueKey(issue(code))).toBe(`clientImport.issue.${code}`);
      }
      expect(component.issueKey(issue('brand-new-code'))).toBe('clientImport.issue.unknown');
    });

    it('uses the reason-specific text only for the reasons the backend defines', () => {
      expect(component.issueKey(issue('invalid-date', { reason: 'future' }))).toBe(
        'clientImport.issueReason.invalid-date.future',
      );
      expect(component.issueKey(issue('invalid-date', { reason: 'exit-before-entry' }))).toBe(
        'clientImport.issueReason.invalid-date.exit-before-entry',
      );
      expect(component.issueKey(issue('unknown-group', { reason: 'ambiguous' }))).toBe(
        'clientImport.issueReason.unknown-group.ambiguous',
      );
      expect(component.issueKey(issue('zip-city-split', { reason: 'not-split' }))).toBe(
        'clientImport.issueReason.zip-city-split.not-split',
      );
      expect(component.issueKey(issue('invalid-date', { reason: 'something-new' }))).toBe(
        'clientImport.issue.invalid-date',
      );
      expect(component.issueKey(issue('invalid-email', { reason: 'future' }))).toBe('clientImport.issue.invalid-email');
    });

    it('passes the arguments on, shows the 0-based row 1-based and keeps raw cell values untouched', () => {
      const params = component.issueParams(issue('duplicate-in-file', { row: '4', value: '31.02.1990' }));

      expect(params).toEqual({ row: '5', value: '31.02.1990', code: 'duplicate-in-file' });
    });

    it('formats ISO date arguments in the language of the user', () => {
      const params = component.issueParams(issue('entry-date-from-policy', { date: '2026-10-01' }));

      expect(params['date']).toBe('10/1/2026');
    });

    it('formats the ISO value of an exit date before the entry date but not the raw cell of a future date', () => {
      const exit = component.issueParams(issue('invalid-date', { value: '2020-03-04', reason: 'exit-before-entry' }));
      const future = component.issueParams(issue('invalid-date', { value: '31.12.2099', reason: 'future' }));

      expect(exit['value']).toBe('3/4/2020');
      expect(future['value']).toBe('31.12.2099');
    });

    it('passes maxLength through', () => {
      expect(component.issueParams(issue('value-too-long', { maxLength: '100' }))['maxLength']).toBe('100');
    });
  });

  describe('cell highlighting', () => {
    const fieldsAndCells: [string, Parameters<ClientImportPreviewStepComponent['cellClass']>[1]][] = [
      [CLIENT_IMPORT_FIELDS.firstName, 'name'],
      [CLIENT_IMPORT_FIELDS.lastName, 'name'],
      [CLIENT_IMPORT_FIELDS.title, 'name'],
      [CLIENT_IMPORT_FIELDS.gender, 'gender'],
      [CLIENT_IMPORT_FIELDS.birthdate, 'birthdate'],
      [CLIENT_IMPORT_FIELDS.street, 'address'],
      [CLIENT_IMPORT_FIELDS.zip, 'address'],
      [CLIENT_IMPORT_FIELDS.city, 'address'],
      [CLIENT_IMPORT_FIELDS.country, 'address'],
      [CLIENT_IMPORT_FIELDS.email, 'contact'],
      [CLIENT_IMPORT_FIELDS.phone, 'contact'],
      [CLIENT_IMPORT_FIELDS.mobile, 'contact'],
      [CLIENT_IMPORT_FIELDS.entryDate, 'dates'],
      [CLIENT_IMPORT_FIELDS.exitDate, 'dates'],
      [CLIENT_IMPORT_FIELDS.contractName, 'assignment'],
      [CLIENT_IMPORT_FIELDS.groupName, 'assignment'],
    ];

    it.each(fieldsAndCells)('places an issue of the backend field "%s" in the %s cell', (field, cell) => {
      const target = row(ClientImportRowStatus.Error, [issue('x', {}, field, ClientImportIssueSeverity.Error)]);

      expect(component.cellClass(target, cell)).toBe('cell-issue-error');
    });

    it('leaves info issues and issues without a field unhighlighted', () => {
      const target = row(ClientImportRowStatus.Ready, [
        issue('x', {}, CLIENT_IMPORT_FIELDS.gender, ClientImportIssueSeverity.Info),
        issue('y', {}, null, ClientImportIssueSeverity.Error),
      ]);

      expect(component.cellClass(target, 'gender')).toBe('');
    });
  });

  describe('skip checkbox', () => {
    it('is checked for rows the user skipped and for rows a rule skipped', () => {
      overrides = [{ rowIndex: 0, skip: true, gender: null, createDuplicate: null }];

      expect(component.isSkipped(row(ClientImportRowStatus.Skipped, [], 0))).toBe(true);
      expect(component.isSkipped(row(ClientImportRowStatus.Ready, [], 0))).toBe(true);
      expect(component.isSkipped(row(ClientImportRowStatus.Skipped, [issue('former-employee-skipped')], 1))).toBe(true);
      expect(component.isSkipped(row(ClientImportRowStatus.Ready, [], 1))).toBe(false);
    });

    it('is locked for rows skipped by a rule because the server ignores skip=false for them', () => {
      expect(component.isSkipLocked(row(ClientImportRowStatus.Skipped, [issue('former-employee-skipped')]))).toBe(true);
      expect(component.isSkipLocked(row(ClientImportRowStatus.Skipped, [issue('duplicate-in-database')]))).toBe(true);
      expect(component.isSkipLocked(row(ClientImportRowStatus.Skipped, [issue('duplicate-in-file')]))).toBe(true);
    });

    it('stays usable for rows skipped by the user and for duplicates that will be created anyway', () => {
      expect(component.isSkipLocked(row(ClientImportRowStatus.Skipped))).toBe(false);
      expect(component.isSkipLocked(row(ClientImportRowStatus.Ready, [issue('duplicate-in-database')]))).toBe(false);
    });
  });

  describe('row issues and notes', () => {
    const previewWithRows = (count: number): IClientImportPreviewResult => ({
      rows: Array.from({ length: count }, (_, index) => row(ClientImportRowStatus.Ready, [], index)),
      summary: { total: count, ready: count, skipped: 0, errors: 0, duplicates: 0, warnings: 0 },
      unmappedColumns: [],
      ignoredTargets: [],
    });

    it('lists only the row-specific issues of a row, errors and warnings before muted info notes', () => {
      const target = row(ClientImportRowStatus.Error, [
        issue('personnel-number-not-imported', {}, null, ClientImportIssueSeverity.Info),
        issue('gender-from-salutation', { value: 'Mr' }, CLIENT_IMPORT_FIELDS.gender, ClientImportIssueSeverity.Info),
        issue('contract-from-policy', { name: 'Full time' }, null, ClientImportIssueSeverity.Info),
        issue('invalid-email', { value: 'x' }, CLIENT_IMPORT_FIELDS.email, ClientImportIssueSeverity.Warning),
        issue('missing-gender', {}, CLIENT_IMPORT_FIELDS.gender, ClientImportIssueSeverity.Error),
      ]);

      expect(component.rowIssues(target).map((entry) => entry.code)).toEqual([
        'missing-gender',
        'invalid-email',
        'gender-from-salutation',
      ]);
      expect(component.severityClass(issue('gender-from-salutation', {}, null, ClientImportIssueSeverity.Info))).toBe(
        'issue-info',
      );
    });

    it('says "all rows" for a note on every row and "n of m rows" otherwise', () => {
      preview.set(previewWithRows(3));
      const note = issue('personnel-number-not-imported', {}, null, ClientImportIssueSeverity.Info);

      expect(component.noteScopeKey({ issue: note, rowCount: 3 })).toBe('clientImport.preview.notesAllRows');
      expect(component.noteScopeKey({ issue: note, rowCount: 2 })).toBe('clientImport.preview.notesSomeRows');
      expect(component.noteScopeParams({ issue: note, rowCount: 2 })).toEqual({ count: 2, total: 3 });
    });
  });

  describe('count texts', () => {
    it('uses the singular key for exactly one and the plural key otherwise', () => {
      expect(component.countKey(component.countKeys.commit, 1)).toBe('clientImport.action.commit.one');
      expect(component.countKey(component.countKeys.commit, 5)).toBe('clientImport.action.commit.other');
      expect(component.countKey(component.countKeys.commitBlocked, 1)).toBe('clientImport.preview.commitBlocked.one');
      expect(component.countKey(component.countKeys.errors, 0)).toBe('clientImport.preview.errors.other');
    });
  });

  describe('country', () => {
    it('shows the localized country name for the abbreviation and falls back to the abbreviation', () => {
      expect(component.countryName('CH')).toBe('Switzerland');
      expect(component.countryName('XX')).toBe('XX');
      expect(component.countryName(null)).toBe('');
    });
  });
});

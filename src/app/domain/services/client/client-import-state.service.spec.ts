// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { ClientImportStateService } from './client-import-state.service';
import { DataClientImportService } from 'src/app/infrastructure/api/client/data-client-import.service';
import { DataContractService } from 'src/app/infrastructure/api/contract/data-contract.service';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { DataCountryStateService } from 'src/app/infrastructure/api/settings/data-country-state.service';
import {
  ClientImportDateFormat,
  ClientImportGender,
  ClientImportIssueSeverity,
  ClientImportNameOrder,
  ClientImportRowStatus,
  ClientImportStep,
  ClientImportTarget,
} from 'src/app/domain/enums/client-import.enums';
import {
  CLIENT_IMPORT_MAX_FILE_SIZE_BYTES,
  CLIENT_IMPORT_PREVIEW_DEBOUNCE_MS,
} from 'src/app/domain/constants/client-import.constants';
import { IClientImportParseResult } from 'src/app/domain/models/client-import/i-client-import-parse-result';
import { IClientImportPreviewResult } from 'src/app/domain/models/client-import/i-client-import-preview-result';
import { IClientImportPreviewRow } from 'src/app/domain/models/client-import/i-client-import-preview-row';
import { IClientImportRequest } from 'src/app/domain/models/client-import/i-client-import-request';
import { IClientImportCommitResult } from 'src/app/domain/models/client-import/i-client-import-commit-result';

const parseResult: IClientImportParseResult = {
  token: 'token-1',
  fileName: 'staff.csv',
  sheets: [],
  sheetName: null,
  headerRowIndex: 0,
  columns: [
    { index: 0, header: 'Vorname', samples: ['Anna'] },
    { index: 1, header: 'Name', samples: ['Muster'] },
    { index: 2, header: 'Geburtstag', samples: ['01.02.1990'] },
  ],
  rows: [['Anna', 'Muster', '01.02.1990']],
  mapping: [
    { columnIndex: 0, target: ClientImportTarget.FirstName, confidence: 0.9 },
    { columnIndex: 1, target: ClientImportTarget.LastName, confidence: 0.9 },
  ],
  dateFormat: ClientImportDateFormat.DayMonthYear,
  dateFormatAmbiguous: true,
  nameOrder: ClientImportNameOrder.LastFirst,
  delimiter: ';',
  encoding: 'windows-1252',
};

function row(status: ClientImportRowStatus, rowIndex = 0): IClientImportPreviewRow {
  return {
    rowIndex,
    status,
    record: {
      firstName: 'Anna', lastName: 'Muster', title: null, gender: null, birthdate: null, street: null,
      addressLine2: null, zip: null, city: null, state: null, country: null, email: null, phone: null,
      mobile: null, entryDate: '2026-01-01', exitDate: null, contractName: null, groupName: null, note: null,
    },
    issues: status === ClientImportRowStatus.Error
      ? [{ field: 'gender', severity: ClientImportIssueSeverity.Error, code: 'missing-gender', args: {} }]
      : [],
    duplicateOfClientId: null,
    duplicateOfName: null,
    duplicateOfRowIndex: null,
  };
}

function previewOf(...rows: IClientImportPreviewRow[]): IClientImportPreviewResult {
  return {
    rows,
    summary: { total: rows.length, ready: 0, skipped: 0, errors: 0, duplicates: 0, warnings: 0 },
    unmappedColumns: [],
    ignoredTargets: [],
  };
}

describe('ClientImportStateService', () => {
  let service: ClientImportStateService;
  let dataService: {
    parse: ReturnType<typeof vi.fn>;
    preview: ReturnType<typeof vi.fn>;
    commit: ReturnType<typeof vi.fn>;
    downloadTemplate: ReturnType<typeof vi.fn>;
  };
  let previewResponses: Subject<IClientImportPreviewResult>[];

  const csvFile = () => new File(['a;b'], 'staff.csv', { type: 'text/csv' });

  function nextPreview(): Subject<IClientImportPreviewResult> {
    return previewResponses[previewResponses.length - 1];
  }

  async function parsedService(): Promise<void> {
    await service.selectFile(csvFile());
  }

  async function onPreviewStepWith(result: IClientImportPreviewResult): Promise<void> {
    await parsedService();
    service.goToPreview();
    vi.advanceTimersByTime(0);
    nextPreview().next(result);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    previewResponses = [];
    dataService = {
      parse: vi.fn(() => of(parseResult)),
      preview: vi.fn(() => {
        const subject = new Subject<IClientImportPreviewResult>();
        previewResponses.push(subject);
        return subject;
      }),
      commit: vi.fn(),
      downloadTemplate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ClientImportStateService,
        { provide: DataClientImportService, useValue: dataService },
        { provide: DataContractService, useValue: { getList: vi.fn(() => of([{ id: 'c1', name: 'Vollzeit' }])) } },
        {
          provide: DataGroupService,
          useValue: {
            getGroupTree: vi.fn(() =>
              of({ nodes: [{ id: 'g1', name: 'Zürich', children: [{ id: 'g2', name: 'Altstadt', children: [] }] }] }),
            ),
          },
        },
        { provide: DataCountryStateService, useValue: { getCountryList: vi.fn(() => of([])) } },
      ],
    });
    service = TestBed.inject(ClientImportStateService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('flattens the group tree with depth and leaves the group rule unset', async () => {
      await service.initialize();

      expect(service.groups()).toEqual([
        { id: 'g1', name: 'Zürich', depth: 0 },
        { id: 'g2', name: 'Altstadt', depth: 1 },
      ]);
      expect(service.policy().groupId).toBeNull();
    });
  });

  describe('file step', () => {
    it('rejects an unsupported extension without calling the server', async () => {
      const ok = await service.selectFile(new File(['x'], 'staff.pdf'));

      expect(ok).toBe(false);
      expect(service.fileErrorCode()).toBe('file-unsupported');
      expect(dataService.parse).not.toHaveBeenCalled();
      expect(service.step()).toBe(ClientImportStep.File);
    });

    it('rejects a file above the size limit without calling the server', async () => {
      const big = new File(['x'], 'staff.xlsx');
      Object.defineProperty(big, 'size', { value: CLIENT_IMPORT_MAX_FILE_SIZE_BYTES + 1 });

      const ok = await service.selectFile(big);

      expect(ok).toBe(false);
      expect(service.fileErrorCode()).toBe('file-too-large');
      expect(dataService.parse).not.toHaveBeenCalled();
    });

    it('moves to the mapping step with the detected mapping completed for every column', async () => {
      await parsedService();

      expect(service.step()).toBe(ClientImportStep.Mapping);
      expect(service.mapping()).toEqual([
        { columnIndex: 0, target: ClientImportTarget.FirstName, confidence: 0.9 },
        { columnIndex: 1, target: ClientImportTarget.LastName, confidence: 0.9 },
        { columnIndex: 2, target: ClientImportTarget.Ignore, confidence: 0 },
      ]);
      expect(service.dateFormat()).toBe(ClientImportDateFormat.DayMonthYear);
      expect(service.nameOrder()).toBe(ClientImportNameOrder.LastFirst);
    });

    it('preselects day-month-year when the server could not decide and proposes another order anyway', async () => {
      dataService.parse.mockReturnValueOnce(
        of({ ...parseResult, dateFormat: ClientImportDateFormat.MonthDayYear, dateFormatAmbiguous: true }),
      );

      await service.selectFile(csvFile());

      expect(service.dateFormat()).toBe(ClientImportDateFormat.DayMonthYear);
    });

    it('keeps an order the server proved from the data', async () => {
      dataService.parse.mockReturnValueOnce(
        of({ ...parseResult, dateFormat: ClientImportDateFormat.MonthDayYear, dateFormatAmbiguous: false }),
      );

      await service.selectFile(csvFile());

      expect(service.dateFormat()).toBe(ClientImportDateFormat.MonthDayYear);
    });

    it('reads errorCode when the body carries no code property', async () => {
      dataService.parse.mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status: 400, error: { errorCode: 'invalid-request' } })),
      );

      await service.selectFile(csvFile());

      expect(service.fileErrorCode()).toBe('invalid-request');
    });

    it('stays on the file step and exposes the server error code when parsing fails', async () => {
      dataService.parse.mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status: 400, error: { code: 'no-header-row' } })),
      );

      const ok = await service.selectFile(csvFile());

      expect(ok).toBe(false);
      expect(service.step()).toBe(ClientImportStep.File);
      expect(service.fileErrorCode()).toBe('no-header-row');
    });

    it('reports an uncoded server failure as unknown instead of blaming the file format', async () => {
      dataService.parse.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));

      await service.selectFile(csvFile());

      expect(service.fileErrorCode()).toBe('unknown');
    });

    it('maps a 413 from the server size limit to file-too-large', async () => {
      dataService.parse.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 413 })));

      await service.selectFile(csvFile());

      expect(service.fileErrorCode()).toBe('file-too-large');
    });

    it('reads an uncoded 400 for a file at the size limit as file-too-large', async () => {
      const big = new File(['x'], 'staff.csv');
      Object.defineProperty(big, 'size', { value: CLIENT_IMPORT_MAX_FILE_SIZE_BYTES });
      dataService.parse.mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status: 400, error: { title: 'Bad Request' } })),
      );

      await service.selectFile(big);

      expect(service.fileErrorCode()).toBe('file-too-large');
    });

    it('keeps an uncoded 400 for a small file as unknown', async () => {
      dataService.parse.mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status: 400, error: { title: 'Bad Request' } })),
      );

      await service.selectFile(csvFile());

      expect(service.fileErrorCode()).toBe('unknown');
    });

    it('re-parses the same file for another sheet', async () => {
      const file = new File(['x'], 'staff.xlsx');
      await service.selectFile(file);

      await service.selectSheet('Team B');

      expect(dataService.parse).toHaveBeenLastCalledWith(file, 'Team B');
    });
  });

  describe('mapping', () => {
    beforeEach(async () => parsedService());

    it('keeps every target unique by resetting the column that held it before', () => {
      service.setColumnTarget(2, ClientImportTarget.FirstName);

      expect(service.mapping()[0].target).toBe(ClientImportTarget.Ignore);
      expect(service.mapping()[2]).toEqual({ columnIndex: 2, target: ClientImportTarget.FirstName, confidence: 1 });
    });

    it('allows Ignore on any number of columns', () => {
      service.setColumnTarget(0, ClientImportTarget.Ignore);
      service.setColumnTarget(1, ClientImportTarget.Ignore);

      expect(service.mapping().filter((m) => m.target === ClientImportTarget.Ignore)).toHaveLength(3);
    });

    it('knows whether a full-name or a date column is mapped', () => {
      expect(service.isFullNameMapped()).toBe(false);
      expect(service.isDateTargetMapped()).toBe(false);

      service.setColumnTarget(0, ClientImportTarget.FullName);
      service.setColumnTarget(2, ClientImportTarget.Birthdate);

      expect(service.isFullNameMapped()).toBe(true);
      expect(service.isDateTargetMapped()).toBe(true);
    });

    it('asks for the date order again when another column is mapped as date and the data does not prove it', () => {
      expect(service.dateFormatNeedsChoice()).toBe(false);

      service.setColumnTarget(2, ClientImportTarget.Birthdate);

      expect(service.dateFormatNeedsChoice()).toBe(true);
      expect(service.dateFormat()).toBe(ClientImportDateFormat.DayMonthYear);
    });

    it('adopts the order that the data of a newly mapped date column proves', async () => {
      dataService.parse.mockReturnValueOnce(
        of({ ...parseResult, rows: [['Anna', 'Muster', '12/31/1990'], ['Ben', 'Test', '01/02/1991']] }),
      );
      await service.selectFile(csvFile());

      service.setColumnTarget(2, ClientImportTarget.Birthdate);

      expect(service.dateFormat()).toBe(ClientImportDateFormat.MonthDayYear);
      expect(service.dateFormatNeedsChoice()).toBe(false);
    });

    it('keeps the order the user chose when columns are mapped again', () => {
      service.setColumnTarget(2, ClientImportTarget.Birthdate);
      service.setDateFormat(ClientImportDateFormat.MonthDayYear);

      service.setColumnTarget(0, ClientImportTarget.Title);
      service.setColumnTarget(2, ClientImportTarget.EntryDate);

      expect(service.dateFormat()).toBe(ClientImportDateFormat.MonthDayYear);
      expect(service.dateFormatNeedsChoice()).toBe(false);
    });

    it('knows whether a first or last name column is mapped', () => {
      expect(service.isFirstOrLastNameMapped()).toBe(true);

      service.setColumnTarget(0, ClientImportTarget.Ignore);
      service.setColumnTarget(1, ClientImportTarget.Ignore);

      expect(service.isFirstOrLastNameMapped()).toBe(false);
    });

    it('does not request a preview while still on the mapping step', () => {
      service.setColumnTarget(2, ClientImportTarget.Birthdate);
      vi.advanceTimersByTime(CLIENT_IMPORT_PREVIEW_DEBOUNCE_MS * 2);

      expect(dataService.preview).not.toHaveBeenCalled();
    });

    it('stores the entry date as a plain yyyy-MM-dd calendar key', () => {
      service.setEntryDate('2026-10-01');
      expect(service.policy().entryDate).toBe('2026-10-01');

      service.setEntryDate('');
      expect(service.policy().entryDate).toBeNull();
    });
  });

  describe('preview', () => {
    it('requests the preview immediately when entering the preview step', async () => {
      await parsedService();

      service.goToPreview();
      vi.advanceTimersByTime(0);

      expect(service.step()).toBe(ClientImportStep.Preview);
      expect(dataService.preview).toHaveBeenCalledTimes(1);
      const request = dataService.preview.mock.calls[0][0] as IClientImportRequest;
      expect(request.token).toBe('token-1');
      expect(request.mapping).toHaveLength(3);
      expect(request.rows).toEqual(parseResult.rows);
    });

    it('debounces a burst of changes into a single preview request with the latest state', async () => {
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Ready)));
      dataService.preview.mockClear();

      service.setRowSkip(0, true);
      vi.advanceTimersByTime(CLIENT_IMPORT_PREVIEW_DEBOUNCE_MS / 2);
      service.setRowGender(0, ClientImportGender.Female);
      vi.advanceTimersByTime(CLIENT_IMPORT_PREVIEW_DEBOUNCE_MS / 2);
      service.updatePolicy({ contractId: 'c1' });

      expect(dataService.preview).not.toHaveBeenCalled();
      vi.advanceTimersByTime(CLIENT_IMPORT_PREVIEW_DEBOUNCE_MS);

      expect(dataService.preview).toHaveBeenCalledTimes(1);
      const request = dataService.preview.mock.calls[0][0] as IClientImportRequest;
      expect(request.rowOverrides).toEqual([
        { rowIndex: 0, skip: true, gender: ClientImportGender.Female, createDuplicate: null },
      ]);
      expect(request.policy.contractId).toBe('c1');
    });

    it('never sends skip=false because the server only honours skip=true', async () => {
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Ready)));

      service.setRowSkip(0, true);
      service.setRowSkip(0, false);

      expect(service.rowOverrides()).toEqual([]);
    });

    it('drops an override again once all its decisions are reset', async () => {
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Ready)));

      service.setRowGender(0, ClientImportGender.Male);
      service.setRowGender(0, null);

      expect(service.rowOverrides()).toEqual([]);
    });

    it('ignores the response of a superseded preview request', async () => {
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Ready)));

      service.setRowSkip(0, true);
      vi.advanceTimersByTime(CLIENT_IMPORT_PREVIEW_DEBOUNCE_MS);
      const stale = nextPreview();
      service.setRowSkip(0, false);
      vi.advanceTimersByTime(CLIENT_IMPORT_PREVIEW_DEBOUNCE_MS);
      const fresh = nextPreview();

      stale.next(previewOf(row(ClientImportRowStatus.Error)));
      fresh.next(previewOf(row(ClientImportRowStatus.Skipped)));

      expect(service.preview()?.rows[0].status).toBe(ClientImportRowStatus.Skipped);
      expect(service.isPreviewPending()).toBe(false);
    });

    it('filters the rows down to problems on request', async () => {
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Ready, 0), row(ClientImportRowStatus.Error, 1)));

      service.showOnlyProblems.set(true);

      expect(service.visibleRows().map((r) => r.rowIndex)).toEqual([1]);
    });

    it('does not treat rows with only info notes as problems', async () => {
      const noted = row(ClientImportRowStatus.Ready, 0);
      noted.issues = [
        { field: null, severity: ClientImportIssueSeverity.Info, code: 'personnel-number-not-imported', args: {} },
        { field: 'gender', severity: ClientImportIssueSeverity.Info, code: 'gender-from-salutation', args: {} },
      ];
      await onPreviewStepWith(previewOf(noted, row(ClientImportRowStatus.Error, 1)));

      service.showOnlyProblems.set(true);

      expect(service.visibleRows().map((r) => r.rowIndex)).toEqual([1]);
    });

    it('collects general notes once and drops the ignored-target hint they already explain', async () => {
      const personnelNumber = {
        field: null,
        severity: ClientImportIssueSeverity.Info,
        code: 'personnel-number-not-imported',
        args: {},
      };
      const first = row(ClientImportRowStatus.Ready, 0);
      const second = row(ClientImportRowStatus.Ready, 1);
      first.issues = [personnelNumber];
      second.issues = [personnelNumber];
      const result = previewOf(first, second);
      result.ignoredTargets = [ClientImportTarget.PersonnelNumber];

      await onPreviewStepWith(result);

      expect(service.issueSummary().map((entry) => [entry.issue.code, entry.rowCount])).toEqual([
        ['personnel-number-not-imported', 2],
      ]);
      expect(service.ignoredTargetHints()).toEqual([]);
    });

    it('keeps the ignored-target hint while no row carries the matching note', async () => {
      const result = previewOf(row(ClientImportRowStatus.Ready, 0));
      result.ignoredTargets = [ClientImportTarget.PersonnelNumber];

      await onPreviewStepWith(result);

      expect(service.issueSummary()).toEqual([]);
      expect(service.ignoredTargetHints()).toEqual([ClientImportTarget.PersonnelNumber]);
    });

    it('marks the preview as failed when the request errors', async () => {
      await parsedService();
      service.goToPreview();
      vi.advanceTimersByTime(0);

      nextPreview().error(new HttpErrorResponse({ status: 500 }));

      expect(service.previewFailed()).toBe(true);
      expect(service.isPreviewPending()).toBe(false);
      expect(service.canCommit()).toBe(false);
      expect(service.previewErrorKey()).toBe('clientImport.error.preview');
    });

    it('explains a rejected preview request with the translated error code', async () => {
      await parsedService();
      service.goToPreview();
      vi.advanceTimersByTime(0);

      nextPreview().error(new HttpErrorResponse({ status: 400, error: { code: 'invalid-policy' } }));

      expect(service.previewErrorCode()).toBe('invalid-policy');
      expect(service.previewErrorKey()).toBe('clientImport.error.invalid-policy');
    });

    it('stops pending previews when going back to the mapping step', async () => {
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Ready)));
      service.setRowSkip(0, true);
      dataService.preview.mockClear();

      service.backToMapping();
      vi.advanceTimersByTime(CLIENT_IMPORT_PREVIEW_DEBOUNCE_MS * 2);

      expect(dataService.preview).not.toHaveBeenCalled();
      expect(service.step()).toBe(ClientImportStep.Mapping);
      expect(service.isPreviewPending()).toBe(false);
    });
  });

  describe('commit guard', () => {
    const commitResult: IClientImportCommitResult = { batchId: 'b1', created: 1, skipped: 0, geocodingQueued: 1 };

    it('allows the commit only with a fresh preview that has ready rows and no error rows', async () => {
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Ready)));

      expect(service.canCommit()).toBe(true);
    });

    it('blocks the commit while a row still has status Error', async () => {
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Ready, 0), row(ClientImportRowStatus.Error, 1)));

      expect(service.canCommit()).toBe(false);
      expect(await service.commit()).toBe(false);
      expect(dataService.commit).not.toHaveBeenCalled();
    });

    it('blocks the commit when nothing would be created', async () => {
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Skipped)));

      expect(service.canCommit()).toBe(false);
    });

    it('blocks the commit during the debounce window after a change', async () => {
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Ready)));

      service.setRowSkip(0, false);

      expect(service.isPreviewPending()).toBe(true);
      expect(service.canCommit()).toBe(false);
      expect(await service.commit()).toBe(false);
      expect(dataService.commit).not.toHaveBeenCalled();
    });

    it('sends the commit only once on a double click and shows the result', async () => {
      const response = new Subject<IClientImportCommitResult>();
      dataService.commit.mockReturnValue(response);
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Ready)));

      const first = service.commit();
      const second = service.commit();

      expect(service.isCommitting()).toBe(true);
      expect(await second).toBe(false);
      response.next(commitResult);
      response.complete();
      expect(await first).toBe(true);

      expect(dataService.commit).toHaveBeenCalledTimes(1);
      expect(service.step()).toBe(ClientImportStep.Result);
      expect(service.commitResult()).toEqual(commitResult);
      expect(service.isCommitting()).toBe(false);
    });

    it('stays on the preview step, keeps the error code and refreshes the preview when the commit fails', async () => {
      dataService.commit.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'already-committed' } })),
      );
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Ready)));
      dataService.preview.mockClear();

      const ok = await service.commit();
      vi.advanceTimersByTime(0);

      expect(ok).toBe(false);
      expect(service.step()).toBe(ClientImportStep.Preview);
      expect(service.commitErrorCode()).toBe('already-committed');
      expect(service.commitAlreadyDone()).toBe(true);
      expect(service.commitErrorKey()).toBe('clientImport.error.alreadyCommitted');
      expect(dataService.preview).toHaveBeenCalledTimes(1);
    });

    it('treats a conflict without readable body as already committed', async () => {
      dataService.commit.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Ready)));

      await service.commit();

      expect(service.commitErrorKey()).toBe('clientImport.error.alreadyCommitted');
    });

    it('explains rows that still have errors on the server with their own message', async () => {
      dataService.commit.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 400, error: { code: 'rows-have-errors', errorCode: 'rows-have-errors' } })),
      );
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Ready)));

      await service.commit();

      expect(service.commitErrorKey()).toBe('clientImport.error.rows-have-errors');
    });

    it('does not claim an earlier commit for a failure other than a conflict', async () => {
      dataService.commit.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Ready)));

      expect(await service.commit()).toBe(false);

      expect(service.commitAlreadyDone()).toBe(false);
      expect(service.commitErrorCode()).toBeNull();
      expect(service.commitErrorKey()).toBe('clientImport.error.commit');
    });
  });

  describe('template download', () => {
    const template = { blob: new Blob(['xlsx']), fileName: 'klacks-employee-import-en.xlsx' };

    it('returns the template of the requested language', async () => {
      dataService.downloadTemplate.mockReturnValue(of(template));

      expect(await service.downloadTemplate('fr')).toBe(template);
      expect(dataService.downloadTemplate).toHaveBeenCalledWith('fr');
    });

    it('falls back to English when the server rejects the language (error body arrives as blob)', async () => {
      const body = new Blob(['']);
      Object.defineProperty(body, 'text', {
        value: () => Promise.resolve(JSON.stringify({ code: 'unsupported-language', errorCode: 'unsupported-language' })),
      });
      const rejected = new HttpErrorResponse({ status: 400, error: body });
      dataService.downloadTemplate.mockImplementation((language: string) =>
        language === 'en' ? of(template) : throwError(() => rejected),
      );

      expect(await service.downloadTemplate('xx')).toBe(template);
      expect(dataService.downloadTemplate).toHaveBeenNthCalledWith(1, 'xx');
      expect(dataService.downloadTemplate).toHaveBeenNthCalledWith(2, 'en');
    });

    it('does not retry for other failures', async () => {
      dataService.downloadTemplate.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

      await expect(service.downloadTemplate('xx')).rejects.toBeInstanceOf(HttpErrorResponse);
      expect(dataService.downloadTemplate).toHaveBeenCalledTimes(1);
    });

    it('does not retry English forever when English itself is rejected', async () => {
      const rejected = new HttpErrorResponse({ status: 400, error: { code: 'unsupported-language' } });
      dataService.downloadTemplate.mockReturnValue(throwError(() => rejected));

      await expect(service.downloadTemplate('en')).rejects.toBe(rejected);
      expect(dataService.downloadTemplate).toHaveBeenCalledTimes(1);
    });
  });

  describe('restart', () => {
    it('returns to an empty file step', async () => {
      await onPreviewStepWith(previewOf(row(ClientImportRowStatus.Ready)));

      service.restart();

      expect(service.step()).toBe(ClientImportStep.File);
      expect(service.parseResult()).toBeNull();
      expect(service.preview()).toBeNull();
      expect(service.buildRequest()).toBeNull();
    });
  });
});

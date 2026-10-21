// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { delay, of, throwError, Subject, Subscription } from 'rxjs';
import { DataManagementErpDropPointService } from './data-management-erp-drop-point.service';
import { DataErpDropPointService } from 'src/app/infrastructure/api/settings/data-erp-drop-point.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { IErpDropPoint } from 'src/app/domain/models/settings/erp-drop-point';
import { IErpDropPointFiles } from 'src/app/domain/models/settings/erp-drop-point-files.interface';
import { IErpDropPointRequest } from 'src/app/domain/models/settings/erp-drop-point-request.interface';
import { IErpImportFile } from 'src/app/domain/models/settings/erp-import-file';
import { ErpImportFileStatus } from 'src/app/domain/enums/erp-import-file-status.enum';
import { ErpImportChannel } from 'src/app/domain/enums/erp-import-channel.enum';
import {
  ERP_IMPORT_FILE_FAILURE_REASONS,
  ERP_IMPORT_FILES_I18N,
  ERP_IMPORT_POLLING,
  ERP_ORDER_UPLOAD_VALIDATION_MESSAGES,
} from 'src/app/domain/constants/erp-import-file.constants';

describe('DataManagementErpDropPointService', () => {
  let service: DataManagementErpDropPointService;
  let mockEventBus: any;
  let mockDataService: any;

  const dropPoint: IErpDropPoint = {
    id: 'dp-1',
    name: 'Default',
    sourceSystemId: 'default',
    bucketPrefix: '',
    isEnabled: true,
  };

  const request: IErpDropPointRequest = {
    name: 'Default',
    sourceSystemId: 'default',
    bucketPrefix: '',
    isEnabled: false,
  };

  const importFile = (id: string, status: ErpImportFileStatus, overrides: Partial<IErpImportFile> = {}): IErpImportFile => ({
    id,
    fileName: `${id}.xml`,
    sizeBytes: 512,
    status,
    channel: ErpImportChannel.UiUpload,
    uploadedBy: 'admin',
    receivedAt: '2026-10-19T08:00:00Z',
    startedAt: null,
    finishedAt: null,
    processedOrders: 0,
    totalOrders: null,
    newCount: 0,
    updatedCount: 0,
    unchangedCount: 0,
    supersededCount: 0,
    rejectedCount: 0,
    failureReason: null,
    duplicateOfReceivedAt: null,
    rejectedOrders: [],
    ...overrides,
  });

  const isProcessed = (status: ErpImportFileStatus): boolean =>
    status === ErpImportFileStatus.Completed || status === ErpImportFileStatus.CompletedWithWarnings;

  const isFailed = (status: ErpImportFileStatus): boolean =>
    status === ErpImportFileStatus.Failed || status === ErpImportFileStatus.Interrupted;

  const listing = (...rows: IErpImportFile[]): IErpDropPointFiles => ({
    inbox: rows.filter((row) => !isProcessed(row.status) && !isFailed(row.status)),
    processed: rows.filter((row) => isProcessed(row.status)),
    failed: rows.filter((row) => isFailed(row.status)),
  });

  const counts: Partial<IErpImportFile> = {
    totalOrders: 5,
    processedOrders: 5,
    newCount: 2,
    updatedCount: 1,
    unchangedCount: 1,
    supersededCount: 0,
  };

  const files: IErpDropPointFiles = listing(
    importFile('inbox-1', ErpImportFileStatus.Received),
    importFile('broken-1', ErpImportFileStatus.Failed, { failureReason: 'Invalid XML' }),
  );

  const translated = (key: string, params?: Record<string, unknown>): string =>
    params && Object.keys(params).length > 0
      ? `${key}(${Object.entries(params).map(([name, value]) => `${name}=${value}`).join(',')})`
      : key;

  const emittedPayloads = (
    type: DomainEventType,
  ): { message: string; messageParams?: Record<string, unknown>; code?: string; context?: string }[] =>
    (mockEventBus.emit.mock.calls as [DomainEventType, { message: string; messageParams?: Record<string, unknown>; code?: string }][])
      .filter(([eventType]) => eventType === type)
      .map(([, payload]) => payload);

  const emittedMessages = (type: DomainEventType): string[] =>
    emittedPayloads(type).map((payload) => translated(payload.message, payload.messageParams));

  beforeEach(() => {
    const eventBusSpy = {
      emit: vi.fn(),
      on: vi.fn(),
      onAny: vi.fn(),
    };
    const dataSpy = {
      getDefaultDropPoint: vi.fn(),
      updateDropPoint: vi.fn(),
      uploadFile: vi.fn(),
      getFiles: vi.fn(),
      retryFile: vi.fn(),
      deleteFile: vi.fn(),
      triggerImportRun: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        DataManagementErpDropPointService,
        { provide: EVENT_BUS_TOKEN, useValue: eventBusSpy },
        { provide: DataErpDropPointService, useValue: dataSpy },
        { provide: TranslateService, useValue: { instant: vi.fn(translated) } },
      ],
    });

    service = TestBed.inject(DataManagementErpDropPointService);
    mockEventBus = TestBed.inject(EVENT_BUS_TOKEN) as any;
    mockDataService = TestBed.inject(DataErpDropPointService) as any;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadDefaultDropPoint', () => {
    it('sets the defaultDropPoint signal and returns the drop point on success', async () => {
      mockDataService.getDefaultDropPoint.mockReturnValue(of(dropPoint));

      const result = await service.loadDefaultDropPoint();

      expect(result).toEqual(dropPoint);
      expect(service.defaultDropPoint()).toEqual(dropPoint);
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('sets isLoading while the request is pending and resets it afterwards', async () => {
      const subject = new Subject<IErpDropPoint>();
      mockDataService.getDefaultDropPoint.mockReturnValue(subject.asObservable());

      const promise = service.loadDefaultDropPoint();
      expect(service.isLoading()).toBe(true);

      subject.next(dropPoint);
      subject.complete();
      await promise;

      expect(service.isLoading()).toBe(false);
    });

    it('returns null, emits an ERROR event and resets isLoading on failure', async () => {
      mockDataService.getDefaultDropPoint.mockReturnValue(throwError(() => new Error('network')));

      const result = await service.loadDefaultDropPoint();

      expect(result).toBeNull();
      expect(service.defaultDropPoint()).toBeNull();
      expect(service.isLoading()).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.ERROR,
        expect.objectContaining({ message: 'settings.erp-drop-points.error.load' })
      );
    });
  });

  describe('updateDropPoint', () => {
    it('sets the defaultDropPoint signal to the updated resource and emits a SUCCESS event', async () => {
      const updated: IErpDropPoint = { ...dropPoint, isEnabled: false };
      service.defaultDropPoint.set(dropPoint);
      mockDataService.updateDropPoint.mockReturnValue(of(updated));

      const result = await service.updateDropPoint(dropPoint.id, request);

      expect(result).toEqual(updated);
      expect(service.defaultDropPoint()).toEqual(updated);
      expect(mockDataService.updateDropPoint).toHaveBeenCalledWith(dropPoint.id, request);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.SUCCESS,
        expect.objectContaining({ message: 'settings.erp-drop-points.success.update' })
      );
    });

    it('returns undefined, keeps the signal unchanged and emits an ERROR event on failure', async () => {
      service.defaultDropPoint.set(dropPoint);
      mockDataService.updateDropPoint.mockReturnValue(throwError(() => new Error('network')));

      const result = await service.updateDropPoint(dropPoint.id, request);

      expect(result).toBeUndefined();
      expect(service.defaultDropPoint()).toEqual(dropPoint);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.ERROR,
        expect.objectContaining({ message: 'settings.erp-drop-points.error.save' })
      );
    });
  });

  describe('uploadFile', () => {
    const xmlFile = new File(['<ErpOrderImport />'], 'orders.xml', { type: 'application/xml' });

    it('uploads the file, returns the storage key and emits a SUCCESS event', async () => {
      mockDataService.uploadFile.mockReturnValue(of({ key: 'storage-key-1' }));

      const result = await service.uploadFile(xmlFile);

      expect(result).toBe('storage-key-1');
      expect(mockDataService.uploadFile).toHaveBeenCalledWith(xmlFile);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.SUCCESS,
        expect.objectContaining({ message: 'settings.erp-drop-points.success.upload' })
      );
    });

    it('rejects a non-xml file without calling the API and emits an ERROR event', async () => {
      const textFile = new File(['not xml'], 'orders.txt', { type: 'text/plain' });

      const result = await service.uploadFile(textFile);

      expect(result).toBeNull();
      expect(mockDataService.uploadFile).not.toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.ERROR,
        expect.objectContaining({ message: 'settings.erp-drop-points.error.invalid-file-type' })
      );
    });

    it('sets isUploading while the upload is pending and resets it afterwards', async () => {
      const subject = new Subject<{ key: string }>();
      mockDataService.uploadFile.mockReturnValue(subject.asObservable());

      const promise = service.uploadFile(xmlFile);
      expect(service.isUploading()).toBe(true);

      subject.next({ key: 'storage-key-1' });
      subject.complete();
      await promise;

      expect(service.isUploading()).toBe(false);
    });

    it('returns null, resets isUploading and emits an ERROR event on failure', async () => {
      mockDataService.uploadFile.mockReturnValue(throwError(() => new Error('network')));

      const result = await service.uploadFile(xmlFile);

      expect(result).toBeNull();
      expect(service.isUploading()).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.ERROR,
        expect.objectContaining({ message: 'settings.erp-drop-points.error.upload' })
      );
    });

    it.each([
      ['a plain-text validator message', ERP_ORDER_UPLOAD_VALIDATION_MESSAGES.EmptyFile, ERP_IMPORT_FILES_I18N.UPLOAD_REJECTED_EMPTY_FILE],
      ['a ProblemDetails validator message', { detail: ERP_ORDER_UPLOAD_VALIDATION_MESSAGES.EmptyFileName }, ERP_IMPORT_FILES_I18N.UPLOAD_REJECTED_EMPTY_FILE_NAME],
      ['the extension message', ERP_ORDER_UPLOAD_VALIDATION_MESSAGES.InvalidExtension, 'settings.erp-drop-points.error.invalid-file-type'],
      ['the size message', ERP_ORDER_UPLOAD_VALIDATION_MESSAGES.FileTooLarge, ERP_IMPORT_FILES_I18N.UPLOAD_REJECTED_FILE_TOO_LARGE],
      ['an unknown message', { detail: 'Storage quota exceeded.' }, `${ERP_IMPORT_FILES_I18N.UPLOAD_REJECTED}(detail=Storage quota exceeded.)`],
      ['an empty body', null, 'settings.erp-drop-points.error.upload'],
    ])('shows the backend validation text for a 400 with %s', async (_, body, expected) => {
      // Arrange
      mockDataService.uploadFile.mockReturnValue(throwError(() => new HttpErrorResponse({ status: HttpStatusCode.BadRequest, error: body })));

      // Act
      const result = await service.uploadFile(xmlFile);

      // Assert
      expect(result).toBeNull();
      expect(emittedMessages(DomainEventType.ERROR)).toEqual([expected]);
    });

    it('says the file is too large when the server refuses the request size', async () => {
      // Arrange
      mockDataService.uploadFile.mockReturnValue(throwError(() => new HttpErrorResponse({ status: HttpStatusCode.PayloadTooLarge })));

      // Act
      await service.uploadFile(xmlFile);

      // Assert
      expect(emittedMessages(DomainEventType.ERROR)).toEqual([ERP_IMPORT_FILES_I18N.UPLOAD_REJECTED_FILE_TOO_LARGE]);
    });

    it('keeps the generic upload error for a server error even if it carries a message', async () => {
      // Arrange
      mockDataService.uploadFile.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: HttpStatusCode.InternalServerError, error: { detail: 'NullReferenceException' } })),
      );

      // Act
      await service.uploadFile(xmlFile);

      // Assert
      expect(emittedMessages(DomainEventType.ERROR)).toEqual(['settings.erp-drop-points.error.upload']);
    });
  });

  describe('import polling', () => {
    let subscription: Subscription | undefined;

    beforeEach(() => {
      vi.useFakeTimers();
      subscription = service.importPolling$.subscribe();
    });

    afterEach(() => {
      subscription?.unsubscribe();
      vi.useRealTimers();
    });

    it('polls immediately, then backs off 2 -> 4 -> 8 -> 30 s while a file is pending', async () => {
      // Arrange
      mockDataService.getFiles.mockReturnValue(of(listing(importFile('a', ErpImportFileStatus.Importing))));

      // Act
      service.requestPolling();

      // Assert
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1999);
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(4000);
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(3);
      await vi.advanceTimersByTimeAsync(8000);
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(4);
      await vi.advanceTimersByTimeAsync(29999);
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(4);
      await vi.advanceTimersByTimeAsync(1);
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(5);
      await vi.advanceTimersByTimeAsync(30000);
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(6);
    });

    it('stops polling as soon as no file is pending any more', async () => {
      // Arrange
      mockDataService.getFiles
        .mockReturnValueOnce(of(listing(importFile('a', ErpImportFileStatus.Importing))))
        .mockReturnValue(of(listing(importFile('a', ErpImportFileStatus.Completed, counts))));

      // Act
      service.requestPolling();
      await vi.advanceTimersByTimeAsync(120000);

      // Assert
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(2);
    });

    it('stops after 10 minutes and says the import is still running', async () => {
      // Arrange
      mockDataService.getFiles.mockReturnValue(of(listing(importFile('a', ErpImportFileStatus.Importing))));

      // Act
      service.requestPolling();
      await vi.advanceTimersByTimeAsync(600000);
      const callsAtCap = mockDataService.getFiles.mock.calls.length;
      await vi.advanceTimersByTimeAsync(120000);

      // Assert
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(callsAtCap);
      expect(emittedMessages(DomainEventType.INFO)).toEqual(['settings.erp-drop-points.files.import-still-running']);
    });

    it('does not show the still-running hint when the imports finished in time', async () => {
      // Arrange
      mockDataService.getFiles.mockReturnValue(of(listing(importFile('a', ErpImportFileStatus.Completed, counts))));

      // Act
      service.requestPolling();
      await vi.advanceTimersByTimeAsync(700000);

      // Assert
      expect(emittedMessages(DomainEventType.INFO)).toEqual([]);
    });

    it('does not say "still running" after 10 minutes when no file is importing (only waiting)', async () => {
      // Arrange
      mockDataService.getFiles.mockReturnValue(of(listing(importFile('a', ErpImportFileStatus.Received))));

      // Act
      service.requestPolling();
      await vi.advanceTimersByTimeAsync(700000);

      // Assert
      expect(emittedMessages(DomainEventType.INFO)).toEqual([]);
    });

    it('does not say "still running" after 10 minutes when the last poll failed', async () => {
      // Arrange
      const lastPollBeforeCap = 23;
      let calls = 0;
      mockDataService.getFiles.mockImplementation(() => {
        calls++;
        return calls === lastPollBeforeCap
          ? throwError(() => new Error('network'))
          : of(listing(importFile('a', ErpImportFileStatus.Importing)));
      });

      // Act
      service.requestPolling();
      await vi.advanceTimersByTimeAsync(700000);

      // Assert
      expect(calls).toBe(lastPollBeforeCap);
      expect(emittedMessages(DomainEventType.INFO)).toEqual([]);
      expect(emittedMessages(DomainEventType.ERROR)).toEqual([]);
    });

    it('ends the session after 3 failed polls in a row with exactly one load error toast', async () => {
      // Arrange
      mockDataService.getFiles.mockReturnValue(throwError(() => new Error('network')));

      // Act
      service.requestPolling();
      await vi.advanceTimersByTimeAsync(120000);

      // Assert
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(ERP_IMPORT_POLLING.MAX_CONSECUTIVE_FAILURES);
      expect(emittedMessages(DomainEventType.ERROR)).toEqual([ERP_IMPORT_FILES_I18N.ERROR_LOAD]);
    });

    it('starts counting failed polls again after a successful one', async () => {
      // Arrange
      const failure = () => throwError(() => new Error('network'));
      const importing = () => of(listing(importFile('a', ErpImportFileStatus.Importing)));
      mockDataService.getFiles
        .mockImplementationOnce(failure)
        .mockImplementationOnce(failure)
        .mockImplementationOnce(importing)
        .mockImplementationOnce(failure)
        .mockImplementationOnce(failure)
        .mockImplementation(importing);

      // Act
      service.requestPolling();
      await vi.advanceTimersByTimeAsync(80000);

      // Assert
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(6);
      expect(emittedMessages(DomainEventType.ERROR)).toEqual([]);
    });

    it('swallows a failed poll without an error toast and keeps polling', async () => {
      // Arrange
      mockDataService.getFiles
        .mockReturnValueOnce(throwError(() => new Error('network')))
        .mockReturnValue(of(listing(importFile('a', ErpImportFileStatus.Importing))));

      // Act
      service.requestPolling();
      await vi.advanceTimersByTimeAsync(2000);

      // Assert
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(2);
      expect(emittedMessages(DomainEventType.ERROR)).toEqual([]);
    });

    it('stops polling when the page unsubscribes', async () => {
      // Arrange
      mockDataService.getFiles.mockReturnValue(of(listing(importFile('a', ErpImportFileStatus.Importing))));
      service.requestPolling();

      // Act
      subscription?.unsubscribe();
      await vi.advanceTimersByTimeAsync(120000);

      // Assert
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(1);
    });

    it('keeps polling through the grace period of a queued run and ends at the first poll scheduled after it', async () => {
      // Arrange
      mockDataService.getFiles.mockReturnValue(of(listing()));

      // Act
      service.requestPolling({ graceMs: ERP_IMPORT_POLLING.RUN_START_GRACE_MS });
      await vi.advanceTimersByTimeAsync(74000);
      const callsWithinGrace = mockDataService.getFiles.mock.calls.length;
      await vi.advanceTimersByTimeAsync(300000);

      // Assert
      expect(callsWithinGrace).toBe(6);
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(7);
    });

    it('ends the grace period at the same poll however slowly the listing answers', async () => {
      // Arrange
      mockDataService.getFiles.mockReturnValue(of(listing()).pipe(delay(1500)));

      // Act
      service.requestPolling({ graceMs: ERP_IMPORT_POLLING.RUN_START_GRACE_MS });
      await vi.advanceTimersByTimeAsync(400000);

      // Assert
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(7);
    });

    it('starts with the first backoff poll when the caller has just loaded the listing', async () => {
      // Arrange
      mockDataService.getFiles.mockReturnValue(of(listing(importFile('a', ErpImportFileStatus.Importing))));

      // Act
      service.requestPolling({ skipImmediateFetch: true });

      // Assert
      expect(mockDataService.getFiles).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(1);
    });

    it('shares one polling session between several subscribers', async () => {
      // Arrange
      mockDataService.getFiles.mockReturnValue(of(listing(importFile('a', ErpImportFileStatus.Importing))));
      const second = service.importPolling$.subscribe();

      // Act
      service.requestPolling();
      await vi.advanceTimersByTimeAsync(2000);
      second.unsubscribe();

      // Assert
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(2);
    });

    it('announces an inbox-folder file the queued run already imported within the grace period', async () => {
      // Arrange
      mockDataService.getFiles.mockReturnValueOnce(of(listing()));
      await service.loadFiles();
      mockDataService.getFiles
        .mockReturnValueOnce(of(listing()))
        .mockReturnValueOnce(of(listing()))
        .mockReturnValue(of(listing(importFile('folder', ErpImportFileStatus.Completed, counts))));

      // Act
      service.requestPolling({ graceMs: ERP_IMPORT_POLLING.RUN_START_GRACE_MS });
      await vi.advanceTimersByTimeAsync(10000);

      // Assert
      expect(emittedMessages(DomainEventType.SUCCESS)).toHaveLength(1);
      expect(emittedMessages(DomainEventType.SUCCESS)[0]).toContain('(name=folder.xml,');
    });

    it('restarts one session instead of stacking pollers on a second request', async () => {
      // Arrange
      mockDataService.getFiles.mockReturnValue(of(listing(importFile('a', ErpImportFileStatus.Importing))));
      service.requestPolling();
      await vi.advanceTimersByTimeAsync(1000);

      // Act
      service.requestPolling();
      await vi.advanceTimersByTimeAsync(2000);

      // Assert
      expect(mockDataService.getFiles).toHaveBeenCalledTimes(3);
    });
  });

  describe('finished-import toasts', () => {
    let subscription: Subscription;

    beforeEach(() => {
      vi.useFakeTimers();
      subscription = service.importPolling$.subscribe();
    });

    afterEach(() => {
      subscription.unsubscribe();
      vi.useRealTimers();
    });

    const startWith = async (baseline: IErpDropPointFiles): Promise<void> => {
      mockDataService.getFiles.mockReturnValueOnce(of(baseline));
      await service.loadFiles();
    };

    const pollOnce = async (next: IErpDropPointFiles): Promise<void> => {
      mockDataService.getFiles.mockReturnValue(of(next));
      service.requestPolling();
      await vi.advanceTimersByTimeAsync(0);
    };

    it('announces a completed import as SUCCESS with all order counts', async () => {
      // Arrange
      await startWith(listing(importFile('a', ErpImportFileStatus.Importing)));

      // Act
      await pollOnce(listing(importFile('a', ErpImportFileStatus.Completed, counts)));

      // Assert
      const [message] = emittedMessages(DomainEventType.SUCCESS);
      expect(message).toContain('settings.erp-drop-points.files.toast.completed(name=a.xml,');
      expect(message).toContain('summary.new(count=2)');
      expect(message).toContain('summary.updated(count=1)');
      expect(message).toContain('summary.unchanged(count=1)');
      expect(message).not.toContain('summary.superseded');
      expect(message).not.toContain('summary.rejected');
    });

    it('passes the toast key and its parameters untranslated, so the toast handler translates once', async () => {
      // Arrange
      await startWith(listing(importFile('a', ErpImportFileStatus.Importing)));

      // Act
      await pollOnce(listing(importFile('a', ErpImportFileStatus.Completed, counts)));

      // Assert
      const [payload] = emittedPayloads(DomainEventType.SUCCESS);
      expect(payload.message).toBe(ERP_IMPORT_FILES_I18N.TOAST_COMPLETED);
      expect(payload.messageParams).toEqual({
        name: 'a.xml',
        summary: 'settings.erp-drop-points.files.summary.new(count=2) · settings.erp-drop-points.files.summary.updated(count=1) · settings.erp-drop-points.files.summary.unchanged(count=1)',
      });
    });

    it('announces a completed-with-warnings import as WARNING with the rejected count', async () => {
      // Arrange
      await startWith(listing(importFile('a', ErpImportFileStatus.Importing)));

      // Act
      await pollOnce(listing(importFile('a', ErpImportFileStatus.CompletedWithWarnings, { ...counts, rejectedCount: 3 })));

      // Assert
      const [message] = emittedMessages(DomainEventType.WARNING);
      expect(message).toContain('settings.erp-drop-points.files.toast.completed-with-warnings(name=a.xml,');
      expect(message).toContain('summary.rejected(count=3)');
      expect(emittedMessages(DomainEventType.SUCCESS)).toEqual([]);
    });

    it.each([ErpImportFileStatus.Failed, ErpImportFileStatus.Interrupted])(
      'announces status %s as ERROR with the translated failure reason',
      async (status) => {
        // Arrange
        await startWith(listing(importFile('a', ErpImportFileStatus.Importing)));

        // Act
        await pollOnce(listing(importFile('a', status, { failureReason: ERP_IMPORT_FILE_FAILURE_REASONS.StaleHeartbeat })));

        // Assert
        expect(emittedMessages(DomainEventType.ERROR)).toEqual([
          'settings.erp-drop-points.files.toast.failed(name=a.xml,reason=settings.erp-drop-points.files.failure.stale-heartbeat)',
        ]);
      },
    );

    it('keeps a parser message raw in the failure toast', async () => {
      // Arrange
      await startWith(listing(importFile('a', ErpImportFileStatus.Importing)));

      // Act
      await pollOnce(listing(importFile('a', ErpImportFileStatus.Failed, { failureReason: 'Root element is missing.' })));

      // Assert
      expect(emittedMessages(DomainEventType.ERROR)).toEqual([
        'settings.erp-drop-points.files.toast.failed(name=a.xml,reason=Root element is missing.)',
      ]);
    });

    it('announces an uploaded file that is already imported at the first poll', async () => {
      // Arrange
      await startWith(listing(importFile('old', ErpImportFileStatus.Completed, counts)));

      // Act
      await pollOnce(listing(importFile('old', ErpImportFileStatus.Completed, counts), importFile('new', ErpImportFileStatus.Completed, counts)));

      // Assert
      const messages = emittedMessages(DomainEventType.SUCCESS);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('(name=new.xml,');
    });

    it('announces each finished import only once', async () => {
      // Arrange
      await startWith(listing(importFile('a', ErpImportFileStatus.Importing), importFile('b', ErpImportFileStatus.Received)));
      mockDataService.getFiles
        .mockReturnValueOnce(of(listing(importFile('a', ErpImportFileStatus.Completed, counts), importFile('b', ErpImportFileStatus.Importing))))
        .mockReturnValue(of(listing(importFile('a', ErpImportFileStatus.Completed, counts), importFile('b', ErpImportFileStatus.Completed, counts))));

      // Act
      service.requestPolling();
      await vi.advanceTimersByTimeAsync(20000);

      // Assert
      const messages = emittedMessages(DomainEventType.SUCCESS);
      expect(messages).toHaveLength(2);
      expect(messages[0]).toContain('(name=a.xml,');
      expect(messages[1]).toContain('(name=b.xml,');
    });

    it('gives two failures in the same listing their own toast names so neither replaces the other', async () => {
      // Arrange
      await startWith(listing(importFile('a', ErpImportFileStatus.Importing), importFile('b', ErpImportFileStatus.Importing)));

      // Act
      await pollOnce(listing(importFile('a', ErpImportFileStatus.Failed), importFile('b', ErpImportFileStatus.Interrupted)));

      // Assert
      const codes = emittedPayloads(DomainEventType.ERROR).map((payload) => payload.code);
      expect(codes).toHaveLength(2);
      expect(new Set(codes).size).toBe(2);
    });

    it('shows one aggregate toast with summed counts when 3 or more imports finish in one listing', async () => {
      // Arrange
      await startWith(
        listing(
          importFile('a', ErpImportFileStatus.Importing),
          importFile('b', ErpImportFileStatus.Importing),
          importFile('c', ErpImportFileStatus.Received),
        ),
      );

      // Act
      await pollOnce(
        listing(
          importFile('a', ErpImportFileStatus.Completed, counts),
          importFile('b', ErpImportFileStatus.Completed, counts),
          importFile('c', ErpImportFileStatus.Completed, { ...counts, supersededCount: 1 }),
        ),
      );

      // Assert
      expect(emittedPayloads(DomainEventType.SUCCESS)).toHaveLength(1);
      const [payload] = emittedPayloads(DomainEventType.SUCCESS);
      expect(payload.message).toBe(ERP_IMPORT_FILES_I18N.TOAST_AGGREGATE);
      expect(payload.messageParams).toEqual({
        files: 3,
        failed: 0,
        summary:
          'settings.erp-drop-points.files.summary.new(count=6) · settings.erp-drop-points.files.summary.updated(count=3) · ' +
          'settings.erp-drop-points.files.summary.unchanged(count=3) · settings.erp-drop-points.files.summary.superseded(count=1)',
      });
    });

    it('raises the aggregate toast to a warning when one of the files has rejected orders', async () => {
      // Arrange
      await startWith(listing(...['a', 'b', 'c'].map((id) => importFile(id, ErpImportFileStatus.Importing))));

      // Act
      await pollOnce(
        listing(
          importFile('a', ErpImportFileStatus.Completed, counts),
          importFile('b', ErpImportFileStatus.Completed, counts),
          importFile('c', ErpImportFileStatus.CompletedWithWarnings, { ...counts, rejectedCount: 2 }),
        ),
      );

      // Assert
      expect(emittedPayloads(DomainEventType.SUCCESS)).toEqual([]);
      const [payload] = emittedPayloads(DomainEventType.WARNING);
      expect(payload.message).toBe(ERP_IMPORT_FILES_I18N.TOAST_AGGREGATE);
      expect(String(payload.messageParams?.['summary'])).toContain('summary.rejected(count=2)');
    });

    it('raises the aggregate toast to an error that counts the failed files when one import failed', async () => {
      // Arrange
      await startWith(listing(...['a', 'b', 'c'].map((id) => importFile(id, ErpImportFileStatus.Importing))));

      // Act
      await pollOnce(
        listing(
          importFile('a', ErpImportFileStatus.Completed, counts),
          importFile('b', ErpImportFileStatus.CompletedWithWarnings, { ...counts, rejectedCount: 1 }),
          importFile('c', ErpImportFileStatus.Failed, { failureReason: 'Root element is missing.' }),
        ),
      );

      // Assert
      expect(emittedPayloads(DomainEventType.SUCCESS)).toEqual([]);
      expect(emittedPayloads(DomainEventType.WARNING)).toEqual([]);
      const errors = emittedPayloads(DomainEventType.ERROR);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe(ERP_IMPORT_FILES_I18N.TOAST_AGGREGATE_WITH_FAILURES);
      expect(errors[0].messageParams).toEqual(expect.objectContaining({ files: 3, failed: 1 }));
    });

    it('discards an older listing that answers after a newer one: no resurrected row, no second toast', async () => {
      // Arrange
      await startWith(listing(importFile('a', ErpImportFileStatus.Importing), importFile('gone', ErpImportFileStatus.Failed)));
      const older = new Subject<IErpDropPointFiles>();
      mockDataService.getFiles.mockReturnValueOnce(older.asObservable());
      const olderLoad = service.loadFiles();
      mockDataService.getFiles.mockReturnValueOnce(of(listing(importFile('a', ErpImportFileStatus.Completed, counts))));
      await service.loadFiles();

      // Act
      older.next(listing(importFile('a', ErpImportFileStatus.Importing), importFile('gone', ErpImportFileStatus.Failed)));
      older.complete();
      const olderResult = await olderLoad;
      mockDataService.getFiles.mockReturnValue(of(listing(importFile('a', ErpImportFileStatus.Completed, counts))));
      await service.loadFiles();

      // Assert
      expect(olderResult.failed).toEqual([]);
      expect(service.files().failed).toEqual([]);
      expect(service.files().processed.map((file) => file.id)).toEqual(['a']);
      expect(emittedMessages(DomainEventType.SUCCESS)).toHaveLength(1);
    });

    it('discards a poll response that was overtaken by a later listing', async () => {
      // Arrange
      await startWith(listing(importFile('a', ErpImportFileStatus.Importing)));
      const slowPoll = new Subject<IErpDropPointFiles>();
      mockDataService.getFiles.mockReturnValueOnce(slowPoll.asObservable());
      service.requestPolling();
      mockDataService.getFiles.mockReturnValueOnce(of(listing(importFile('a', ErpImportFileStatus.Completed, counts))));
      await service.loadFiles();

      // Act
      slowPoll.next(listing(importFile('a', ErpImportFileStatus.Importing)));
      slowPoll.complete();
      mockDataService.getFiles.mockReturnValue(of(listing(importFile('a', ErpImportFileStatus.Completed, counts))));
      await vi.advanceTimersByTimeAsync(2000);

      // Assert
      expect(service.files().processed.map((file) => file.id)).toEqual(['a']);
      expect(emittedMessages(DomainEventType.SUCCESS)).toHaveLength(1);
    });

    it('does not announce anything for the baseline listing of the page', async () => {
      // Arrange
      service.resetFileTracking();
      mockDataService.getFiles.mockReturnValue(
        of(listing(importFile('a', ErpImportFileStatus.Completed, counts), importFile('b', ErpImportFileStatus.Failed))),
      );

      // Act
      await service.loadFiles();
      await service.loadFiles();

      // Assert
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('does not announce an already finished file that a manual refresh sees for the first time', async () => {
      // Arrange
      await startWith(listing());
      mockDataService.getFiles.mockReturnValue(of(listing(importFile('pushed', ErpImportFileStatus.Completed, counts))));

      // Act
      await service.loadFiles();

      // Assert
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('loadFiles', () => {
    it('sets the files signal and returns the listing on success', async () => {
      mockDataService.getFiles.mockReturnValue(of(files));

      const result = await service.loadFiles();

      expect(result).toEqual(files);
      expect(service.files()).toEqual(files);
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('sets isLoadingFiles while the request is pending and resets it afterwards', async () => {
      const subject = new Subject<IErpDropPointFiles>();
      mockDataService.getFiles.mockReturnValue(subject.asObservable());

      const promise = service.loadFiles();
      expect(service.isLoadingFiles()).toBe(true);

      subject.next(files);
      subject.complete();
      await promise;

      expect(service.isLoadingFiles()).toBe(false);
    });

    it('returns an empty listing and emits an ERROR event on failure', async () => {
      mockDataService.getFiles.mockReturnValue(throwError(() => new Error('network')));

      const result = await service.loadFiles();

      expect(result).toEqual({ inbox: [], processed: [], failed: [] });
      expect(service.isLoadingFiles()).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.ERROR,
        expect.objectContaining({ message: 'settings.erp-drop-points.files.error.load' })
      );
    });
  });

  describe('retryFile', () => {
    const failedId = 'broken-1';

    it('re-queues the file by id, returns true and emits a SUCCESS event when the API accepted the retry', async () => {
      // Arrange
      mockDataService.retryFile.mockReturnValue(of({ id: failedId, status: ErpImportFileStatus.Received, failureReason: null }));

      // Act
      const result = await service.retryFile(failedId);

      // Assert
      expect(result).toBe(true);
      expect(mockDataService.retryFile).toHaveBeenCalledWith(failedId);
      expect(service.isRetrying()).toBe(false);
      expect(emittedMessages(DomainEventType.SUCCESS)).toEqual(['settings.erp-drop-points.files.success.retry-queued']);
    });

    it('announces the retried file once its import finishes, even if no poll saw it pending', async () => {
      // Arrange
      vi.useFakeTimers();
      const subscription = service.importPolling$.subscribe();
      mockDataService.getFiles.mockReturnValueOnce(of(files));
      await service.loadFiles();
      mockDataService.retryFile.mockReturnValue(of({ id: failedId, status: ErpImportFileStatus.Received, failureReason: null }));
      mockDataService.getFiles.mockReturnValue(of(listing(importFile(failedId, ErpImportFileStatus.Completed, counts))));

      // Act
      await service.retryFile(failedId);
      service.requestPolling();
      await vi.advanceTimersByTimeAsync(0);
      subscription.unsubscribe();
      vi.useRealTimers();

      // Assert
      const toasts = emittedMessages(DomainEventType.SUCCESS);
      expect(toasts).toHaveLength(2);
      expect(toasts[1]).toContain('settings.erp-drop-points.files.toast.completed(name=broken-1.xml,');
    });

    it('returns false and shows the translated reason when the stored file changed after receipt', async () => {
      // Arrange
      mockDataService.getFiles.mockReturnValueOnce(of(files));
      await service.loadFiles();
      mockDataService.retryFile.mockReturnValue(
        of({ id: failedId, status: ErpImportFileStatus.Failed, failureReason: ERP_IMPORT_FILE_FAILURE_REASONS.FileChangedAfterReceipt }),
      );

      // Act
      const result = await service.retryFile(failedId);

      // Assert
      expect(result).toBe(false);
      expect(emittedMessages(DomainEventType.ERROR)).toEqual([
        'settings.erp-drop-points.files.toast.failed(name=broken-1.xml,reason=settings.erp-drop-points.files.failure.file-changed)',
      ]);
      expect(emittedMessages(DomainEventType.SUCCESS)).toEqual([]);
    });

    it('sets isRetrying while the request is pending and resets it afterwards', async () => {
      // Arrange
      const subject = new Subject<{ id: string; status: ErpImportFileStatus; failureReason: null }>();
      mockDataService.retryFile.mockReturnValue(subject.asObservable());

      // Act
      const promise = service.retryFile(failedId);
      expect(service.isRetrying()).toBe(true);
      subject.next({ id: failedId, status: ErpImportFileStatus.Received, failureReason: null });
      subject.complete();
      await promise;

      // Assert
      expect(service.isRetrying()).toBe(false);
    });

    it.each([
      [HttpStatusCode.NotFound, 'settings.erp-drop-points.files.error.not-found'],
      [HttpStatusCode.BadRequest, 'settings.erp-drop-points.files.error.wrong-status'],
      [HttpStatusCode.Conflict, 'settings.erp-drop-points.files.error.conflict'],
      [HttpStatusCode.InternalServerError, 'settings.erp-drop-points.files.error.retry'],
    ])('returns false and maps HTTP %s to its own error text', async (status, expectedKey) => {
      // Arrange
      mockDataService.retryFile.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));

      // Act
      const result = await service.retryFile(failedId);

      // Assert
      expect(result).toBe(false);
      expect(service.isRetrying()).toBe(false);
      expect(emittedMessages(DomainEventType.ERROR)).toEqual([expectedKey]);
    });
  });

  describe('deleteFile', () => {
    const failedId = 'broken-1';

    it('deletes the file by id, returns true and emits a SUCCESS event', async () => {
      // Arrange
      mockDataService.deleteFile.mockReturnValue(of(void 0));

      // Act
      const result = await service.deleteFile(failedId);

      // Assert
      expect(result).toBe(true);
      expect(mockDataService.deleteFile).toHaveBeenCalledWith(failedId);
      expect(service.isDeleting()).toBe(false);
      expect(emittedMessages(DomainEventType.SUCCESS)).toEqual(['settings.erp-drop-points.files.success.delete']);
    });

    it('sets isDeleting while the request is pending and resets it afterwards', async () => {
      // Arrange
      const subject = new Subject<void>();
      mockDataService.deleteFile.mockReturnValue(subject.asObservable());

      // Act
      const promise = service.deleteFile(failedId);
      expect(service.isDeleting()).toBe(true);
      subject.next();
      subject.complete();
      await promise;

      // Assert
      expect(service.isDeleting()).toBe(false);
    });

    it.each([
      [HttpStatusCode.NotFound, 'settings.erp-drop-points.files.error.not-found'],
      [HttpStatusCode.BadRequest, 'settings.erp-drop-points.files.error.wrong-status'],
      [HttpStatusCode.Conflict, 'settings.erp-drop-points.files.error.conflict'],
    ])('returns false and maps HTTP %s to its own error text', async (status, expectedKey) => {
      // Arrange
      mockDataService.deleteFile.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));

      // Act
      const result = await service.deleteFile(failedId);

      // Assert
      expect(result).toBe(false);
      expect(emittedMessages(DomainEventType.ERROR)).toEqual([expectedKey]);
    });

    it('returns false and emits the generic delete error for any other failure', async () => {
      // Arrange
      mockDataService.deleteFile.mockReturnValue(throwError(() => new Error('network')));

      // Act
      const result = await service.deleteFile(failedId);

      // Assert
      expect(result).toBe(false);
      expect(service.isDeleting()).toBe(false);
      expect(emittedMessages(DomainEventType.ERROR)).toEqual(['settings.erp-drop-points.files.error.delete']);
    });
  });

  describe('triggerImportRun', () => {
    it('returns true and emits a SUCCESS event when the run was triggered', async () => {
      mockDataService.triggerImportRun.mockReturnValue(of(void 0));

      const result = await service.triggerImportRun();

      expect(result).toBe(true);
      expect(service.isTriggeringImport()).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.SUCCESS,
        expect.objectContaining({ message: 'settings.erp-drop-points.success.run-import' })
      );
    });

    it('sets isTriggeringImport while the request is pending and resets it afterwards', async () => {
      const subject = new Subject<void>();
      mockDataService.triggerImportRun.mockReturnValue(subject.asObservable());

      const promise = service.triggerImportRun();
      expect(service.isTriggeringImport()).toBe(true);

      subject.next();
      subject.complete();
      await promise;

      expect(service.isTriggeringImport()).toBe(false);
    });

    it('returns false and emits an ERROR event on failure', async () => {
      mockDataService.triggerImportRun.mockReturnValue(throwError(() => new Error('network')));

      const result = await service.triggerImportRun();

      expect(result).toBe(false);
      expect(service.isTriggeringImport()).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.ERROR,
        expect.objectContaining({ message: 'settings.erp-drop-points.error.run-import' })
      );
    });
  });
});

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { DataManagementErpDropPointService } from './data-management-erp-drop-point.service';
import { DataErpDropPointService } from 'src/app/infrastructure/api/settings/data-erp-drop-point.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import {
  IErpDropPoint,
  IErpDropPointFiles,
  IErpDropPointRequest,
} from 'src/app/domain/models/settings/erp-drop-point';

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

  const files: IErpDropPointFiles = {
    pending: [
      { key: 'inbox/orders.xml', fileName: 'orders.xml', sizeBytes: 2048, lastModifiedUtc: '2026-07-01T10:00:00Z' },
    ],
    processed: [],
    error: [
      { key: 'error/broken.xml', fileName: 'broken.xml', sizeBytes: 128, lastModifiedUtc: '2026-06-29T07:00:00Z', errorReason: 'Invalid XML' },
    ],
  };

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
  });

  describe('watchProcessingResults', () => {
    const uploadedKey = 'erp/orders/abc123-orders.xml';
    const baseFile = { fileName: 'orders.xml', sizeBytes: 1, lastModifiedUtc: '2026-07-03T20:00:00Z' };

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('emits an ERROR event when the uploaded file lands in the error area', async () => {
      mockDataService.getFiles.mockReturnValue(of({
        pending: [],
        processed: [],
        error: [{ ...baseFile, key: 'erp/orders/error/abc123-orders.xml', errorReason: 'no weekday' }],
      }));

      const promise = service.watchProcessingResults([uploadedKey]);
      await vi.advanceTimersByTimeAsync(5000);
      await promise;

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.ERROR,
        expect.objectContaining({ message: 'settings.erp-drop-points.files.import-rejected' })
      );
    });

    it('emits a SUCCESS event when the uploaded file lands in the processed area', async () => {
      mockDataService.getFiles.mockReturnValue(of({
        pending: [],
        processed: [{ ...baseFile, key: 'erp/orders/processed/abc123-orders.xml' }],
        error: [],
      }));

      const promise = service.watchProcessingResults([uploadedKey]);
      await vi.advanceTimersByTimeAsync(5000);
      await promise;

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.SUCCESS,
        expect.objectContaining({ message: 'settings.erp-drop-points.files.import-processed' })
      );
    });

    it('emits an INFO event when the file is not processed before the timeout', async () => {
      mockDataService.getFiles.mockReturnValue(of({
        pending: [{ ...baseFile, key: uploadedKey }],
        processed: [],
        error: [],
      }));

      const promise = service.watchProcessingResults([uploadedKey]);
      await vi.advanceTimersByTimeAsync(120000);
      await promise;

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.INFO,
        expect.objectContaining({ message: 'settings.erp-drop-points.files.import-still-running' })
      );
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

      expect(result).toEqual({ pending: [], processed: [], error: [] });
      expect(service.isLoadingFiles()).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.ERROR,
        expect.objectContaining({ message: 'settings.erp-drop-points.files.error.load' })
      );
    });
  });

  describe('retryFile', () => {
    it('returns true and emits a SUCCESS event when the file was moved back', async () => {
      mockDataService.retryFile.mockReturnValue(of(void 0));

      const result = await service.retryFile('error/broken.xml');

      expect(result).toBe(true);
      expect(mockDataService.retryFile).toHaveBeenCalledWith('error/broken.xml');
      expect(service.isRetrying()).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.SUCCESS,
        expect.objectContaining({ message: 'settings.erp-drop-points.files.success.retry' })
      );
    });

    it('sets isRetrying while the request is pending and resets it afterwards', async () => {
      const subject = new Subject<void>();
      mockDataService.retryFile.mockReturnValue(subject.asObservable());

      const promise = service.retryFile('error/broken.xml');
      expect(service.isRetrying()).toBe(true);

      subject.next();
      subject.complete();
      await promise;

      expect(service.isRetrying()).toBe(false);
    });

    it('returns false and emits an ERROR event on failure', async () => {
      mockDataService.retryFile.mockReturnValue(throwError(() => new Error('network')));

      const result = await service.retryFile('error/broken.xml');

      expect(result).toBe(false);
      expect(service.isRetrying()).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.ERROR,
        expect.objectContaining({ message: 'settings.erp-drop-points.files.error.retry' })
      );
    });
  });

  describe('deleteFile', () => {
    it('returns true and emits a SUCCESS event when the file was deleted', async () => {
      mockDataService.deleteFile.mockReturnValue(of(void 0));

      const result = await service.deleteFile('error/broken.xml');

      expect(result).toBe(true);
      expect(mockDataService.deleteFile).toHaveBeenCalledWith('error/broken.xml');
      expect(service.isDeleting()).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.SUCCESS,
        expect.objectContaining({ message: 'settings.erp-drop-points.files.success.delete' })
      );
    });

    it('sets isDeleting while the request is pending and resets it afterwards', async () => {
      const subject = new Subject<void>();
      mockDataService.deleteFile.mockReturnValue(subject.asObservable());

      const promise = service.deleteFile('error/broken.xml');
      expect(service.isDeleting()).toBe(true);

      subject.next();
      subject.complete();
      await promise;

      expect(service.isDeleting()).toBe(false);
    });

    it('returns false and emits an ERROR event on failure', async () => {
      mockDataService.deleteFile.mockReturnValue(throwError(() => new Error('network')));

      const result = await service.deleteFile('error/broken.xml');

      expect(result).toBe(false);
      expect(service.isDeleting()).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEventType.ERROR,
        expect.objectContaining({ message: 'settings.erp-drop-points.files.error.delete' })
      );
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

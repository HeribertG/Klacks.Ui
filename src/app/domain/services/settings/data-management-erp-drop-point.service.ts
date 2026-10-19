// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Domain facade for the automatically managed ERP drop point, mediating between the settings UI
 * and the infrastructure API service (default resource, import ledger listing, uploads, retry/delete by
 * ledger id and import runs). It also polls the listing while imports are pending and announces every
 * finished import once as a toast with its order counts (one aggregate toast when several finish at once).
 * Every listing request (page load, refresh, poll) goes through one fetch path that numbers the requests;
 * a response older than the last applied one is discarded, so it can neither resurrect a deleted row nor
 * re-announce a finished import.
 * @param defaultDropPoint - Signal holding the automatically managed drop point, or null before loading
 * @param files - Signal holding the import ledger rows grouped into inbox, processed and failed
 * @param isLoading - Signal indicating whether the drop point is currently being (re)loaded
 * @param isLoadingFiles - Signal indicating whether the file listing is currently being (re)loaded
 * @param isUploading - Signal indicating whether a file upload is currently running
 * @param isRetrying - Signal indicating whether a failed file is currently being re-queued
 * @param isDeleting - Signal indicating whether a failed file is currently being permanently deleted
 * @param isTriggeringImport - Signal indicating whether a manual import run is currently being triggered
 * @param importPolling$ - Shared polling stream; the page subscribes for its lifetime, requestPolling (re)starts a
 *   session: an immediate listing (unless skipped), then backoff 2 -> 4 -> 8 -> 30 s, ending when no file is
 *   pending any more (after the grace offset), after 3 failed polls in a row (one load error toast) or after
 *   10 minutes (an info toast says the import is still running if the last poll succeeded and a file is importing)
 */

import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  concat,
  defer,
  exhaustMap,
  filter,
  finalize,
  firstValueFrom,
  map,
  of,
  share,
  switchMap,
  takeUntil,
  takeWhile,
  tap,
  timer,
} from 'rxjs';
import { DataErpDropPointService } from 'src/app/infrastructure/api/settings/data-erp-drop-point.service';
import {
  IErpDropPoint,
  IErpDropPointFiles,
  IErpDropPointRequest,
} from 'src/app/domain/models/settings/erp-drop-point';
import { IErpImportFile } from 'src/app/domain/models/settings/erp-import-file';
import { IErpImportPollingRequest } from 'src/app/domain/models/settings/erp-import-polling-request';
import { IErpImportText } from 'src/app/domain/models/settings/erp-import-text';
import { ErpImportFileStatus } from 'src/app/domain/enums/erp-import-file-status.enum';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import {
  ERP_DROP_POINT_I18N,
  ERP_IMPORT_FILES_I18N,
  ERP_IMPORT_LIST_LIMITS,
  ERP_IMPORT_POLLING,
  ERP_IMPORT_SUMMARY_SEPARATOR,
} from 'src/app/domain/constants/erp-import-file.constants';
import {
  allErpImportFiles,
  erpImportCountSummary,
  erpImportFailureReasonText,
  erpImportUploadRejectionText,
  hasImportingErpImportFiles,
  hasPendingErpImportFiles,
  isErpImportFileFailed,
  sumErpImportCounts,
} from 'src/app/domain/helpers/erp-import-file.helper';
import { ErpImportFileTransitionTracker } from 'src/app/domain/helpers/erp-import-file-transition-tracker';

const XML_FILE_EXTENSION = '.xml';
const EMPTY_FILES: IErpDropPointFiles = { inbox: [], processed: [], failed: [] };
const ERROR_CODE = 'ErpDropPointError';
const IMPORT_FAILED_CODE = 'ErpImportFailed';
const IMPORT_SUMMARY_CODE = 'ErpImportSummary';
const CODE_SEPARATOR = '-';
const SERVICE_CONTEXT = 'DataManagementErpDropPointService';
const SUCCESS_CONTEXT = 'Success';
const WARNING_CONTEXT = 'Warning';
const INFO_CONTEXT = 'Info';
const NAME_PARAM = 'name';
const SUMMARY_PARAM = 'summary';
const REASON_PARAM = 'reason';
const FILES_PARAM = 'files';
const FAILED_PARAM = 'failed';

const FILE_ACTION_ERROR_KEYS: Readonly<Partial<Record<number, string>>> = {
  [HttpStatusCode.NotFound]: ERP_IMPORT_FILES_I18N.ERROR_NOT_FOUND,
  [HttpStatusCode.BadRequest]: ERP_IMPORT_FILES_I18N.ERROR_WRONG_STATUS,
  [HttpStatusCode.Conflict]: ERP_IMPORT_FILES_I18N.ERROR_CONFLICT,
};

const TOO_LARGE_UPLOAD_TEXT: IErpImportText = { key: ERP_IMPORT_FILES_I18N.UPLOAD_REJECTED_FILE_TOO_LARGE, params: {} };

@Injectable({
  providedIn: 'root',
})
export class DataManagementErpDropPointService {
  private dataService = inject(DataErpDropPointService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private translate = inject(TranslateService);

  private readonly pollRequests$ = new Subject<IErpImportPollingRequest>();
  private readonly transitions = new ErpImportFileTransitionTracker();
  private isPollingSessionActive = false;
  private issuedRequestSequence = 0;
  private appliedRequestSequence = 0;

  public defaultDropPoint = signal<IErpDropPoint | null>(null);
  public files = signal<IErpDropPointFiles>(EMPTY_FILES);
  public isLoading = signal(false);
  public isLoadingFiles = signal(false);
  public isUploading = signal(false);
  public isRetrying = signal(false);
  public isDeleting = signal(false);
  public isTriggeringImport = signal(false);

  public readonly importPolling$: Observable<IErpDropPointFiles> = this.pollRequests$.pipe(
    switchMap((request) => this.pollSession$(request)),
    share(),
  );

  async loadDefaultDropPoint(): Promise<IErpDropPoint | null> {
    try {
      this.isLoading.set(true);
      const dropPoint = await firstValueFrom(this.dataService.getDefaultDropPoint());
      this.defaultDropPoint.set(dropPoint);
      return dropPoint;
    } catch (error) {
      console.error('Error loading ERP drop point:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: ERP_DROP_POINT_I18N.ERROR_LOAD, code: ERROR_CODE, context: SERVICE_CONTEXT });
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateDropPoint(id: string, request: IErpDropPointRequest): Promise<IErpDropPoint | undefined> {
    try {
      const updated = await firstValueFrom(this.dataService.updateDropPoint(id, request));
      this.defaultDropPoint.set(updated);

      this.eventBus.emit(DomainEventType.SUCCESS, { message: ERP_DROP_POINT_I18N.SUCCESS_UPDATE, context: SUCCESS_CONTEXT });
      return updated;
    } catch (error) {
      console.error('Error updating ERP drop point:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: ERP_DROP_POINT_I18N.ERROR_SAVE, code: ERROR_CODE, context: SERVICE_CONTEXT });
      return undefined;
    }
  }

  isXmlFile(file: File): boolean {
    return file.name.toLowerCase().endsWith(XML_FILE_EXTENSION);
  }

  async uploadFile(file: File): Promise<string | null> {
    if (!this.isXmlFile(file)) {
      this.eventBus.emit(DomainEventType.ERROR, { message: ERP_DROP_POINT_I18N.ERROR_INVALID_FILE_TYPE, code: ERROR_CODE, context: SERVICE_CONTEXT });
      return null;
    }

    try {
      this.isUploading.set(true);
      const result = await firstValueFrom(this.dataService.uploadFile(file));

      this.eventBus.emit(DomainEventType.SUCCESS, { message: ERP_DROP_POINT_I18N.SUCCESS_UPLOAD, context: SUCCESS_CONTEXT });
      return result.key;
    } catch (error) {
      console.error('Error uploading ERP drop point file:', error);
      this.emitUploadError(error);
      return null;
    } finally {
      this.isUploading.set(false);
    }
  }

  requestPolling(options: Partial<IErpImportPollingRequest> = {}): void {
    this.pollRequests$.next({ graceMs: options.graceMs ?? 0, skipImmediateFetch: options.skipImmediateFetch ?? false });
  }

  resetFileTracking(): void {
    this.transitions.reset();
  }

  async loadFiles(): Promise<IErpDropPointFiles> {
    try {
      this.isLoadingFiles.set(true);
      return await firstValueFrom(this.fetchFiles$());
    } catch (error) {
      console.error('Error loading ERP drop point files:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: ERP_IMPORT_FILES_I18N.ERROR_LOAD, code: ERROR_CODE, context: SERVICE_CONTEXT });
      return EMPTY_FILES;
    } finally {
      this.isLoadingFiles.set(false);
    }
  }

  async retryFile(id: string): Promise<boolean> {
    try {
      this.isRetrying.set(true);
      const result = await firstValueFrom(this.dataService.retryFile(id));

      if (result.status === ErpImportFileStatus.Received) {
        this.transitions.rearm(id);
        this.eventBus.emit(DomainEventType.SUCCESS, { message: ERP_IMPORT_FILES_I18N.SUCCESS_RETRY_QUEUED, context: SUCCESS_CONTEXT });
        return true;
      }

      this.emitImportFailed(id, this.fileNameOf(id), result.failureReason);
      return false;
    } catch (error) {
      console.error('Error retrying ERP drop point file:', error);
      this.emitFileActionError(error, ERP_IMPORT_FILES_I18N.ERROR_RETRY);
      return false;
    } finally {
      this.isRetrying.set(false);
    }
  }

  async deleteFile(id: string): Promise<boolean> {
    try {
      this.isDeleting.set(true);
      await firstValueFrom(this.dataService.deleteFile(id));

      this.eventBus.emit(DomainEventType.SUCCESS, { message: ERP_IMPORT_FILES_I18N.SUCCESS_DELETE, context: SUCCESS_CONTEXT });
      return true;
    } catch (error) {
      console.error('Error deleting ERP drop point file:', error);
      this.emitFileActionError(error, ERP_IMPORT_FILES_I18N.ERROR_DELETE);
      return false;
    } finally {
      this.isDeleting.set(false);
    }
  }

  async triggerImportRun(): Promise<boolean> {
    try {
      this.isTriggeringImport.set(true);
      await firstValueFrom(this.dataService.triggerImportRun());

      this.eventBus.emit(DomainEventType.SUCCESS, { message: ERP_DROP_POINT_I18N.SUCCESS_RUN_IMPORT, context: SUCCESS_CONTEXT });
      return true;
    } catch (error) {
      console.error('Error triggering ERP import run:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: ERP_DROP_POINT_I18N.ERROR_RUN_IMPORT, code: ERROR_CODE, context: SERVICE_CONTEXT });
      return false;
    } finally {
      this.isTriggeringImport.set(false);
    }
  }

  private fetchFiles$(): Observable<IErpDropPointFiles> {
    return defer(() => {
      const sequence = ++this.issuedRequestSequence;
      return this.dataService.getFiles().pipe(
        tap((files) => this.applyIfNewest(sequence, files)),
        map(() => this.files()),
      );
    });
  }

  private applyIfNewest(sequence: number, files: IErpDropPointFiles): void {
    if (sequence < this.appliedRequestSequence) {
      return;
    }
    this.appliedRequestSequence = sequence;
    this.applyFiles(files);
  }

  private pollSession$(request: IErpImportPollingRequest): Observable<IErpDropPointFiles> {
    return defer(() => {
      this.isPollingSessionActive = true;
      let consecutiveFailures = 0;
      let isLastPollSuccessful = false;

      return this.pollTicks$(request.skipImmediateFetch).pipe(
        exhaustMap((offsetMs) =>
          this.fetchFiles$().pipe(
            map((files): { offsetMs: number; files: IErpDropPointFiles | null } => ({ offsetMs, files })),
            catchError(() => of({ offsetMs, files: null })),
          ),
        ),
        tap(({ files }) => {
          isLastPollSuccessful = files !== null;
          consecutiveFailures = files === null ? consecutiveFailures + 1 : 0;
          if (consecutiveFailures === ERP_IMPORT_POLLING.MAX_CONSECUTIVE_FAILURES) {
            this.eventBus.emit(DomainEventType.ERROR, { message: ERP_IMPORT_FILES_I18N.ERROR_LOAD, code: ERROR_CODE, context: SERVICE_CONTEXT });
          }
        }),
        takeWhile(({ offsetMs, files }) =>
          files === null
            ? consecutiveFailures < ERP_IMPORT_POLLING.MAX_CONSECUTIVE_FAILURES
            : hasPendingErpImportFiles(files) || offsetMs < request.graceMs,
        ),
        map(({ files }) => files),
        filter((files): files is IErpDropPointFiles => files !== null),
        takeUntil(
          timer(ERP_IMPORT_POLLING.MAX_DURATION_MS).pipe(
            tap(() => {
              if (isLastPollSuccessful && hasImportingErpImportFiles(this.files())) {
                this.emitStillRunning();
              }
            }),
          ),
        ),
        finalize(() => (this.isPollingSessionActive = false)),
      );
    });
  }

  private pollTicks$(skipImmediateFetch: boolean): Observable<number> {
    const { BACKOFF_DELAYS_MS, STEADY_INTERVAL_MS } = ERP_IMPORT_POLLING;
    let offsetMs = 0;
    const backoffTicks = BACKOFF_DELAYS_MS.map((delay) => {
      offsetMs += delay;
      const tickOffsetMs = offsetMs;
      return timer(delay).pipe(map(() => tickOffsetMs));
    });
    const steadyStartMs = offsetMs;

    return concat(
      skipImmediateFetch ? EMPTY : of(0),
      ...backoffTicks,
      timer(STEADY_INTERVAL_MS, STEADY_INTERVAL_MS).pipe(map((index) => steadyStartMs + (index + 1) * STEADY_INTERVAL_MS)),
    );
  }

  private applyFiles(files: IErpDropPointFiles): void {
    this.files.set(files);
    const finished = this.transitions.update(files, this.isPollingSessionActive);
    if (finished.length >= ERP_IMPORT_LIST_LIMITS.AGGREGATE_TOAST_MIN_FILES) {
      this.announceFinishedImports(finished);
      return;
    }
    for (const file of finished) {
      this.announceFinishedImport(file);
    }
  }

  private announceFinishedImport(file: IErpImportFile): void {
    const messageParams = { [NAME_PARAM]: file.fileName, [SUMMARY_PARAM]: this.summaryText([file]) };
    switch (file.status) {
      case ErpImportFileStatus.Completed:
        this.eventBus.emit(DomainEventType.SUCCESS, { message: ERP_IMPORT_FILES_I18N.TOAST_COMPLETED, messageParams, context: SUCCESS_CONTEXT });
        return;
      case ErpImportFileStatus.CompletedWithWarnings:
        this.eventBus.emit(DomainEventType.WARNING, {
          message: ERP_IMPORT_FILES_I18N.TOAST_COMPLETED_WITH_WARNINGS,
          messageParams,
          context: this.perFileName(WARNING_CONTEXT, file.id),
        });
        return;
      default:
        this.emitImportFailed(file.id, file.fileName, file.failureReason);
    }
  }

  private announceFinishedImports(finished: IErpImportFile[]): void {
    const failedCount = finished.filter((file) => isErpImportFileFailed(file.status)).length;
    const messageParams = {
      [FILES_PARAM]: finished.length,
      [FAILED_PARAM]: failedCount,
      [SUMMARY_PARAM]: this.summaryText(finished),
    };

    if (failedCount > 0) {
      this.eventBus.emit(DomainEventType.ERROR, {
        message: ERP_IMPORT_FILES_I18N.TOAST_AGGREGATE_WITH_FAILURES,
        messageParams,
        code: IMPORT_SUMMARY_CODE,
        context: SERVICE_CONTEXT,
      });
      return;
    }

    if (finished.some((file) => file.status === ErpImportFileStatus.CompletedWithWarnings)) {
      this.eventBus.emit(DomainEventType.WARNING, { message: ERP_IMPORT_FILES_I18N.TOAST_AGGREGATE, messageParams, context: IMPORT_SUMMARY_CODE });
      return;
    }

    this.eventBus.emit(DomainEventType.SUCCESS, { message: ERP_IMPORT_FILES_I18N.TOAST_AGGREGATE, messageParams, context: SUCCESS_CONTEXT });
  }

  private emitImportFailed(id: string, fileName: string, failureReason: string | null): void {
    this.eventBus.emit(DomainEventType.ERROR, {
      message: ERP_IMPORT_FILES_I18N.TOAST_FAILED,
      messageParams: { [NAME_PARAM]: fileName, [REASON_PARAM]: this.failureReasonText(failureReason) },
      code: this.perFileName(IMPORT_FAILED_CODE, id),
      context: SERVICE_CONTEXT,
    });
  }

  private emitStillRunning(): void {
    this.eventBus.emit(DomainEventType.INFO, { message: ERP_IMPORT_FILES_I18N.IMPORT_STILL_RUNNING, context: INFO_CONTEXT });
  }

  private emitUploadError(error: unknown): void {
    const text = this.uploadErrorText(error);
    this.eventBus.emit(DomainEventType.ERROR, {
      message: text?.key ?? ERP_DROP_POINT_I18N.ERROR_UPLOAD,
      messageParams: text?.params,
      code: ERROR_CODE,
      context: SERVICE_CONTEXT,
    });
  }

  private uploadErrorText(error: unknown): IErpImportText | null {
    if (!(error instanceof HttpErrorResponse)) {
      return null;
    }
    if (error.status === HttpStatusCode.PayloadTooLarge) {
      return TOO_LARGE_UPLOAD_TEXT;
    }
    return error.status === HttpStatusCode.BadRequest ? erpImportUploadRejectionText(error.error) : null;
  }

  private emitFileActionError(error: unknown, fallbackKey: string): void {
    const statusKey = error instanceof HttpErrorResponse ? FILE_ACTION_ERROR_KEYS[error.status] : undefined;
    this.eventBus.emit(DomainEventType.ERROR, { message: statusKey ?? fallbackKey, code: ERROR_CODE, context: SERVICE_CONTEXT });
  }

  private summaryText(files: IErpImportFile[]): string {
    return erpImportCountSummary(sumErpImportCounts(files))
      .map((part) => this.translate.instant(part.key, part.params))
      .join(ERP_IMPORT_SUMMARY_SEPARATOR);
  }

  private failureReasonText(failureReason: string | null): string {
    const text = erpImportFailureReasonText(failureReason);
    return text ? this.translate.instant(text.key, text.params) : failureReason ?? '';
  }

  private perFileName(prefix: string, id: string): string {
    return `${prefix}${CODE_SEPARATOR}${id}`;
  }

  private fileNameOf(id: string): string {
    return allErpImportFiles(this.files()).find((file) => file.id === id)?.fileName ?? '';
  }
}

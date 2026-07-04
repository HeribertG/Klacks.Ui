// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain facade for the automatically managed ERP drop point, mediating between the settings UI
 * and the infrastructure API service (default resource, file explorer, uploads and import runs).
 * @param defaultDropPoint - Signal holding the automatically managed drop point, or null before loading
 * @param files - Signal holding the stored files grouped by state (pending, processed, error)
 * @param isLoading - Signal indicating whether the drop point is currently being (re)loaded
 * @param isLoadingFiles - Signal indicating whether the file listing is currently being (re)loaded
 * @param isUploading - Signal indicating whether a file upload is currently running
 * @param isRetrying - Signal indicating whether a failed file is currently being moved back to the inbox
 * @param isDeleting - Signal indicating whether a failed file is currently being permanently deleted
 * @param isTriggeringImport - Signal indicating whether a manual import run is currently being triggered
 */

import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataErpDropPointService } from 'src/app/infrastructure/api/settings/data-erp-drop-point.service';
import {
  IErpDropPoint,
  IErpDropPointFiles,
  IErpDropPointRequest,
} from 'src/app/domain/models/settings/erp-drop-point';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';

const XML_FILE_EXTENSION = '.xml';
const EMPTY_FILES: IErpDropPointFiles = { pending: [], processed: [], error: [] };
const PROCESSING_POLL_INTERVAL_MS = 4000;
const PROCESSING_POLL_TIMEOUT_MS = 90000;
const KEY_SEPARATOR = '/';

@Injectable({
  providedIn: 'root',
})
export class DataManagementErpDropPointService {
  private dataService = inject(DataErpDropPointService);
  private eventBus = inject(EVENT_BUS_TOKEN);

  public defaultDropPoint = signal<IErpDropPoint | null>(null);
  public files = signal<IErpDropPointFiles>(EMPTY_FILES);
  public isLoading = signal(false);
  public isLoadingFiles = signal(false);
  public isUploading = signal(false);
  public isRetrying = signal(false);
  public isDeleting = signal(false);
  public isTriggeringImport = signal(false);

  async loadDefaultDropPoint(): Promise<IErpDropPoint | null> {
    try {
      this.isLoading.set(true);
      const dropPoint = await firstValueFrom(this.dataService.getDefaultDropPoint());
      this.defaultDropPoint.set(dropPoint);
      return dropPoint;
    } catch (error) {
      console.error('Error loading ERP drop point:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.erp-drop-points.error.load', code: 'ErpDropPointError', context: 'DataManagementErpDropPointService' });
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateDropPoint(id: string, request: IErpDropPointRequest): Promise<IErpDropPoint | undefined> {
    try {
      const updated = await firstValueFrom(this.dataService.updateDropPoint(id, request));
      this.defaultDropPoint.set(updated);

      this.eventBus.emit(DomainEventType.SUCCESS, { message: 'settings.erp-drop-points.success.update', context: 'Success' });
      return updated;
    } catch (error) {
      console.error('Error updating ERP drop point:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.erp-drop-points.error.save', code: 'ErpDropPointError', context: 'DataManagementErpDropPointService' });
      return undefined;
    }
  }

  isXmlFile(file: File): boolean {
    return file.name.toLowerCase().endsWith(XML_FILE_EXTENSION);
  }

  async uploadFile(file: File): Promise<string | null> {
    if (!this.isXmlFile(file)) {
      this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.erp-drop-points.error.invalid-file-type', code: 'ErpDropPointError', context: 'DataManagementErpDropPointService' });
      return null;
    }

    try {
      this.isUploading.set(true);
      const result = await firstValueFrom(this.dataService.uploadFile(file));

      this.eventBus.emit(DomainEventType.SUCCESS, { message: 'settings.erp-drop-points.success.upload', context: 'Success' });
      return result.key;
    } catch (error) {
      console.error('Error uploading ERP drop point file:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.erp-drop-points.error.upload', code: 'ErpDropPointError', context: 'DataManagementErpDropPointService' });
      return null;
    } finally {
      this.isUploading.set(false);
    }
  }

  async watchProcessingResults(uploadedKeys: string[]): Promise<void> {
    const remaining = new Set(uploadedKeys.map((key) => this.storedFileName(key)));
    if (remaining.size === 0) {
      return;
    }

    let rejectedCount = 0;
    let processedCount = 0;
    const deadline = Date.now() + PROCESSING_POLL_TIMEOUT_MS;

    while (remaining.size > 0 && Date.now() < deadline) {
      await this.delay(PROCESSING_POLL_INTERVAL_MS);
      const files = await this.loadFiles();

      for (const storedName of [...remaining]) {
        const suffix = KEY_SEPARATOR + storedName;
        if (files.error.some((f) => f.key.endsWith(suffix))) {
          rejectedCount++;
          remaining.delete(storedName);
        } else if (files.processed.some((f) => f.key.endsWith(suffix))) {
          processedCount++;
          remaining.delete(storedName);
        }
      }
    }

    if (rejectedCount > 0) {
      this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.erp-drop-points.files.import-rejected', code: 'ErpImportRejected', context: 'DataManagementErpDropPointService' });
    } else if (processedCount > 0) {
      this.eventBus.emit(DomainEventType.SUCCESS, { message: 'settings.erp-drop-points.files.import-processed', context: 'Success' });
    }

    if (remaining.size > 0) {
      this.eventBus.emit(DomainEventType.INFO, { message: 'settings.erp-drop-points.files.import-still-running', context: 'Info' });
    }
  }

  private storedFileName(key: string): string {
    return key.substring(key.lastIndexOf(KEY_SEPARATOR) + 1);
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  async loadFiles(): Promise<IErpDropPointFiles> {
    try {
      this.isLoadingFiles.set(true);
      const files = await firstValueFrom(this.dataService.getFiles());
      this.files.set(files);
      return files;
    } catch (error) {
      console.error('Error loading ERP drop point files:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.erp-drop-points.files.error.load', code: 'ErpDropPointError', context: 'DataManagementErpDropPointService' });
      return EMPTY_FILES;
    } finally {
      this.isLoadingFiles.set(false);
    }
  }

  async retryFile(key: string): Promise<boolean> {
    try {
      this.isRetrying.set(true);
      await firstValueFrom(this.dataService.retryFile(key));

      this.eventBus.emit(DomainEventType.SUCCESS, { message: 'settings.erp-drop-points.files.success.retry', context: 'Success' });
      return true;
    } catch (error) {
      console.error('Error retrying ERP drop point file:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.erp-drop-points.files.error.retry', code: 'ErpDropPointError', context: 'DataManagementErpDropPointService' });
      return false;
    } finally {
      this.isRetrying.set(false);
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      this.isDeleting.set(true);
      await firstValueFrom(this.dataService.deleteFile(key));

      this.eventBus.emit(DomainEventType.SUCCESS, { message: 'settings.erp-drop-points.files.success.delete', context: 'Success' });
      return true;
    } catch (error) {
      console.error('Error deleting ERP drop point file:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.erp-drop-points.files.error.delete', code: 'ErpDropPointError', context: 'DataManagementErpDropPointService' });
      return false;
    } finally {
      this.isDeleting.set(false);
    }
  }

  async triggerImportRun(): Promise<boolean> {
    try {
      this.isTriggeringImport.set(true);
      await firstValueFrom(this.dataService.triggerImportRun());

      this.eventBus.emit(DomainEventType.SUCCESS, { message: 'settings.erp-drop-points.success.run-import', context: 'Success' });
      return true;
    } catch (error) {
      console.error('Error triggering ERP import run:', error);
      this.eventBus.emit(DomainEventType.ERROR, { message: 'settings.erp-drop-points.error.run-import', code: 'ErpDropPointError', context: 'DataManagementErpDropPointService' });
      return false;
    } finally {
      this.isTriggeringImport.set(false);
    }
  }
}

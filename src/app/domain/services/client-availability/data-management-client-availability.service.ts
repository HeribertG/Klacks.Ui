// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  IClientAvailability,
  IClientAvailabilityBulkRequest,
} from 'src/app/domain/models/client-availability/client-availability-class';
import { DataClientAvailabilityService } from 'src/app/infrastructure/api/client-availability/data-client-availability.service';

const AUTO_SAVE_DEBOUNCE_MS = 800;

@Injectable()
export class DataManagementClientAvailabilityService {
  private dataService = inject(DataClientAvailabilityService);

  public isRead = signal(false);
  private hourCache = new Map<string, boolean>();
  private dirtyKeys = new Set<string>();
  private loadedItems: IClientAvailability[] = [];
  private saveSubject = new Subject<void>();
  private isSaving = false;

  constructor() {
    this.saveSubject
      .pipe(debounceTime(AUTO_SAVE_DEBOUNCE_MS))
      .subscribe(() => this.persistChanges());
  }

  private static buildKey(clientId: string, date: string, hour: number): string {
    return `${clientId}_${date}_${hour}`;
  }

  async readDataAsync(startDate: string, endDate: string): Promise<void> {
    this.isRead.set(false);

    const items = await firstValueFrom(
      this.dataService.getAvailabilities(startDate, endDate)
    );

    this.hourCache.clear();
    this.dirtyKeys.clear();
    this.loadedItems = items ?? [];

    for (const item of this.loadedItems) {
      const key = DataManagementClientAvailabilityService.buildKey(
        item.clientId,
        item.date,
        item.hour
      );
      this.hourCache.set(key, item.isAvailable);
    }

    this.isRead.set(true);
  }

  isHourAvailable(clientId: string, date: string, hour: number): boolean {
    const key = DataManagementClientAvailabilityService.buildKey(clientId, date, hour);
    return this.hourCache.get(key) ?? false;
  }

  isGroupAvailable(
    clientId: string,
    date: string,
    startHour: number,
    endHour: number
  ): boolean {
    const prefix = `${clientId}_${date}_`;
    for (let h = startHour; h < endHour; h++) {
      if (!(this.hourCache.get(prefix + h) ?? false)) {
        return false;
      }
    }
    return true;
  }

  setHourRange(
    clientId: string,
    date: string,
    startHour: number,
    endHour: number,
    value: boolean
  ): void {
    for (let h = startHour; h < endHour; h++) {
      const key = DataManagementClientAvailabilityService.buildKey(clientId, date, h);
      const current = this.hourCache.get(key) ?? false;
      if (current !== value) {
        this.hourCache.set(key, value);
        this.dirtyKeys.add(key);
      }
    }
    this.saveSubject.next();
  }

  toggleAvailability(
    clientId: string,
    date: string,
    startHour: number,
    endHour: number
  ): void {
    const currentlyAvailable = this.isGroupAvailable(clientId, date, startHour, endHour);
    this.setHourRange(clientId, date, startHour, endHour, !currentlyAvailable);
  }

  private async persistChanges(): Promise<void> {
    if (this.dirtyKeys.size === 0 || this.isSaving) return;

    this.isSaving = true;
    const keysToSave = new Set(this.dirtyKeys);
    this.dirtyKeys.clear();

    try {
      const items: IClientAvailability[] = [];
      for (const key of keysToSave) {
        const parts = key.split('_');
        const clientId = parts[0];
        const date = parts[1];
        const hour = parseInt(parts[2], 10);
        const isAvailable = this.hourCache.get(key) ?? false;

        const existing = this.loadedItems.find(
          (i) => i.clientId === clientId && i.date === date && i.hour === hour
        );

        items.push({
          id: existing?.id ?? '00000000-0000-0000-0000-000000000000',
          clientId,
          date,
          hour,
          isAvailable,
        });
      }

      const request: IClientAvailabilityBulkRequest = { items };
      await firstValueFrom(this.dataService.bulkUpdate(request));
    } catch {
      for (const key of keysToSave) {
        this.dirtyKeys.add(key);
      }
      this.saveSubject.next();
    } finally {
      this.isSaving = false;
      if (this.dirtyKeys.size > 0) {
        this.saveSubject.next();
      }
    }
  }
}

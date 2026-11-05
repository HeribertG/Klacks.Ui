// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Holds the hourly client availabilities of the availability page in three stored states
 * (true = can work, false = blocked, no entry) and saves changes debounced through the bulk endpoint.
 * A hour that loses its entry is sent with isAvailable null so the backend removes the stored row.
 * @param dataService - HTTP client for reading and bulk-saving the availability rows
 */

import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { IClientAvailabilityBulkItem } from 'src/app/domain/models/client-availability/client-availability-bulk-item.interface';
import { IClientAvailabilityBulkRequest } from 'src/app/domain/models/client-availability/client-availability-bulk-request.interface';
import { AvailabilityDisplayState } from 'src/app/domain/models/client-availability/availability-display-state.enum';
import { EMPTY_GUID } from 'src/app/domain/constants/empty-guid.constants';
import { StoredAvailability } from 'src/app/domain/models/client-availability/stored-availability.type';
import { IAvailabilityHourAddress } from 'src/app/domain/models/client-availability/availability-hour-address.interface';
import { IAvailabilityHourDisplayState } from 'src/app/domain/models/client-availability/availability-hour-display-state.interface';
import {
  nextGroupStoredValue,
  resolveGroupDisplayState,
  resolveGroupHourDisplayStates,
} from 'src/app/domain/helpers/availability-display-state.helper';
import { DataClientAvailabilityService } from 'src/app/infrastructure/api/client-availability/data-client-availability.service';

export const AVAILABILITY_AUTO_SAVE_DEBOUNCE_MS = 800;

@Injectable()
export class DataManagementClientAvailabilityService {
  private dataService = inject(DataClientAvailabilityService);

  public isRead = signal(false);
  private hourCache = new Map<string, boolean>();
  private availableCountByDay = new Map<string, number>();
  private loadedIds = new Map<string, string>();
  private dirtyHours = new Map<string, IAvailabilityHourAddress>();
  private saveSubject = new Subject<void>();
  private isSaving = false;

  constructor() {
    this.saveSubject
      .pipe(debounceTime(AVAILABILITY_AUTO_SAVE_DEBOUNCE_MS))
      .subscribe(() => this.persistChanges());
  }

  private static buildKey(clientId: string, date: string, hour: number): string {
    return `${clientId}_${date}_${hour}`;
  }

  private static buildDayKey(clientId: string, date: string): string {
    return `${clientId}_${date}`;
  }

  async readDataAsync(startDate: string, endDate: string): Promise<void> {
    this.isRead.set(false);

    const items = await firstValueFrom(
      this.dataService.getAvailabilities(startDate, endDate)
    );

    this.hourCache.clear();
    this.availableCountByDay.clear();
    this.loadedIds.clear();
    this.dirtyHours.clear();

    for (const item of items ?? []) {
      const key = DataManagementClientAvailabilityService.buildKey(item.clientId, item.date, item.hour);
      this.writeStored(key, item.clientId, item.date, item.isAvailable);
      this.loadedIds.set(key, item.id);
    }

    this.isRead.set(true);
  }

  getStoredHour(clientId: string, date: string, hour: number): StoredAvailability {
    return this.hourCache.get(DataManagementClientAvailabilityService.buildKey(clientId, date, hour));
  }

  isHourAvailable(clientId: string, date: string, hour: number): boolean {
    return this.getStoredHour(clientId, date, hour) === true;
  }

  dayHasAvailableHour(clientId: string, date: string): boolean {
    return (this.availableCountByDay.get(DataManagementClientAvailabilityService.buildDayKey(clientId, date)) ?? 0) > 0;
  }

  getGroupDisplayState(
    clientId: string,
    date: string,
    startHour: number,
    endHour: number
  ): AvailabilityDisplayState {
    return resolveGroupDisplayState(
      this.getGroupStoredStates(clientId, date, startHour, endHour),
      this.dayHasAvailableHour(clientId, date)
    );
  }

  getGroupHourDisplayStates(
    clientId: string,
    date: string,
    startHour: number,
    endHour: number
  ): IAvailabilityHourDisplayState[] {
    return resolveGroupHourDisplayStates(
      startHour,
      this.getGroupStoredStates(clientId, date, startHour, endHour),
      this.dayHasAvailableHour(clientId, date)
    );
  }

  getNextGroupValue(
    clientId: string,
    date: string,
    startHour: number,
    endHour: number
  ): boolean | null {
    const storedStates = this.getGroupStoredStates(clientId, date, startHour, endHour);
    const availableInGroup = storedStates.filter((stored) => stored === true).length;
    const availableOnDay = this.availableCountByDay.get(DataManagementClientAvailabilityService.buildDayKey(clientId, date)) ?? 0;
    return nextGroupStoredValue(storedStates, availableOnDay > availableInGroup);
  }

  setHourRange(
    clientId: string,
    date: string,
    startHour: number,
    endHour: number,
    value: boolean | null
  ): void {
    const target = value ?? undefined;
    for (let h = startHour; h < endHour; h++) {
      const key = DataManagementClientAvailabilityService.buildKey(clientId, date, h);
      if (this.hourCache.get(key) !== target) {
        this.writeStored(key, clientId, date, target);
        this.dirtyHours.set(key, { clientId, date, hour: h });
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
    const next = this.getNextGroupValue(clientId, date, startHour, endHour);
    this.setHourRange(clientId, date, startHour, endHour, next);
  }

  private getGroupStoredStates(
    clientId: string,
    date: string,
    startHour: number,
    endHour: number
  ): StoredAvailability[] {
    const states: StoredAvailability[] = [];
    for (let h = startHour; h < endHour; h++) {
      states.push(this.getStoredHour(clientId, date, h));
    }
    return states;
  }

  private writeStored(key: string, clientId: string, date: string, value: StoredAvailability): void {
    const wasAvailable = this.hourCache.get(key) === true;
    if (value === undefined) {
      this.hourCache.delete(key);
    } else {
      this.hourCache.set(key, value);
    }
    const isAvailable = value === true;
    if (wasAvailable !== isAvailable) {
      const dayKey = DataManagementClientAvailabilityService.buildDayKey(clientId, date);
      const count = (this.availableCountByDay.get(dayKey) ?? 0) + (isAvailable ? 1 : -1);
      if (count > 0) {
        this.availableCountByDay.set(dayKey, count);
      } else {
        this.availableCountByDay.delete(dayKey);
      }
    }
  }

  private async persistChanges(): Promise<void> {
    if (this.dirtyHours.size === 0 || this.isSaving) return;

    this.isSaving = true;
    const hoursToSave = new Map(this.dirtyHours);
    this.dirtyHours.clear();

    try {
      const items: IClientAvailabilityBulkItem[] = [];
      for (const [key, address] of hoursToSave) {
        items.push({
          id: this.loadedIds.get(key) ?? EMPTY_GUID,
          clientId: address.clientId,
          date: address.date,
          hour: address.hour,
          isAvailable: this.hourCache.get(key) ?? null,
        });
      }

      const request: IClientAvailabilityBulkRequest = { items };
      await firstValueFrom(this.dataService.bulkUpdate(request));
      this.forgetRemovedRows(items);
    } catch {
      for (const [key, address] of hoursToSave) {
        if (!this.dirtyHours.has(key)) {
          this.dirtyHours.set(key, address);
        }
      }
      this.saveSubject.next();
    } finally {
      this.isSaving = false;
      if (this.dirtyHours.size > 0) {
        this.saveSubject.next();
      }
    }
  }

  private forgetRemovedRows(sentItems: IClientAvailabilityBulkItem[]): void {
    for (const item of sentItems) {
      const key = DataManagementClientAvailabilityService.buildKey(item.clientId, item.date, item.hour);
      if (item.isAvailable === null && !this.hourCache.has(key)) {
        this.loadedIds.delete(key);
      }
    }
  }
}

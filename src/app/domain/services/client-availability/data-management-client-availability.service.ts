// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  IClientAvailability,
  IClientAvailabilityBulkRequest,
} from 'src/app/domain/models/client-availability/client-availability-class';
import { DataClientAvailabilityService } from 'src/app/infrastructure/api/client-availability/data-client-availability.service';

@Injectable()
export class DataManagementClientAvailabilityService {
  private dataService = inject(DataClientAvailabilityService);

  public isRead = signal(false);
  public availabilityMap = new Map<string, boolean>();
  private dirtyKeys = new Set<string>();
  private loadedItems: IClientAvailability[] = [];

  private static buildKey(clientId: string, date: string, hour: number): string {
    return `${clientId}_${date}_${hour}`;
  }

  async readDataAsync(startDate: string, endDate: string): Promise<void> {
    this.isRead.set(false);

    const items = await firstValueFrom(
      this.dataService.getAvailabilities(startDate, endDate)
    );

    this.availabilityMap.clear();
    this.dirtyKeys.clear();
    this.loadedItems = items ?? [];

    for (const item of this.loadedItems) {
      const key = DataManagementClientAvailabilityService.buildKey(
        item.clientId,
        item.date,
        item.hour
      );
      this.availabilityMap.set(key, item.isAvailable);
    }

    this.isRead.set(true);
  }

  isGroupAvailable(
    clientId: string,
    date: string,
    startHour: number,
    endHour: number
  ): boolean {
    for (let h = startHour; h < endHour; h++) {
      const key = DataManagementClientAvailabilityService.buildKey(
        clientId,
        date,
        h
      );
      if (!this.availabilityMap.get(key)) {
        return false;
      }
    }
    return true;
  }

  toggleAvailability(
    clientId: string,
    date: string,
    startHour: number,
    endHour: number
  ): void {
    const currentlyAvailable = this.isGroupAvailable(
      clientId,
      date,
      startHour,
      endHour
    );
    const newValue = !currentlyAvailable;

    for (let h = startHour; h < endHour; h++) {
      const key = DataManagementClientAvailabilityService.buildKey(
        clientId,
        date,
        h
      );
      this.availabilityMap.set(key, newValue);
      this.dirtyKeys.add(key);
    }
  }

  get hasDirtyChanges(): boolean {
    return this.dirtyKeys.size > 0;
  }

  async saveChanges(): Promise<number> {
    if (this.dirtyKeys.size === 0) {
      return 0;
    }

    const items: IClientAvailability[] = [];
    for (const key of this.dirtyKeys) {
      const parts = key.split('_');
      const clientId = parts[0];
      const date = parts[1];
      const hour = parseInt(parts[2], 10);
      const isAvailable = this.availabilityMap.get(key) ?? false;

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
    const count = await firstValueFrom(this.dataService.bulkUpdate(request));
    this.dirtyKeys.clear();
    return count;
  }
}

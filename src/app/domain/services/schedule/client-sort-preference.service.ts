// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Manages the per-user, per-group client sort order.
 * Loads preferences from the API on group change, applies them client-side with alphabetical fallback for unranked clients, and persists changes on drop with optimistic update and rollback on failure.
 * @param _sortMap - Signal holding clientId → sortOrder mapping for the active group
 */

import { inject, Injectable, signal } from '@angular/core';
import { ClientSortPreferenceApiService } from 'src/app/infrastructure/api/schedule/client-sort-preference-api.service';
import { IClientWork } from 'src/app/domain/models/schedule/schedule-class';

@Injectable({ providedIn: 'root' })
export class ClientSortPreferenceService {
  private readonly api = inject(ClientSortPreferenceApiService);
  private readonly _sortMap = signal<Map<string, number>>(new Map());
  private _previousSortMap = new Map<string, number>();

  async loadForGroup(groupId: string): Promise<void> {
    try {
      const dtos = await this.api.getSortOrder(groupId);
      this._sortMap.set(new Map(dtos.map(d => [d.clientId, d.sortOrder])));
    } catch {
      this._sortMap.set(new Map());
    }
  }

  applyTo(clients: IClientWork[]): IClientWork[] {
    const map = this._sortMap();

    if (map.size === 0) {
      return [...clients].sort(ClientSortPreferenceService.alphabetical);
    }

    const sorted = clients
      .filter(c => map.has(c.id))
      .sort((a, b) => map.get(a.id)! - map.get(b.id)!);

    const unsorted = clients
      .filter(c => !map.has(c.id))
      .sort(ClientSortPreferenceService.alphabetical);

    return [...sorted, ...unsorted];
  }

  async save(groupId: string, orderedClients: IClientWork[]): Promise<void> {
    this._previousSortMap = new Map(this._sortMap());

    const newMap = new Map(orderedClients.map((c, i) => [c.id, i]));
    this._sortMap.set(newMap);

    const dtos = orderedClients.map((c, i) => ({ clientId: c.id, sortOrder: i }));

    try {
      await this.api.saveSortOrder(groupId, dtos);
    } catch (e) {
      this._sortMap.set(this._previousSortMap);
      throw e;
    }
  }

  private static alphabetical(a: IClientWork, b: IClientWork): number {
    const nameA = (a.name ?? '').toLowerCase();
    const nameB = (b.name ?? '').toLowerCase();
    if (nameA !== nameB) return nameA.localeCompare(nameB);
    return (a.firstName ?? '').toLowerCase()
      .localeCompare((b.firstName ?? '').toLowerCase());
  }
}

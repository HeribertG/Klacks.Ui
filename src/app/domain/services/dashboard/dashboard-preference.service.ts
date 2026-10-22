// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Remembers per browser how the dashboard is laid out: which sections are visible, their order and the view mode of
 * the locations card. Stored values are validated on read: unknown or non-boolean visibility entries are ignored,
 * unknown section keys are dropped from the order and missing ones appended in default order, and an unreadable
 * (corrupt) entry counts as "nothing stored".
 * @param sectionKeys - All known section keys
 * @param defaultOrder - Default section order; also the set of known section keys for the order
 */

import { inject, Injectable } from '@angular/core';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocationViewMode } from 'src/app/domain/models/dashboard/location-view-mode.type';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';

const LOCATION_VIEW_MODES: readonly string[] = ['city', 'group'];

@Injectable({ providedIn: 'root' })
export class DashboardPreferenceService {
  private localStorageService = inject(LocalStorageService);

  readSectionVisibility(sectionKeys: readonly string[]): Record<string, boolean> | null {
    try {
      const stored = this.localStorageService.getJson(StorageKeys.DASHBOARD_SECTION_VISIBILITY) as Record<
        string,
        unknown
      > | null;
      if (!stored) return null;
      const visibility: Record<string, boolean> = {};
      sectionKeys.forEach((key) => {
        const value = stored[key];
        if (key in stored && typeof value === 'boolean') {
          visibility[key] = value;
        }
      });
      return visibility;
    } catch {
      return null;
    }
  }

  saveSectionVisibility(visibility: Record<string, boolean>): void {
    this.localStorageService.setJson(StorageKeys.DASHBOARD_SECTION_VISIBILITY, visibility);
  }

  readSectionOrder(defaultOrder: readonly string[]): string[] | null {
    try {
      const stored = this.localStorageService.getJson(StorageKeys.DASHBOARD_SECTION_ORDER) as string[] | null;
      if (!Array.isArray(stored)) return null;
      const valid = stored.filter((k) => defaultOrder.includes(k));
      const missing = defaultOrder.filter((k) => !valid.includes(k));
      return [...valid, ...missing];
    } catch {
      return null;
    }
  }

  saveSectionOrder(order: string[]): void {
    this.localStorageService.setJson(StorageKeys.DASHBOARD_SECTION_ORDER, order);
  }

  readLocationViewMode(): LocationViewMode | null {
    const savedMode = this.localStorageService.get(StorageKeys.DASHBOARD_LOCATION_VIEW_MODE);
    return savedMode !== null && LOCATION_VIEW_MODES.includes(savedMode) ? (savedMode as LocationViewMode) : null;
  }

  saveLocationViewMode(mode: LocationViewMode): void {
    this.localStorageService.set(StorageKeys.DASHBOARD_LOCATION_VIEW_MODE, mode);
  }

  removeLegacyMapTileProvider(): void {
    this.localStorageService.remove(StorageKeys.DASHBOARD_LEGACY_MAP_TILE_PROVIDER);
  }
}

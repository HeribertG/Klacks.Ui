// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { DashboardPreferenceService } from './dashboard-preference.service';

describe('DashboardPreferenceService', () => {
  let storage: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    getJson: ReturnType<typeof vi.fn>;
    setJson: ReturnType<typeof vi.fn>;
  };
  let service: DashboardPreferenceService;
  const keys = ['a', 'b', 'c'];

  beforeEach(() => {
    storage = { get: vi.fn(), set: vi.fn(), remove: vi.fn(), getJson: vi.fn(), setJson: vi.fn() };
    TestBed.configureTestingModule({
      providers: [DashboardPreferenceService, { provide: LocalStorageService, useValue: storage }],
    });
    service = TestBed.inject(DashboardPreferenceService);
  });

  describe('section visibility', () => {
    it('keeps only known keys with boolean values', () => {
      storage.getJson.mockReturnValue({ a: false, b: 'yes', x: true });

      expect(service.readSectionVisibility(keys)).toEqual({ a: false });
      expect(storage.getJson).toHaveBeenCalledWith(StorageKeys.DASHBOARD_SECTION_VISIBILITY);
    });

    it('reports nothing stored for an empty or corrupt entry', () => {
      storage.getJson.mockReturnValue(null);
      expect(service.readSectionVisibility(keys)).toBeNull();

      storage.getJson.mockImplementation(() => {
        throw new SyntaxError('corrupt');
      });
      expect(service.readSectionVisibility(keys)).toBeNull();
    });

    it('reports nothing stored when the entry is not an object', () => {
      storage.getJson.mockReturnValue('text');

      expect(service.readSectionVisibility(keys)).toBeNull();
    });

    it('stores the visibility as JSON', () => {
      service.saveSectionVisibility({ a: true });

      expect(storage.setJson).toHaveBeenCalledWith(StorageKeys.DASHBOARD_SECTION_VISIBILITY, { a: true });
    });
  });

  describe('section order', () => {
    it('drops unknown keys and appends missing ones in default order', () => {
      storage.getJson.mockReturnValue(['c', 'x', 'a']);

      expect(service.readSectionOrder(keys)).toEqual(['c', 'a', 'b']);
    });

    it('reports nothing stored for a non-array or corrupt entry', () => {
      storage.getJson.mockReturnValue({ a: 1 });
      expect(service.readSectionOrder(keys)).toBeNull();

      storage.getJson.mockImplementation(() => {
        throw new SyntaxError('corrupt');
      });
      expect(service.readSectionOrder(keys)).toBeNull();
    });

    it('stores the order as JSON', () => {
      service.saveSectionOrder(['b', 'a']);

      expect(storage.setJson).toHaveBeenCalledWith(StorageKeys.DASHBOARD_SECTION_ORDER, ['b', 'a']);
    });
  });

  describe('location view mode', () => {
    it('accepts only city or group', () => {
      storage.get.mockReturnValue('group');
      expect(service.readLocationViewMode()).toBe('group');

      storage.get.mockReturnValue('city');
      expect(service.readLocationViewMode()).toBe('city');

      storage.get.mockReturnValue('map');
      expect(service.readLocationViewMode()).toBeNull();

      storage.get.mockReturnValue(null);
      expect(service.readLocationViewMode()).toBeNull();
      expect(storage.get).toHaveBeenCalledWith('dashboard-location-view-mode');
    });

    it('stores the mode and removes the legacy tile provider entry', () => {
      service.saveLocationViewMode('group');
      service.removeLegacyMapTileProvider();

      expect(storage.set).toHaveBeenCalledWith('dashboard-location-view-mode', 'group');
      expect(storage.remove).toHaveBeenCalledWith('dashboard-map-tile-provider');
    });
  });
});

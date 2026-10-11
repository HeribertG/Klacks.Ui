// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ClientType, DashboardClientsLocationsComponent, LocationData } from './dashboard-clients-locations.component';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { DataGeocodingService } from 'src/app/infrastructure/api/data-geocoding.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { SpinnerService } from 'src/app/presentation/spinner/spinner.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { IClientLocationResource } from 'src/app/domain/models/dashboard-class';
import { GeocodingSearchStatus } from 'src/app/domain/models/geo/geocoding-search-status.model';
import {
  createGeoServicesConfigMock,
  GeoServicesConfigMock,
  TEST_MAP_TILE_CONFIG,
} from 'src/app/shared/testing/geo-services-config.testing';

const LEGACY_TILE_PROVIDER_KEY = 'dashboard-map-tile-provider';
const MAP_CONTAINER_SELECTOR = '#map-container';
const MAP_NOTICE_SELECTOR = 'app-geo-service-notice[service="map"]';
const GEOCODING_NOTICE_SELECTOR = 'app-geo-service-notice[service="geocoding"]';
const SEARCH_INPUT_SELECTOR = 'app-search-input';
const STREET_VIEW_BUTTON_SELECTOR = '.location-card > .btn';
const XSS_PAYLOAD = '<img src=x onerror=alert(1)>';

interface MarkerRenderingAccess {
  map: { fitBounds: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  markerClusterGroup: { clearLayers: ReturnType<typeof vi.fn>; addLayer: ReturnType<typeof vi.fn> };
  loadMarkersOnMap(locations: LocationData[]): void;
}

const CLIENTS: IClientLocationResource[] = [
  { id: '1', type: ClientType.Customer, currentAddress: { city: 'Bern', country: 'CH', zip: '3000', latitude: 46.9, longitude: 7.4 } },
  { id: '2', type: ClientType.Customer, currentAddress: { city: 'Bern', country: 'CH', zip: '3001', latitude: 47.1, longitude: 7.6 } },
  { id: '3', type: ClientType.Employee, currentAddress: { city: 'Bern', country: 'CH', zip: '3002', latitude: null, longitude: null } },
];

describe('DashboardClientsLocationsComponent', () => {
  let fixture: ComponentFixture<DashboardClientsLocationsComponent>;
  let config: GeoServicesConfigMock;
  let localStorageService: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  let toastService: { showError: ReturnType<typeof vi.fn> };
  let geocodingService: { searchAddress: ReturnType<typeof vi.fn> };
  let errorSpy: ReturnType<typeof vi.spyOn>;

  const setup = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [DashboardClientsLocationsComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataDashboardService,
          useValue: {
            getVisibilityStatus: () => of({ isRestricted: false, hasVisibleGroups: true }),
            getClientsLocationsData: () => of(CLIENTS),
            getClientsOverviewData: () => of({ nodes: [] }),
          },
        },
        { provide: DataGeocodingService, useValue: geocodingService },
        { provide: LocalStorageService, useValue: localStorageService },
        { provide: SpinnerService, useValue: { showProgressSpinner: false } },
        { provide: ToastShowService, useValue: toastService },
        { provide: GeoServicesConfigService, useValue: config },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardClientsLocationsComponent);
    fixture.detectChanges();
  };

  const find = (selector: string): Element | null => fixture.nativeElement.querySelector(selector);

  beforeEach(() => {
    config = createGeoServicesConfigMock();
    localStorageService = { get: vi.fn().mockReturnValue(null), set: vi.fn(), remove: vi.fn() };
    toastService = { showError: vi.fn() };
    geocodingService = { searchAddress: vi.fn() };
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    TestBed.resetTestingModule();
  });

  it('loads the geo services configuration and forgets the old tile provider choice', async () => {
    await setup();

    expect(config.ensureLoaded).toHaveBeenCalled();
    expect(localStorageService.remove).toHaveBeenCalledWith(LEGACY_TILE_PROVIDER_KEY);
  });

  it('shows the map notice instead of the map when tiles are off', async () => {
    await setup();

    expect(find(MAP_CONTAINER_SELECTOR)).toBeNull();
    expect(find(MAP_NOTICE_SELECTOR)).not.toBeNull();
    expect(find(SEARCH_INPUT_SELECTOR)).toBeNull();
  });

  it('shows the map and the search when tiles and geocoding are on', async () => {
    config.mapTilesEnabled.set(true);
    config.mapTiles.set(TEST_MAP_TILE_CONFIG);
    config.geocodingEnabled.set(true);

    await setup();

    expect(find(MAP_CONTAINER_SELECTOR)).not.toBeNull();
    expect(find(MAP_NOTICE_SELECTOR)).toBeNull();
    expect(find(SEARCH_INPUT_SELECTOR)).not.toBeNull();
  });

  it('replaces the search with the geocoding notice when only geocoding is off', async () => {
    config.mapTilesEnabled.set(true);
    config.mapTiles.set(TEST_MAP_TILE_CONFIG);

    await setup();

    expect(find(MAP_CONTAINER_SELECTOR)).not.toBeNull();
    expect(find(SEARCH_INPUT_SELECTOR)).toBeNull();
    expect(find(GEOCODING_NOTICE_SELECTOR)).not.toBeNull();
  });

  it('shows the map once a later configuration load enables the tiles', async () => {
    await setup();

    config.mapTilesEnabled.set(true);
    config.mapTiles.set(TEST_MAP_TILE_CONFIG);
    fixture.detectChanges();

    expect(find(MAP_CONTAINER_SELECTOR)).not.toBeNull();
  });

  it('hides the Street View buttons when external map links are off', async () => {
    await setup();

    expect(find(STREET_VIEW_BUTTON_SELECTOR)).toBeNull();
  });

  it('shows the Street View buttons when external map links are on', async () => {
    config.externalMapLinksEnabled.set(true);

    await setup();

    expect(find(STREET_VIEW_BUTTON_SELECTOR)).not.toBeNull();
  });

  it('places a city marker on the mean of the stored client coordinates', async () => {
    await setup();

    const [bern] = fixture.componentInstance.locations();
    expect(bern.count).toBe(3);
    expect(bern.latitude).toBeCloseTo(47.0);
    expect(bern.longitude).toBeCloseTo(7.5);
  });

  it('renders city and country of a marker popup as text, never as markup', async () => {
    await setup();
    const bindPopup = vi.fn();
    vi.stubGlobal('L', { marker: vi.fn(() => ({ bindPopup })) });
    const component = fixture.componentInstance as unknown as MarkerRenderingAccess;
    component.map = { fitBounds: vi.fn(), remove: vi.fn() };
    component.markerClusterGroup = { clearLayers: vi.fn(), addLayer: vi.fn() };

    try {
      component.loadMarkersOnMap([
        {
          city: XSS_PAYLOAD,
          country: XSS_PAYLOAD,
          count: 1,
          employeeCount: 1,
          externEmpCount: 0,
          customerCount: 0,
          latitude: 46.9,
          longitude: 7.4,
        },
      ]);
    } finally {
      vi.unstubAllGlobals();
    }

    const popup = document.createElement('div');
    popup.innerHTML = bindPopup.mock.calls[0][0] as string;
    expect(popup.querySelector('img')).toBeNull();
    expect(popup.querySelector('h4')?.textContent).toBe(`${XSS_PAYLOAD}, ${XSS_PAYLOAD}`);
  });

  it.each([GeocodingSearchStatus.Disabled, GeocodingSearchStatus.Unavailable])(
    'reports a %s search as unavailable rather than as not found',
    async (status) => {
      config.geocodingEnabled.set(true);
      geocodingService.searchAddress.mockReturnValue(
        of({ status, latitude: null, longitude: null, displayName: null }),
      );
      await setup();
      const component = fixture.componentInstance as unknown as { map: { remove: () => void } };
      component.map = { remove: vi.fn() };
      fixture.componentInstance.onSearchQueryChange('Bern');

      fixture.componentInstance.onSearchAddress();

      expect(toastService.showError).toHaveBeenCalledWith('geoServices.search.unavailable');
    },
  );

  it('reports a NotFound search with the existing not-found message', async () => {
    config.geocodingEnabled.set(true);
    geocodingService.searchAddress.mockReturnValue(
      of({ status: GeocodingSearchStatus.NotFound, latitude: null, longitude: null, displayName: null }),
    );
    await setup();
    const component = fixture.componentInstance as unknown as { map: { remove: () => void } };
    component.map = { remove: vi.fn() };
    fixture.componentInstance.onSearchQueryChange('Nowhere');

    fixture.componentInstance.onSearchAddress();

    expect(toastService.showError).toHaveBeenCalledWith('dashboard.locations.searchNotFound');
  });
});

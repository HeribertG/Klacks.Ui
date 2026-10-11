// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { GeoServicesConfigService } from './geo-services-config.service';
import { DataGeoServicesConfigService } from 'src/app/infrastructure/api/settings/data-geo-services-config.service';
import { IGeoServicesConfig } from 'src/app/domain/models/settings/geo-services-config.model';

const ALL_ENABLED: IGeoServicesConfig = {
  noOutboundTraffic: false,
  geocoding: { enabled: true, reason: 'None' },
  routing: { enabled: true, reason: 'None' },
  openRouteService: { enabled: true, reason: 'None' },
  mapTiles: {
    enabled: true,
    reason: 'None',
    urlTemplate: 'https://tiles.example.test/{z}/{x}/{y}.png',
    subdomains: [],
    attribution: 'Test tiles',
    maxZoom: 19,
  },
  externalMapLinksEnabled: true,
};

const NO_OUTBOUND: IGeoServicesConfig = {
  noOutboundTraffic: true,
  geocoding: { enabled: false, reason: 'NoOutboundTraffic' },
  routing: { enabled: false, reason: 'NoOutboundTraffic' },
  openRouteService: { enabled: false, reason: 'NoOutboundTraffic' },
  mapTiles: {
    enabled: false,
    reason: 'NoOutboundTraffic',
    urlTemplate: null,
    subdomains: [],
    attribution: '',
    maxZoom: 19,
  },
  externalMapLinksEnabled: false,
};

describe('GeoServicesConfigService', () => {
  let service: GeoServicesConfigService;
  let mockData: { readGeoServicesConfig: ReturnType<typeof vi.fn> };
  let warnSpy: ReturnType<typeof vi.spyOn>;

  const expectEverythingDisabled = (): void => {
    expect(service.geocodingEnabled()).toBe(false);
    expect(service.routingEnabled()).toBe(false);
    expect(service.openRouteServiceEnabled()).toBe(false);
    expect(service.mapTilesEnabled()).toBe(false);
    expect(service.externalMapLinksEnabled()).toBe(false);
    expect(service.mapTiles()).toBeNull();
  };

  beforeEach(() => {
    mockData = { readGeoServicesConfig: vi.fn().mockReturnValue(of(ALL_ENABLED)) };
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        GeoServicesConfigService,
        { provide: DataGeoServicesConfigService, useValue: mockData },
      ],
    });

    service = TestBed.inject(GeoServicesConfigService);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('keeps every capability disabled before the configuration was loaded', () => {
    expect(service.loadState()).toBe('idle');
    expectEverythingDisabled();
    expect(mockData.readGeoServicesConfig).not.toHaveBeenCalled();
  });

  it('exposes the loaded capabilities', async () => {
    await service.ensureLoaded();

    expect(service.loadState()).toBe('loaded');
    expect(service.geocodingEnabled()).toBe(true);
    expect(service.routingEnabled()).toBe(true);
    expect(service.openRouteServiceEnabled()).toBe(true);
    expect(service.mapTilesEnabled()).toBe(true);
    expect(service.externalMapLinksEnabled()).toBe(true);
    expect(service.mapTiles()).toEqual(ALL_ENABLED.mapTiles);
  });

  it('keeps every capability disabled when the installation forbids outbound traffic', async () => {
    mockData.readGeoServicesConfig.mockReturnValue(of(NO_OUTBOUND));

    await service.ensureLoaded();

    expect(service.loadState()).toBe('loaded');
    expectEverythingDisabled();
  });

  it('treats enabled map tiles without a url template as disabled', async () => {
    mockData.readGeoServicesConfig.mockReturnValue(
      of({ ...ALL_ENABLED, mapTiles: { ...ALL_ENABLED.mapTiles, urlTemplate: null } }),
    );

    await service.ensureLoaded();

    expect(service.mapTilesEnabled()).toBe(false);
    expect(service.mapTiles()).toBeNull();
  });

  it('only fetches once across repeated ensureLoaded calls', async () => {
    await Promise.all([service.ensureLoaded(), service.ensureLoaded()]);
    await service.ensureLoaded();

    expect(mockData.readGeoServicesConfig).toHaveBeenCalledTimes(1);
  });

  it('fails closed and only warns when the configuration cannot be loaded', async () => {
    mockData.readGeoServicesConfig.mockReturnValue(throwError(() => new Error('network down')));

    await service.ensureLoaded();

    expect(service.loadState()).toBe('failed');
    expectEverythingDisabled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('retries on the next ensureLoaded call after a failed load', async () => {
    mockData.readGeoServicesConfig.mockReturnValueOnce(throwError(() => new Error('network down')));

    await service.ensureLoaded();
    await service.ensureLoaded();

    expect(mockData.readGeoServicesConfig).toHaveBeenCalledTimes(2);
    expect(service.loadState()).toBe('loaded');
    expect(service.mapTilesEnabled()).toBe(true);
  });

  it('reload re-fetches after a failure and enables the services', async () => {
    mockData.readGeoServicesConfig.mockReturnValueOnce(throwError(() => new Error('network down')));
    await service.ensureLoaded();

    await service.reload();

    expect(mockData.readGeoServicesConfig).toHaveBeenCalledTimes(2);
    expect(service.geocodingEnabled()).toBe(true);
  });

  it('discards the answer of an older load that arrives after a reload', async () => {
    const olderResponse = new Subject<IGeoServicesConfig>();
    const newerResponse = new Subject<IGeoServicesConfig>();
    mockData.readGeoServicesConfig
      .mockReturnValueOnce(olderResponse.asObservable())
      .mockReturnValueOnce(newerResponse.asObservable());

    const initialLoad = service.ensureLoaded();
    const reload = service.reload();
    newerResponse.next(NO_OUTBOUND);
    newerResponse.complete();
    await reload;
    olderResponse.next(ALL_ENABLED);
    olderResponse.complete();
    await initialLoad;

    expect(service.config()).toEqual(NO_OUTBOUND);
    expectEverythingDisabled();
  });
});

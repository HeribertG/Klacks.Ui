// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { GEO_SERVICES_STATUS_KEYS, GeoServicesStatusComponent } from './geo-services-status.component';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { IGeoServicesConfig } from 'src/app/domain/models/settings/geo-services-config.model';
import { GeoServicesConfigLoadState } from 'src/app/domain/models/settings/geo-services-config-load-state.model';

const NO_OUTBOUND_WITH_OWN_TILES: IGeoServicesConfig = {
  noOutboundTraffic: true,
  geocoding: { enabled: false, reason: 'NoOutboundTraffic' },
  routing: { enabled: true, reason: 'None' },
  openRouteService: { enabled: false, reason: 'DisabledByOperator' },
  mapTiles: {
    enabled: true,
    reason: 'None',
    urlTemplate: 'https://tiles.example.test/{z}/{x}/{y}.png',
    subdomains: [],
    attribution: 'Own tiles',
    maxZoom: 19,
  },
  externalMapLinksEnabled: false,
};

describe('GeoServicesStatusComponent', () => {
  let fixture: ComponentFixture<GeoServicesStatusComponent>;
  let loadState: WritableSignal<GeoServicesConfigLoadState>;
  let config: WritableSignal<IGeoServicesConfig | null>;
  let mockConfigService: {
    loadState: WritableSignal<GeoServicesConfigLoadState>;
    config: WritableSignal<IGeoServicesConfig | null>;
    ensureLoaded: ReturnType<typeof vi.fn>;
    reload: ReturnType<typeof vi.fn>;
  };

  const setup = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [GeoServicesStatusComponent, TranslateModule.forRoot()],
      providers: [{ provide: GeoServicesConfigService, useValue: mockConfigService }],
    }).compileComponents();

    fixture = TestBed.createComponent(GeoServicesStatusComponent);
    fixture.detectChanges();
  };

  const text = (selector: string): string =>
    (fixture.nativeElement.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();

  beforeEach(() => {
    loadState = signal<GeoServicesConfigLoadState>('loaded');
    config = signal<IGeoServicesConfig | null>(NO_OUTBOUND_WITH_OWN_TILES);
    mockConfigService = {
      loadState,
      config,
      ensureLoaded: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('loads the configuration when it is shown', async () => {
    await setup();

    expect(mockConfigService.ensureLoaded).toHaveBeenCalledTimes(1);
  });

  it('shows the outbound switch and every service with status and translated reason', async () => {
    await setup();

    expect(text('#geo-services-status-no-outbound')).toContain(GEO_SERVICES_STATUS_KEYS.enabled);
    expect(text('#geo-services-status-geocoding')).toContain(GEO_SERVICES_STATUS_KEYS.disabled);
    expect(text('#geo-services-status-geocoding')).toContain('geoServices.reason.NoOutboundTraffic');
    expect(text('#geo-services-status-routing')).toContain(GEO_SERVICES_STATUS_KEYS.enabled);
    expect(text('#geo-services-status-routing')).not.toContain('geoServices.reason.');
    expect(text('#geo-services-status-open-route-service')).toContain('geoServices.reason.DisabledByOperator');
    expect(text('#geo-services-status-map-tiles')).toContain(GEO_SERVICES_STATUS_KEYS.enabled);
    expect(text('#geo-services-status-attribution')).toContain('Own tiles');
  });

  it('never shows a url or offers an input field', async () => {
    await setup();

    const html: string = fixture.nativeElement.innerHTML;
    expect(html).not.toContain('tiles.example.test');
    expect(fixture.nativeElement.querySelector('input, select, textarea')).toBeNull();
  });

  it('offers a retry instead of the table when the configuration could not be loaded', async () => {
    loadState.set('failed');
    config.set(null);

    await setup();

    expect(fixture.nativeElement.querySelector('.geo-services-status-table')).toBeNull();
    fixture.nativeElement.querySelector('#geo-services-status-retry').click();
    expect(mockConfigService.reload).toHaveBeenCalledTimes(1);
  });
});

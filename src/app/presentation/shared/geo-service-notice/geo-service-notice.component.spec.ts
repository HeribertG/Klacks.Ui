// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { GeoServiceNoticeComponent, GeoServiceNoticeService } from './geo-service-notice.component';
import { GEO_SERVICE_NOTICE_KEYS } from 'src/app/domain/constants/geo-service-notice.constants';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { createGeoServicesConfigMock, GeoServicesConfigMock } from 'src/app/shared/testing/geo-services-config.testing';

const FAILED_SELECTOR = '.geo-service-notice-failed';
const DISABLED_SELECTOR = '.geo-service-notice-disabled';
const RETRY_SELECTOR = '.geo-service-notice-retry';

describe('GeoServiceNoticeComponent', () => {
  let fixture: ComponentFixture<GeoServiceNoticeComponent>;
  let config: GeoServicesConfigMock;

  const setup = async (service: GeoServiceNoticeService): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [GeoServiceNoticeComponent, TranslateModule.forRoot()],
      providers: [{ provide: GeoServicesConfigService, useValue: config }],
    }).compileComponents();

    fixture = TestBed.createComponent(GeoServiceNoticeComponent);
    fixture.componentRef.setInput('service', service);
    fixture.detectChanges();
  };

  const find = (selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);

  beforeEach(() => {
    config = createGeoServicesConfigMock();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders nothing while the configuration is loading', async () => {
    config.loadState.set('loading');

    await setup('map');

    expect(find(FAILED_SELECTOR)).toBeNull();
    expect(find(DISABLED_SELECTOR)).toBeNull();
  });

  it('renders nothing when the service is active', async () => {
    config.mapTilesEnabled.set(true);

    await setup('map');

    expect(find(FAILED_SELECTOR)).toBeNull();
    expect(find(DISABLED_SELECTOR)).toBeNull();
  });

  it.each<[GeoServiceNoticeService, string]>([
    ['map', GEO_SERVICE_NOTICE_KEYS.mapDisabled],
    ['geocoding', GEO_SERVICE_NOTICE_KEYS.geocodingDisabled],
  ])('shows the operator notice for a disabled %s service', async (service, key) => {
    await setup(service);

    expect(find(DISABLED_SELECTOR)?.textContent?.trim()).toBe(key);
    expect(find(FAILED_SELECTOR)).toBeNull();
  });

  it('shows the load failure with a retry that reloads the configuration', async () => {
    config.loadState.set('failed');

    await setup('map');

    expect(find(FAILED_SELECTOR)).not.toBeNull();
    expect(find(DISABLED_SELECTOR)).toBeNull();

    find(RETRY_SELECTOR)?.click();

    expect(config.reload).toHaveBeenCalledTimes(1);
  });
});

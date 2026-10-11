// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests the external map links (OpenStreetMap, Street View) of the persona card: they follow the
 * installation's geo services configuration and are neither shown nor opened in NoOutbound mode.
 */

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

import { AddressPersonaComponent } from './address-persona.component';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { DataMessagingInvitationService } from 'src/app/infrastructure/api/messaging/data-messaging-invitation.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { WeekConfigurationService } from 'src/app/domain/services/settings/week-configuration.service';
import { EditAddressCardVisibilityService } from 'src/app/presentation/workplace/address/edit-address/edit-address-card-visibility.service';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { EntityTypeEnum } from 'src/app/domain/enums/client-enum';
import { createGeoServicesConfigMock, GeoServicesConfigMock } from 'src/app/shared/testing/geo-services-config.testing';

const LATITUDE = 46.95;
const LONGITUDE = 7.44;
const TEMPLATE_PATH = resolve(dirname(fileURLToPath(import.meta.url)), 'address-persona.component.html');

describe('AddressPersonaComponent external map links', () => {
  let config: GeoServicesConfigMock;
  let openSpy: ReturnType<typeof vi.spyOn>;

  const create = (clientType: number = EntityTypeEnum.customer): AddressPersonaComponent => {
    TestBed.configureTestingModule({
      imports: [AddressPersonaComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementClientService,
          useValue: {
            editClient: signal({ type: clientType, addresses: [{ latitude: LATITUDE, longitude: LONGITUDE }] }),
            currentAddressIndex: signal(0),
            isRead: signal(false),
            isReset: signal(false),
            editClientDeleted: signal(false),
          },
        },
        { provide: FeaturePluginStateService, useValue: {} },
        { provide: AuthorizationService, useValue: {} },
        { provide: DataMessagingInvitationService, useValue: {} },
        { provide: ToastShowService, useValue: {} },
        { provide: NgbModal, useValue: {} },
        { provide: ModalService, useValue: {} },
        { provide: AppSettingsManagementService, useValue: {} },
        { provide: WeekConfigurationService, useValue: {} },
        { provide: EditAddressCardVisibilityService, useValue: {} },
        { provide: GeoServicesConfigService, useValue: config },
      ],
    }).overrideComponent(AddressPersonaComponent, { set: { imports: [], template: '' } });

    return TestBed.createComponent(AddressPersonaComponent).componentInstance;
  };

  beforeEach(() => {
    config = createGeoServicesConfigMock();
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
    TestBed.resetTestingModule();
  });

  it('hides the map buttons when external map links are off', () => {
    const component = create();

    expect(component.isCustomerWithCoordinates()).toBe(true);
    expect(component.showExternalMapLinks()).toBe(false);
  });

  it('opens neither OpenStreetMap nor Street View when external map links are off', () => {
    const component = create();

    component.openOpenStreetMap();
    component.openStreetView();

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('shows the map buttons for a customer with coordinates when external map links are on', () => {
    config.externalMapLinksEnabled.set(true);

    expect(create().showExternalMapLinks()).toBe(true);
  });

  it('keeps the map buttons hidden for an employee even when external map links are on', () => {
    config.externalMapLinksEnabled.set(true);

    expect(create(EntityTypeEnum.employee).showExternalMapLinks()).toBe(false);
  });

  it('opens Street View at the address coordinates when external map links are on', () => {
    config.externalMapLinksEnabled.set(true);

    create().openStreetView();

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(String(openSpy.mock.calls[0][0])).toContain(`@${LATITUDE},${LONGITUDE},`);
  });

  it('gates the map buttons in the template on the external map link setting', () => {
    const template = readFileSync(TEMPLATE_PATH, 'utf8');

    expect(template).toContain('@if (showExternalMapLinks()) {');
    expect(template).not.toContain('@if (isCustomerWithCoordinates()) {');
  });
});

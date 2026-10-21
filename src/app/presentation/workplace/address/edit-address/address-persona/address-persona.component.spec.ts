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
import { AddressPersonaMapLinksService } from './services/address-persona-map-links.service';
import { AddressPersonaStateService } from './services/address-persona-state.service';
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
import { EntityTypeEnum, GenderEnum } from 'src/app/domain/enums/client-enum';
import { createGeoServicesConfigMock, GeoServicesConfigMock } from 'src/app/shared/testing/geo-services-config.testing';

const LATITUDE = 46.95;
const LONGITUDE = 7.44;
const CARD_FOLDER = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATHS = [
  'address-persona.component.html',
  'address-persona-entity-fields/address-persona-entity-fields.component.html',
  'address-persona-name-fields/address-persona-name-fields.component.html',
  'address-persona-street-fields/address-persona-street-fields.component.html',
  'address-persona-locality-fields/address-persona-locality-fields.component.html',
  'address-persona-communications/address-persona-communications.component.html',
].map((path) => resolve(CARD_FOLDER, path));
const readCardTemplate = (): string => TEMPLATE_PATHS.map((path) => readFileSync(path, 'utf8')).join('\n');

describe('AddressPersonaComponent external map links', () => {
  let config: GeoServicesConfigMock;
  let openSpy: ReturnType<typeof vi.spyOn>;

  const create = (
    clientType: number = EntityTypeEnum.customer,
  ): { mapLinks: AddressPersonaMapLinksService; state: AddressPersonaStateService } => {
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

    const injector = TestBed.createComponent(AddressPersonaComponent).debugElement.injector;
    return { mapLinks: injector.get(AddressPersonaMapLinksService), state: injector.get(AddressPersonaStateService) };
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
    const { mapLinks } = create();

    expect(mapLinks.isCustomerWithCoordinates()).toBe(true);
    expect(mapLinks.showExternalMapLinks()).toBe(false);
  });

  it('opens neither OpenStreetMap nor Street View when external map links are off', () => {
    const { mapLinks } = create();

    mapLinks.openOpenStreetMap();
    mapLinks.openStreetView();

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('shows the map buttons for a customer with coordinates when external map links are on', () => {
    config.externalMapLinksEnabled.set(true);

    expect(create().mapLinks.showExternalMapLinks()).toBe(true);
  });

  it('keeps the map buttons hidden for an employee even when external map links are on', () => {
    config.externalMapLinksEnabled.set(true);

    expect(create(EntityTypeEnum.employee).mapLinks.showExternalMapLinks()).toBe(false);
  });

  it('opens Street View at the address coordinates when external map links are on', () => {
    config.externalMapLinksEnabled.set(true);

    create().mapLinks.openStreetView();

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(String(openSpy.mock.calls[0][0])).toContain(`@${LATITUDE},${LONGITUDE},`);
  });

  describe('legal entity contact person', () => {
    const setModel = (component: AddressPersonaStateService, legalEntity: boolean, gender: GenderEnum): void => {
      component.formModel.update((m) => ({ ...m, legalEntity, gender: String(gender) }));
    };

    it('treats a person as no legal entity', () => {
      const component = create().state;
      setModel(component, false, GenderEnum.female);

      expect(component.isLegalEntity()).toBe(false);
    });

    it('treats the legal entity flag as legal entity', () => {
      const component = create().state;
      setModel(component, true, GenderEnum.female);

      expect(component.isLegalEntity()).toBe(true);
    });

    it('treats the legal entity gender as legal entity', () => {
      const component = create().state;
      setModel(component, false, GenderEnum.legalEntity);

      expect(component.isLegalEntity()).toBe(true);
    });

    it('no longer hides title, first name and last name by gender in the template', () => {
      const template = readCardTemplate();

      expect(template).not.toContain('gender !== 3');
      expect(template).toContain('id="contact-person-heading"');
      expect(template).toContain('address.edit-address.address-persona.contact-person');
    });

    it('keeps the birthdate and the second name lines for persons only', () => {
      const template = readCardTemplate();
      const birthdayBlock = template.slice(template.lastIndexOf('@if (!isLegalEntity() &&'));

      expect(birthdayBlock).toContain('id="profile-birthday"');
      expect(template).toContain('@if (addFirstNameLine2 === true && !isLegalEntity() &&');
      expect(template).toContain('@if (addNameLine2 && !isLegalEntity() &&');
    });

    it('marks first and last name as required for persons only', () => {
      const template = readCardTemplate();

      expect(template.match(/@if \(!isLegalEntity\(\)\) \{ \* \}/g)).toHaveLength(2);
    });
  });

  it('gates the map buttons in the template on the external map link setting', () => {
    const template = readCardTemplate();

    expect(template).toContain('@if (showExternalMapLinks()) {');
    expect(template).not.toContain('@if (isCustomerWithCoordinates()) {');
  });
});

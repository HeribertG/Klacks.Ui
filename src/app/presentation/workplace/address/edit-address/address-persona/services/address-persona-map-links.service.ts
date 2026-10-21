// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * External map links (OpenStreetMap, Street View) of the address persona card: shown and opened only for a
 * customer address with coordinates and only while the geo services configuration allows external map links.
 * @param template - Link template the coordinates of the current address are filled into
 */

import { inject, Injectable } from '@angular/core';

import {
  OPEN_STREET_MAP_LINK_TEMPLATE,
  STREET_VIEW_LINK_TEMPLATE,
} from 'src/app/domain/constants/external-map-link.constants';
import { EntityTypeEnum } from 'src/app/domain/enums/client-enum';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { buildExternalMapLink } from 'src/app/shared/helpers/external-map-link.helper';
import { EXTERNAL_MAP_LINK_TARGET } from '../address-persona.constants';

@Injectable()
export class AddressPersonaMapLinksService {
  private dataManagementClientService = inject(DataManagementClientService);
  private geoServicesConfig = inject(GeoServicesConfigService);

  readonly externalMapLinksEnabled = this.geoServicesConfig.externalMapLinksEnabled;

  isCustomerWithCoordinates(): boolean {
    const client = this.dataManagementClientService.editClient();
    if (!client || client.type !== EntityTypeEnum.customer) {
      return false;
    }
    const address = client.addresses[this.dataManagementClientService.currentAddressIndex()];
    return !!address?.latitude && !!address?.longitude;
  }

  showExternalMapLinks(): boolean {
    return this.externalMapLinksEnabled() && this.isCustomerWithCoordinates();
  }

  openOpenStreetMap(): void {
    this.openExternalMapLink(OPEN_STREET_MAP_LINK_TEMPLATE);
  }

  openStreetView(): void {
    this.openExternalMapLink(STREET_VIEW_LINK_TEMPLATE);
  }

  private openExternalMapLink(template: string): void {
    if (!this.externalMapLinksEnabled()) { return; }
    const client = this.dataManagementClientService.editClient();
    if (!client) { return; }
    const address = client.addresses[this.dataManagementClientService.currentAddressIndex()];
    if (!address?.latitude || !address?.longitude) { return; }
    window.open(buildExternalMapLink(template, address.latitude, address.longitude), EXTERNAL_MAP_LINK_TARGET);
  }
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Prepares the client locations of the dashboard map and cards.
 * By city: clients are aggregated per city and country (clients without both are left out), counted per client type,
 * and get the mean coordinate of the clients that have one; sorted by client count, largest first.
 * By group: one entry per group of the flattened tree that has clients, sorted the same way; the map still shows the
 * city aggregation. The address search turns the geocoding answer into a hit or the translation key of the failure.
 * Errors of the dashboard reads propagate to the caller; a failed visibility read counts as "groups assigned".
 * @param query - Address search text; it is also the display name when the geocoder returns none
 */

import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { flattenGroupTree } from 'src/app/domain/helpers/group-tree.helper';
import { IClientLocationResource } from 'src/app/domain/models/dashboard-class';
import { AddressSearchOutcome } from 'src/app/domain/models/dashboard/address-search-outcome.interface';
import { ClientType } from 'src/app/domain/models/dashboard/client-type.enum';
import { CoordinateAccumulator } from 'src/app/domain/models/dashboard/coordinate-accumulator.interface';
import { DashboardLocations } from 'src/app/domain/models/dashboard/dashboard-locations.interface';
import { LocationData } from 'src/app/domain/models/dashboard/location-data.interface';
import { GeocodingSearchStatus } from 'src/app/domain/models/geo/geocoding-search-status.model';
import { IGroupTree } from 'src/app/domain/models/group/group-tree.interface';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { DataGeocodingService } from 'src/app/infrastructure/api/data-geocoding.service';

const SEARCH_NOT_FOUND_KEY = 'dashboard.locations.searchNotFound';
const SEARCH_UNAVAILABLE_KEY = 'geoServices.search.unavailable';

@Injectable({ providedIn: 'root' })
export class DashboardLocationsService {
  private dataDashboardService = inject(DataDashboardService);
  private dataGeocodingService = inject(DataGeocodingService);

  loadNoGroupsAssigned(): Observable<boolean> {
    return this.dataDashboardService.getVisibilityStatus().pipe(
      map((status) => status.isRestricted && !status.hasVisibleGroups),
      catchError(() => of(false))
    );
  }

  loadCityLocations(): Observable<DashboardLocations> {
    return this.dataDashboardService.getClientsLocationsData().pipe(
      map((clients) => {
        const cityLocations = this.buildCityLocations(clients);
        return { locations: cityLocations, mapLocations: cityLocations, totalClients: clients.length };
      })
    );
  }

  loadGroupLocations(): Observable<DashboardLocations> {
    return forkJoin({
      tree: this.dataDashboardService.getClientsOverviewData(),
      clients: this.dataDashboardService.getClientsLocationsData(),
    }).pipe(
      map(({ tree, clients }) => {
        const groupLocations = this.buildGroupLocations(tree);
        return {
          locations: groupLocations,
          mapLocations: this.buildCityLocations(clients),
          totalClients: groupLocations.reduce((sum, g) => sum + g.count, 0),
        };
      })
    );
  }

  searchAddress(query: string): Observable<AddressSearchOutcome> {
    return this.dataGeocodingService.searchAddress(query).pipe(
      map((result) => {
        if (
          result.status === GeocodingSearchStatus.Found &&
          typeof result.latitude === 'number' &&
          typeof result.longitude === 'number'
        ) {
          return {
            hit: { latitude: result.latitude, longitude: result.longitude, displayName: result.displayName ?? query },
            failureMessageKey: null,
          };
        }
        return {
          hit: null,
          failureMessageKey:
            result.status === GeocodingSearchStatus.NotFound ? SEARCH_NOT_FOUND_KEY : SEARCH_UNAVAILABLE_KEY,
        };
      })
    );
  }

  private buildGroupLocations(tree: IGroupTree): LocationData[] {
    return flattenGroupTree(tree.nodes || [])
      .filter((g) => g.clientsCount > 0)
      .map((group) => ({
        city: group.name,
        country: '',
        count: group.clientsCount,
        employeeCount: group.employeesCount,
        externEmpCount: group.externEmpsCount,
        customerCount: group.customersCount,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private buildCityLocations(clients: IClientLocationResource[]): LocationData[] {
    const locationMap = new Map<string, LocationData>();
    const coordinateMap = new Map<string, CoordinateAccumulator>();

    clients.forEach((client) => {
      const address = client.currentAddress;
      if (!address?.city || !address.country) {
        return;
      }

      const key = `${address.city}_${address.country}`;
      const clientType = client.type;
      const location = locationMap.get(key) ?? {
        city: address.city,
        country: address.country,
        count: 0,
        employeeCount: 0,
        externEmpCount: 0,
        customerCount: 0,
      };

      location.count++;
      if (clientType === ClientType.Employee) {
        location.employeeCount++;
      } else if (clientType === ClientType.ExternEmp) {
        location.externEmpCount++;
      } else if (clientType === ClientType.Customer) {
        location.customerCount++;
      }
      locationMap.set(key, location);

      if (typeof address.latitude === 'number' && typeof address.longitude === 'number') {
        const accumulator = coordinateMap.get(key) ?? { latitudeSum: 0, longitudeSum: 0, count: 0 };
        accumulator.latitudeSum += address.latitude;
        accumulator.longitudeSum += address.longitude;
        accumulator.count++;
        coordinateMap.set(key, accumulator);
      }
    });

    coordinateMap.forEach((accumulator, key) => {
      const location = locationMap.get(key)!;
      location.latitude = accumulator.latitudeSum / accumulator.count;
      location.longitude = accumulator.longitudeSum / accumulator.count;
    });

    return Array.from(locationMap.values()).sort((a, b) => b.count - a.count);
  }
}

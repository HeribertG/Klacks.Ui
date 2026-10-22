// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { IClientLocationResource } from 'src/app/domain/models/dashboard-class';
import { ClientType } from 'src/app/domain/models/dashboard/client-type.enum';
import { GeocodingSearchStatus } from 'src/app/domain/models/geo/geocoding-search-status.model';
import { IGroup } from 'src/app/domain/models/group/group.interface';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { DataGeocodingService } from 'src/app/infrastructure/api/data-geocoding.service';
import { DashboardLocationsService } from './dashboard-locations.service';

const client = (
  type: ClientType,
  city: string | null,
  country: string | null,
  latitude: number | null = null,
  longitude: number | null = null
): IClientLocationResource =>
  ({ id: `${city}-${type}`, type, currentAddress: { city, country, latitude, longitude } }) as unknown as IClientLocationResource;

const group = (name: string, clientsCount: number, children?: IGroup[]): IGroup =>
  ({ name, clientsCount, employeesCount: 1, externEmpsCount: 2, customersCount: 3, children }) as IGroup;

describe('DashboardLocationsService', () => {
  let dashboard: {
    getVisibilityStatus: ReturnType<typeof vi.fn>;
    getClientsLocationsData: ReturnType<typeof vi.fn>;
    getClientsOverviewData: ReturnType<typeof vi.fn>;
  };
  let searchAddress: ReturnType<typeof vi.fn>;
  let service: DashboardLocationsService;

  beforeEach(() => {
    dashboard = {
      getVisibilityStatus: vi.fn(),
      getClientsLocationsData: vi.fn(() =>
        of([
          client(ClientType.Customer, 'Bern', 'CH', 46, 7),
          client(ClientType.Employee, 'Bern', 'CH', 48, 9),
          client(ClientType.ExternEmp, 'Bern', 'CH'),
          client(ClientType.Customer, 'Basel', 'CH'),
          client(ClientType.Customer, null, 'CH'),
        ])
      ),
      getClientsOverviewData: vi.fn(() => of({ nodes: [group('small', 1, [group('big', 5)]), group('none', 0)] })),
    };
    searchAddress = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        DashboardLocationsService,
        { provide: DataDashboardService, useValue: dashboard },
        { provide: DataGeocodingService, useValue: { searchAddress } },
      ],
    });
    service = TestBed.inject(DashboardLocationsService);
  });

  it('aggregates clients per city, counts the types and averages the known coordinates', async () => {
    const result = await firstValueFrom(service.loadCityLocations());

    expect(result.totalClients).toBe(5);
    expect(result.mapLocations).toBe(result.locations);
    expect(result.locations).toEqual([
      {
        city: 'Bern',
        country: 'CH',
        count: 3,
        employeeCount: 1,
        externEmpCount: 1,
        customerCount: 1,
        latitude: 47,
        longitude: 8,
      },
      { city: 'Basel', country: 'CH', count: 1, employeeCount: 0, externEmpCount: 0, customerCount: 1 },
    ]);
  });

  it('lists the groups with clients, largest first, and keeps the city aggregation for the map', async () => {
    const result = await firstValueFrom(service.loadGroupLocations());

    expect(result.locations.map((l) => [l.city, l.count])).toEqual([
      ['big', 5],
      ['small', 1],
    ]);
    expect(result.locations[0]).toEqual(
      expect.objectContaining({ country: '', employeeCount: 1, externEmpCount: 2, customerCount: 3 })
    );
    expect(result.totalClients).toBe(6);
    expect(result.mapLocations.map((l) => l.city)).toEqual(['Bern', 'Basel']);
  });

  it('reports "no groups assigned" only for a restricted user without visible groups', async () => {
    dashboard.getVisibilityStatus.mockReturnValue(of({ isRestricted: true, hasVisibleGroups: false }));
    expect(await firstValueFrom(service.loadNoGroupsAssigned())).toBe(true);

    dashboard.getVisibilityStatus.mockReturnValue(of({ isRestricted: true, hasVisibleGroups: true }));
    expect(await firstValueFrom(service.loadNoGroupsAssigned())).toBe(false);

    dashboard.getVisibilityStatus.mockReturnValue(throwError(() => new Error('down')));
    expect(await firstValueFrom(service.loadNoGroupsAssigned())).toBe(false);
  });

  it('returns the hit of a found address, with the query as fallback display name', async () => {
    searchAddress.mockReturnValue(
      of({ status: GeocodingSearchStatus.Found, latitude: 1, longitude: 2, displayName: null })
    );

    const outcome = await firstValueFrom(service.searchAddress('Bahnhofstrasse'));

    expect(outcome).toEqual({
      hit: { latitude: 1, longitude: 2, displayName: 'Bahnhofstrasse' },
      failureMessageKey: null,
    });
  });

  it('maps not-found and every other failure to their translation keys', async () => {
    searchAddress.mockReturnValue(
      of({ status: GeocodingSearchStatus.NotFound, latitude: null, longitude: null, displayName: null })
    );
    expect((await firstValueFrom(service.searchAddress('x'))).failureMessageKey).toBe(
      'dashboard.locations.searchNotFound'
    );

    searchAddress.mockReturnValue(
      of({ status: GeocodingSearchStatus.Found, latitude: null, longitude: 2, displayName: 'n' })
    );
    expect((await firstValueFrom(service.searchAddress('x'))).failureMessageKey).toBe(
      'geoServices.search.unavailable'
    );
  });
});

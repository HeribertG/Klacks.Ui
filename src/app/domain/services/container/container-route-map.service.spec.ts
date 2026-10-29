// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { ContainerRouteMapService } from './container-route-map.service';
import { DataRoutingService } from 'src/app/infrastructure/api/data-routing.service';
import { EMPTY_GUID } from 'src/app/domain/constants/empty-guid.constants';
import { IRouteInfo } from 'src/app/domain/models/container/route-info.interface';
import { IRouteLocation } from 'src/app/domain/models/container/route-location.interface';
import { ContainerTransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';

const step = (name: string, shiftId: string, latitude: number, longitude: number): IRouteLocation => ({
  name,
  address: `${name} street`,
  latitude,
  longitude,
  shiftId,
  distanceToNextKm: 0,
  travelTimeToNext: '00:00:00',
  order: 0,
});

const routeInfo = (optimizedRoute: IRouteLocation[]): IRouteInfo => ({
  startBase: 'Base',
  endBase: 'Base',
  totalDistanceKm: 0,
  estimatedTravelTime: '00:00:00',
  travelTimeFromStartBase: '00:00:00',
  distanceFromStartBaseKm: 0,
  distanceToEndBaseKm: 0,
  travelTimeToEndBase: '00:00:00',
  optimizedRoute,
});

describe('ContainerRouteMapService', () => {
  let getRouteGeometry: ReturnType<typeof vi.fn>;
  let service: ContainerRouteMapService;

  beforeEach(() => {
    getRouteGeometry = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: DataRoutingService, useValue: { getRouteGeometry } }],
    });
    service = TestBed.inject(ContainerRouteMapService);
  });

  it('asks for the road geometry through every waypoint, including the return to the same base', async () => {
    // Arrange
    getRouteGeometry.mockReturnValue(of({ points: [{ lat: 1, lon: 2 }, { lat: 3, lon: 4 }], isRoadGeometry: true }));
    const route = [
      step('Base', EMPTY_GUID, 47.5, 8.7),
      step('Anna', 'shift-a', 47.51, 8.71),
      step('Base', EMPTY_GUID, 47.5, 8.7),
    ];

    // Act
    const map = await firstValueFrom(service.loadRouteMap(routeInfo(route)));

    // Assert
    expect(getRouteGeometry).toHaveBeenCalledWith(
      [
        { name: 'Base', lat: 47.5, lon: 8.7 },
        { name: 'Anna', lat: 47.51, lon: 8.71 },
        { name: 'Base', lat: 47.5, lon: 8.7 },
      ],
      ContainerTransportModeEnum.byCar,
    );
    expect(map.markers).toHaveLength(2);
    expect(map.path).toEqual([{ lat: 1, lon: 2 }, { lat: 3, lon: 4 }]);
    expect(map.isRoadGeometry).toBe(true);
  });

  it('passes the straight-line fallback on as not a road geometry', async () => {
    // Arrange
    const straight = [{ lat: 47.5, lon: 8.7 }, { lat: 47.51, lon: 8.71 }];
    getRouteGeometry.mockReturnValue(of({ points: straight, isRoadGeometry: false }));

    // Act
    const map = await firstValueFrom(
      service.loadRouteMap(routeInfo([step('Base', EMPTY_GUID, 47.5, 8.7), step('Anna', 'shift-a', 47.51, 8.71)])),
    );

    // Assert
    expect(map.path).toEqual(straight);
    expect(map.isRoadGeometry).toBe(false);
  });

  it('routes the road geometry with the transport mode of the container', async () => {
    // Arrange
    getRouteGeometry.mockReturnValue(of({ points: [], isRoadGeometry: false }));
    const route = [step('Base', EMPTY_GUID, 47.5, 8.7), step('Anna', 'shift-a', 47.51, 8.71)];

    // Act
    await firstValueFrom(service.loadRouteMap(routeInfo(route), ContainerTransportModeEnum.byFoot));

    // Assert
    expect(getRouteGeometry).toHaveBeenCalledWith(expect.any(Array), ContainerTransportModeEnum.byFoot);
  });

  it('draws no line and asks no routing service for fewer than two located steps', async () => {
    // Act
    const map = await firstValueFrom(service.loadRouteMap(routeInfo([step('Anna', 'shift-a', 47.51, 8.71)])));

    // Assert
    expect(getRouteGeometry).not.toHaveBeenCalled();
    expect(map.path).toEqual([]);
    expect(map.markers).toHaveLength(1);
  });
});

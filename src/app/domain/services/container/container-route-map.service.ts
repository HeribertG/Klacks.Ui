// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builds the tour map of a container template from its stored route info: numbered visit markers, base markers and
 * the line between them. The line is the real road geometry from the backend routing proxy (OpenRouteService, OSRM
 * fallback) through all waypoints in driving order, including the return to the end base, routed with the profile of
 * the container's transport mode (mix as car); only when no geometry comes back does the line fall back to straight
 * segments, flagged as not a road geometry.
 * @param routeInfo - Stored route info of the edited weekday; its optimizedRoute holds start base, visits, end base
 * @param transportMode - Transport mode of the edited container template; car when omitted
 */
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { DataRoutingService } from 'src/app/infrastructure/api/data-routing.service';
import { IRouteInfo } from 'src/app/domain/models/container/route-info.interface';
import { IContainerRouteMap } from 'src/app/domain/models/container/container-route-map.interface';
import { buildRouteMapMarkers, hasRouteCoordinates } from 'src/app/domain/helpers/route-map-marker.helper';
import { ContainerTransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';

const MIN_LINE_WAYPOINTS = 2;

@Injectable({ providedIn: 'root' })
export class ContainerRouteMapService {
  private dataRoutingService = inject(DataRoutingService);

  loadRouteMap(
    routeInfo: IRouteInfo,
    transportMode: ContainerTransportModeEnum = ContainerTransportModeEnum.byCar,
  ): Observable<IContainerRouteMap> {
    const route = routeInfo.optimizedRoute ?? [];
    const markers = buildRouteMapMarkers(route);
    const waypoints = route
      .filter(hasRouteCoordinates)
      .map((location) => ({ name: location.name, lat: location.latitude, lon: location.longitude }));

    if (waypoints.length < MIN_LINE_WAYPOINTS) {
      return of({ markers, path: [], isRoadGeometry: false });
    }

    return this.dataRoutingService
      .getRouteGeometry(waypoints, transportMode)
      .pipe(map((geometry) => ({ markers, path: geometry.points, isRoadGeometry: geometry.isRoadGeometry })));
  }
}

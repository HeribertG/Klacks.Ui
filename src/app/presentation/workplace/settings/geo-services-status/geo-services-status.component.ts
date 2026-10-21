// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Read-only settings card showing which geo services (geocoding, routing, OpenRouteService, map tiles) this
 * installation uses and, for a disabled one, why. The configuration lives in environment variables only, so
 * the card has no input fields and never shows internal host names; it offers a retry when the
 * configuration could not be loaded.
 * @param rows - One entry per geo service with its translated label key, status and disabled reason
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { IGeoServiceStatus } from 'src/app/domain/models/settings/geo-service-status.interface';
import { GeoServiceStatusRow } from './geo-service-status-row.interface';
import { GEO_SERVICE_NOTICE_KEYS } from 'src/app/domain/constants/geo-service-notice.constants';

export const GEO_SERVICES_STATUS_KEYS = {
  title: 'geoServices.status.title',
  noOutbound: 'geoServices.status.noOutbound',
  geocoding: 'geoServices.status.service.geocoding',
  routing: 'geoServices.status.service.routing',
  openRouteService: 'geoServices.status.service.openRouteService',
  mapTiles: 'geoServices.status.service.mapTiles',
  enabled: 'geoServices.status.enabled',
  disabled: 'geoServices.status.disabled',
  envHint: 'geoServices.status.envHint',
  attribution: 'geoServices.status.attribution',
} as const;

const REASON_KEY_PREFIX = 'geoServices.reason.';
const NO_REASON = 'None';

@Component({
  selector: 'app-geo-services-status',
  templateUrl: './geo-services-status.component.html',
  styleUrls: ['./geo-services-status.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeoServicesStatusComponent implements OnInit {
  private readonly geoServicesConfig = inject(GeoServicesConfigService);

  readonly keys = GEO_SERVICES_STATUS_KEYS;
  readonly noticeKeys = GEO_SERVICE_NOTICE_KEYS;

  readonly loadFailed = computed(() => this.geoServicesConfig.loadState() === 'failed');

  readonly config = computed(() =>
    this.geoServicesConfig.loadState() === 'loaded' ? this.geoServicesConfig.config() : null,
  );

  readonly rows = computed<GeoServiceStatusRow[]>(() => {
    const config = this.config();
    if (!config) {
      return [];
    }
    return [
      this.toRow('geocoding', GEO_SERVICES_STATUS_KEYS.geocoding, config.geocoding),
      this.toRow('routing', GEO_SERVICES_STATUS_KEYS.routing, config.routing),
      this.toRow('open-route-service', GEO_SERVICES_STATUS_KEYS.openRouteService, config.openRouteService),
      this.toRow('map-tiles', GEO_SERVICES_STATUS_KEYS.mapTiles, config.mapTiles),
    ];
  });

  ngOnInit(): void {
    void this.geoServicesConfig.ensureLoaded();
  }

  retry(): void {
    void this.geoServicesConfig.reload();
  }

  private toRow(id: string, labelKey: string, status: IGeoServiceStatus): GeoServiceStatusRow {
    return {
      id,
      labelKey,
      enabled: status.enabled,
      reasonKey: !status.enabled && status.reason !== NO_REASON ? `${REASON_KEY_PREFIX}${status.reason}` : null,
    };
  }
}

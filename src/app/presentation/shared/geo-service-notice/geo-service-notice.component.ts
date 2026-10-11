// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Inline notice shown in place of a map, an address search or a route when the geo service behind it is
 * not available. A failed configuration load shows a warning with a retry button (fail-closed); a service
 * the operator switched off shows a permanent, non-dismissable info line; while the configuration is still
 * loading or the service is active, nothing is rendered.
 * @param service - Which capability the notice stands in for: the map tiles, the geocoding search or routing
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';

export type GeoServiceNoticeService = 'map' | 'geocoding' | 'routing';

export const GEO_SERVICE_NOTICE_KEYS = {
  mapDisabled: 'geoServices.notice.mapDisabled',
  geocodingDisabled: 'geoServices.notice.geocodingDisabled',
  routingDisabled: 'geoServices.notice.routingDisabled',
  loadFailed: 'geoServices.notice.loadFailed',
  retry: 'geoServices.notice.retry',
} as const;

const DISABLED_KEY_BY_SERVICE: Record<GeoServiceNoticeService, string> = {
  map: GEO_SERVICE_NOTICE_KEYS.mapDisabled,
  geocoding: GEO_SERVICE_NOTICE_KEYS.geocodingDisabled,
  routing: GEO_SERVICE_NOTICE_KEYS.routingDisabled,
};

@Component({
  selector: 'app-geo-service-notice',
  templateUrl: './geo-service-notice.component.html',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeoServiceNoticeComponent {
  private readonly geoServicesConfig = inject(GeoServicesConfigService);

  readonly service = input.required<GeoServiceNoticeService>();

  readonly keys = GEO_SERVICE_NOTICE_KEYS;

  readonly loadFailed = computed(() => this.geoServicesConfig.loadState() === 'failed');

  readonly serviceDisabled = computed(
    () => this.geoServicesConfig.loadState() === 'loaded' && !this.isServiceEnabled(),
  );

  readonly disabledKey = computed(() => DISABLED_KEY_BY_SERVICE[this.service()]);

  retry(): void {
    void this.geoServicesConfig.reload();
  }

  private isServiceEnabled(): boolean {
    switch (this.service()) {
      case 'map':
        return this.geoServicesConfig.mapTilesEnabled();
      case 'geocoding':
        return this.geoServicesConfig.geocodingEnabled();
      case 'routing':
        return this.geoServicesConfig.routingEnabled() || this.geoServicesConfig.openRouteServiceEnabled();
    }
  }
}

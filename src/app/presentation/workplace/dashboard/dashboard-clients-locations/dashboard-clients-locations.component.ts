// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Dashboard component displaying client locations on a map and as cards.
 * Supports two view modes: by city (physical address) and by group (organizational).
 * The map, the address search and the Street View links follow the installation's geo services
 * configuration: the map uses the one configured tile source and is replaced by a notice when tiles are
 * off or the configuration could not be loaded; the search runs through the backend proxy.
 * @param viewMode - Toggle between 'city' and 'group' aggregation
 * @param locations - Aggregated location data for the active view mode
 */

import {
  Component, inject, OnInit, OnDestroy, signal, ElementRef, AfterViewChecked,
  ChangeDetectionStrategy, effect, untracked,
  viewChild
} from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faStreetView } from '@fortawesome/free-solid-svg-icons';
import { SearchInputComponent } from 'src/app/presentation/shared/search-input/search-input.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { DashboardLocationsService } from 'src/app/domain/services/dashboard/dashboard-locations.service';
import { DashboardPreferenceService } from 'src/app/domain/services/dashboard/dashboard-preference.service';
import { DashboardLocations } from 'src/app/domain/models/dashboard/dashboard-locations.interface';
import { LocationViewMode } from 'src/app/domain/models/dashboard/location-view-mode.type';
import { IconLocationPinComponent } from 'src/app/presentation/icons/icon-location-pin.component';
import { SpinnerService } from 'src/app/presentation/spinner/spinner.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { GeoServiceNoticeComponent } from 'src/app/presentation/shared/geo-service-notice/geo-service-notice.component';
import { STREET_VIEW_LINK_TEMPLATE } from 'src/app/domain/constants/external-map-link.constants';
import { LocationData } from 'src/app/domain/models/dashboard/location-data.interface';
import { buildExternalMapLink } from 'src/app/shared/helpers/external-map-link.helper';
import type * as Leaflet from 'leaflet';

declare let L: typeof Leaflet & {
  markerClusterGroup(options?: Leaflet.LayerOptions & Record<string, unknown>): Leaflet.FeatureGroup;
};

const STREET_VIEW_LABEL_KEY = 'dashboard.locations.streetView';
const STREET_VIEW_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="14" height="14" fill="white"><path d="M320 64A64 64 0 1 0 192 64a64 64 0 1 0 128 0zm-96 96c-35.3 0-64 28.7-64 64l0 48c0 17.7 14.3 32 32 32l1.8 0 11.1 99.5c1.8 16.2 15.5 28.5 31.8 28.5l38.7 0c16.3 0 30-12.3 31.8-28.5L318.2 304l1.8 0c17.7 0 32-14.3 32-32l0-48c0-35.3-28.7-64-64-64l-64 0zM132.3 394.2c13-2.4 21.7-14.9 19.3-27.9s-14.9-21.7-27.9-19.3c-32.4 5.9-60.9 14.2-82 24.8c-10.5 5.3-20.3 11.7-27.8 19.6C6.4 399.5 0 410.5 0 424c0 21.4 15.5 36.1 29.1 45c14.7 9.6 34.3 17.3 56.4 23.4C130.2 504.7 190.4 512 256 512s125.8-7.3 170.4-19.6c22.1-6.1 41.8-13.8 56.4-23.4c13.7-8.9 29.1-23.6 29.1-45c0-13.5-6.4-24.5-13.9-32.6c-7.5-8-17.3-14.4-27.8-19.6c-21-10.6-49.5-18.9-82-24.8c-13-2.4-25.5 6.3-27.9 19.3s6.3 25.5 19.3 27.9c30.2 5.5 53.7 12.8 69 20.5c3.2 1.6 5.8 3.1 7.9 4.5c3.6 2.4 3.6 7.2 0 9.6c-8.8 5.7-23.1 11.8-43 17.3C374.3 457 318.5 464 256 464s-118.3-7-157.7-17.9c-19.9-5.5-34.2-11.6-43-17.3c-3.6-2.4-3.6-7.2 0-9.6c2.1-1.4 4.8-2.9 7.9-4.5c15.3-7.7 38.8-14.9 69-20.5z"/></svg>`;

@Component({
  selector: 'app-dashboard-clients-locations',
  templateUrl: './dashboard-clients-locations.component.html',
  styleUrls: ['./dashboard-clients-locations.component.scss'],
  standalone: true,
  imports: [
    TranslateModule, FontAwesomeModule, NgbTooltipModule, IconLocationPinComponent, SearchInputComponent,
    GeoServiceNoticeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardClientsLocationsComponent implements OnInit, OnDestroy, AfterViewChecked {
  readonly mapContainerRef = viewChild<ElementRef<HTMLDivElement>>('mapContainer');
  private mapInitialized = false;
  private shouldInitializeMap = false;
  private dashboardLocations = inject(DashboardLocationsService);
  private dashboardPreference = inject(DashboardPreferenceService);
  private elementRef = inject(ElementRef);
  private spinnerService = inject(SpinnerService);
  private toastService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private geoServicesConfig = inject(GeoServicesConfigService);

  public readonly mapTilesEnabled = this.geoServicesConfig.mapTilesEnabled;
  public readonly geocodingEnabled = this.geoServicesConfig.geocodingEnabled;
  public readonly externalMapLinksEnabled = this.geoServicesConfig.externalMapLinksEnabled;

  public faStreetView = faStreetView;

  public locations = signal<LocationData[]>([]);
  public mapMarkers = signal<LocationData[]>([]);
  public totalLocations = signal(0);
  public totalClients = signal(0);
  public isLoading = signal(true);
  public error = signal<string | null>(null);
  public viewMode = signal<LocationViewMode>('city');
  public noGroupsAssigned = signal(false);

  public searchQuery = signal('');
  private searchMarker: Leaflet.Marker | null = null;

  private map: Leaflet.Map | null = null;
  private markerClusterGroup: Leaflet.FeatureGroup | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private markerBounds: Leaflet.LatLngTuple[] = [];

  constructor() {
    effect(() => {
      const tilesEnabled = this.mapTilesEnabled();
      untracked(() => {
        if (!tilesEnabled && this.mapInitialized) {
          this.resetMap();
          this.shouldInitializeMap = this.mapMarkers().length > 0;
        }
      });
    });
  }

  ngOnInit(): void {
    this.dashboardPreference.removeLegacyMapTileProvider();
    this.loadSavedViewMode();
    void this.geoServicesConfig.ensureLoaded();
    this.loadVisibilityStatus();
    this.loadDataForCurrentMode();
  }

  private loadVisibilityStatus(): void {
    this.dashboardLocations.loadNoGroupsAssigned().subscribe((noGroupsAssigned) => {
      this.noGroupsAssigned.set(noGroupsAssigned);
    });
  }

  ngAfterViewChecked(): void {
    if (
      this.shouldInitializeMap &&
      !this.mapInitialized &&
      this.mapTilesEnabled() &&
      this.mapContainerRef()?.nativeElement
    ) {
      this.mapInitialized = true;
      this.shouldInitializeMap = false;
      this.initializeMap();
      this.loadMarkersOnMap(this.mapMarkers());
    }
  }

  private loadSavedViewMode(): void {
    const savedMode = this.dashboardPreference.readLocationViewMode();
    if (savedMode) {
      this.viewMode.set(savedMode);
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.map) {
      this.map.remove();
    }
  }

  public onViewModeChange(mode: LocationViewMode): void {
    if (mode === this.viewMode()) {
      return;
    }
    this.viewMode.set(mode);
    this.dashboardPreference.saveLocationViewMode(mode);
    this.resetMap();
    this.loadDataForCurrentMode();
  }

  private resetMap(): void {
    this.mapInitialized = false;
    this.shouldInitializeMap = false;
    this.markerBounds = [];
    this.searchMarker = null;
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private loadDataForCurrentMode(): void {
    if (this.viewMode() === 'city') {
      this.loadLocationData();
    } else {
      this.loadGroupData();
    }
  }

  private loadLocationData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.dashboardLocations.loadCityLocations().subscribe({
      next: ({ locations, totalClients }: DashboardLocations) => {
        this.locations.set(locations);
        this.mapMarkers.set(locations);
        this.totalLocations.set(locations.length);
        this.totalClients.set(totalClients);
        this.isLoading.set(false);

        this.shouldInitializeMap = locations.length > 0;
      },
      error: (err) => {
        this.shouldInitializeMap = false;
        this.error.set('dashboard.error.loadLocations');
        console.error('Error loading locations:', err);
        this.isLoading.set(false);
      },
    });
  }

  private loadGroupData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.dashboardLocations.loadGroupLocations().subscribe({
      next: ({ locations, mapLocations, totalClients }: DashboardLocations) => {
        this.locations.set(locations);
        this.totalLocations.set(locations.length);
        this.totalClients.set(totalClients);

        this.mapMarkers.set(mapLocations);
        this.shouldInitializeMap = mapLocations.length > 0;

        this.isLoading.set(false);
      },
      error: (err) => {
        this.shouldInitializeMap = false;
        this.error.set('dashboard.error.loadGroups');
        console.error('Error loading group data:', err);
        this.isLoading.set(false);
      },
    });
  }

  private initializeMap(): void {
    if (typeof L === 'undefined') {
      console.error('Leaflet is not loaded');
      return;
    }

    const mapContainer = this.mapContainerRef()?.nativeElement;
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/assets/leaflet/marker-icon-2x.png',
      iconUrl: '/assets/leaflet/marker-icon.png',
      shadowUrl: '/assets/leaflet/marker-shadow.png',
    });

    this.map = L.map(mapContainer).setView([46.8182, 8.2275], 7);

    const mapTiles = this.geoServicesConfig.mapTiles();
    if (mapTiles?.urlTemplate) {
      L.tileLayer(mapTiles.urlTemplate, {
        attribution: this.escapeHtml(mapTiles.attribution),
        maxZoom: mapTiles.maxZoom,
        ...(mapTiles.subdomains.length > 0 ? { subdomains: mapTiles.subdomains } : {}),
      }).addTo(this.map);
    }

    this.markerClusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      removeOutsideVisibleBounds: true,
    });

    this.map.addLayer(this.markerClusterGroup);

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 200);

    this.resizeObserver = new ResizeObserver(() => {
      this.map?.invalidateSize();
    });
    this.resizeObserver.observe(mapContainer);
  }

  private loadMarkersOnMap(locations: LocationData[]): void {
    if (!this.map || !this.markerClusterGroup) {
      return;
    }

    const clusterGroup = this.markerClusterGroup;
    clusterGroup.clearLayers();
    const bounds: Leaflet.LatLngTuple[] = [];
    const totalLabel = this.translateEscaped('dashboard.clients.total');
    const clientsLabel = this.translateEscaped('dashboard.locations.clients');
    const employeeLabel = this.translateEscaped('address.edit-address.membership.type.employee');
    const externEmpLabel = this.translateEscaped('address.edit-address.membership.type.externEmp');
    const customerLabel = this.translateEscaped('address.edit-address.membership.type.customer');

    locations.forEach((location) => {
      if (location.latitude && location.longitude) {
        const marker = L.marker([location.latitude, location.longitude]);

        const popupContent = `
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 10px 0;">${this.escapeHtml(location.city)}, ${this.escapeHtml(location.country)}</h4>
            <p style="margin: 5px 0;"><strong>${totalLabel}:</strong> ${location.count} ${clientsLabel}</p>
            ${location.employeeCount > 0 ? `<p style="margin: 5px 0; color: #1bc5bd;"><strong>${employeeLabel}:</strong> ${location.employeeCount}</p>` : ''}
            ${location.externEmpCount > 0 ? `<p style="margin: 5px 0; color: #6993ff;"><strong>${externEmpLabel}:</strong> ${location.externEmpCount}</p>` : ''}
            ${location.customerCount > 0 ? `<p style="margin: 5px 0; color: #ffa800;"><strong>${customerLabel}:</strong> ${location.customerCount}</p>` : ''}
            ${this.buildStreetViewLinkHtml(location.latitude, location.longitude)}
          </div>
        `;

        marker.bindPopup(popupContent);
        clusterGroup.addLayer(marker);

        bounds.push([location.latitude, location.longitude]);
      }
    });

    if (bounds.length > 0) {
      this.markerBounds = bounds;
      this.map.fitBounds(bounds);
    }
  }

  public onZoomToAllMarkers(): void {
    if (!this.map || this.markerBounds.length === 0) {
      return;
    }
    this.map.fitBounds(this.markerBounds);
  }

  public onZoomToLocation(location: LocationData): void {
    if (!this.map || !location.latitude || !location.longitude) {
      return;
    }

    this.map.setView([location.latitude, location.longitude], 14, {
      animate: true,
      duration: 0.5,
    });

    const mapContainer = this.elementRef.nativeElement.querySelector('#map-container');
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  public onSearchAddress(): void {
    const query = this.searchQuery().trim();
    if (!query || !this.map || !this.geocodingEnabled()) {
      return;
    }

    this.spinnerService.showProgressSpinner = true;

    this.dashboardLocations.searchAddress(query).subscribe(({ hit, failureMessageKey }) => {
      this.spinnerService.showProgressSpinner = false;

      if (hit) {
        this.showSearchResult(hit.latitude, hit.longitude, hit.displayName);
        return;
      }

      if (failureMessageKey) {
        this.toastService.showError(this.translateService.instant(failureMessageKey));
      }
    });
  }

  private showSearchResult(lat: number, lon: number, displayName: string): void {
    if (!this.map) {
      return;
    }

    if (this.searchMarker) {
      this.map.removeLayer(this.searchMarker);
    }

    this.searchMarker = L.marker([lat, lon], {
      icon: L.divIcon({
        className: 'search-marker-icon',
        html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="#e74c3c">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      }),
    }).addTo(this.map);

    const popupContent = `
      <div style="min-width: 200px;">
        <strong>${this.escapeHtml(displayName)}</strong>
        ${this.buildStreetViewLinkHtml(lat, lon)}
      </div>
    `;
    this.searchMarker.bindPopup(popupContent).openPopup();

    this.map.setView([lat, lon], 16, {
      animate: true,
      duration: 0.5,
    });

    const mapContainer = this.elementRef.nativeElement.querySelector('#map-container');
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  private buildStreetViewLinkHtml(latitude: number, longitude: number): string {
    if (!this.externalMapLinksEnabled()) {
      return '';
    }

    const url = buildExternalMapLink(STREET_VIEW_LINK_TEMPLATE, latitude, longitude);
    const label = this.translateEscaped(STREET_VIEW_LABEL_KEY);
    return `
      <div style="margin-top: 10px;">
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="color: white;">
          ${STREET_VIEW_ICON_SVG} ${label}
        </a>
      </div>
    `;
  }

  private translateEscaped(key: string): string {
    return this.escapeHtml(this.translateService.instant(key));
  }

  private escapeHtml(text: string): string {
    const element = document.createElement('span');
    element.textContent = text;
    return element.innerHTML;
  }

  public onOpenStreetView(location: LocationData, event: Event): void {
    event.stopPropagation();

    if (!this.externalMapLinksEnabled() || !location.latitude || !location.longitude) {
      return;
    }

    window.open(buildExternalMapLink(STREET_VIEW_LINK_TEMPLATE, location.latitude, location.longitude), '_blank');
  }

  public onSearchQueryChange(value: string): void {
    this.searchQuery.set(value);

    if (!value.trim() && this.searchMarker && this.map) {
      this.map.removeLayer(this.searchMarker);
      this.searchMarker = null;
    }
  }
}

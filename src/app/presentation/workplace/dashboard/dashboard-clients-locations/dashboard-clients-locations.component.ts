// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dashboard component displaying client locations on a map and as cards.
 * Supports two view modes: by city (physical address) and by group (organizational).
 * @param viewMode - Toggle between 'city' and 'group' aggregation
 * @param locations - Aggregated location data for the active view mode
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Component, inject, OnInit, OnDestroy, signal, ElementRef, AfterViewChecked,
  ChangeDetectionStrategy, effect,
  viewChild
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faStreetView } from '@fortawesome/free-solid-svg-icons';
import { SearchInputComponent } from 'src/app/presentation/shared/search-input/search-input.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { DataGeocodingService } from 'src/app/infrastructure/api/data-geocoding.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { IconLocationPinComponent } from 'src/app/presentation/icons/icon-location-pin.component';
import { SpinnerService } from 'src/app/presentation/spinner/spinner.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IGroup } from 'src/app/domain/models/group/group-class';

declare let L: any;

export interface LocationData {
  city: string;
  country: string;
  count: number;
  employeeCount: number;
  externEmpCount: number;
  customerCount: number;
  latitude?: number;
  longitude?: number;
}

export interface MapTileProvider {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

export enum ClientType {
  Employee = 0,
  ExternEmp = 1,
  Customer = 2,
}

export type LocationViewMode = 'city' | 'group';

const MAP_TILE_PROVIDER_STORAGE_KEY = 'dashboard-map-tile-provider';
const LOCATION_VIEW_MODE_STORAGE_KEY = 'dashboard-location-view-mode';

interface MapSettingsFormModel {
  tileProvider: string;
}

@Component({
  selector: 'app-dashboard-clients-locations',
  templateUrl: './dashboard-clients-locations.component.html',
  styleUrls: ['./dashboard-clients-locations.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormField, FontAwesomeModule, NgbTooltipModule, IconLocationPinComponent, SearchInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardClientsLocationsComponent implements OnInit, OnDestroy, AfterViewChecked {
  readonly mapContainerRef = viewChild<ElementRef<HTMLDivElement>>('mapContainer');
  private mapInitialized = false;
  private shouldInitializeMap = false;
  private dataDashboardService = inject(DataDashboardService);
  private dataGeocodingService = inject(DataGeocodingService);
  private localStorageService = inject(LocalStorageService);
  private elementRef = inject(ElementRef);
  private spinnerService = inject(SpinnerService);
  private toastService = inject(ToastShowService);
  private translateService = inject(TranslateService);

  public faStreetView = faStreetView;

  public locations = signal<LocationData[]>([]);
  public totalLocations = signal(0);
  public totalClients = signal(0);
  public isLoading = signal(true);
  public error = signal<string | null>(null);
  public viewMode = signal<LocationViewMode>('city');
  public noGroupsAssigned = signal(false);

  public searchQuery = signal('');
  private searchMarker: any = null;

  public readonly tileProviders: MapTileProvider[] = [
    {
      id: 'osm-standard',
      name: 'OpenStreetMap Standard',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
    {
      id: 'osm-de',
      name: 'OpenStreetMap DE',
      url: 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
    {
      id: 'carto-positron',
      name: 'CartoDB Positron (Hell)',
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    },
    {
      id: 'carto-dark',
      name: 'CartoDB Dark Matter (Dunkel)',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    },
    {
      id: 'carto-voyager',
      name: 'CartoDB Voyager (Modern)',
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    },
    {
      id: 'opentopomap',
      name: 'OpenTopoMap (Topografisch)',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      maxZoom: 17,
    },
  ];

  public mapSettingsModel = signal<MapSettingsFormModel>({ tileProvider: 'osm-standard' });
  public mapSettingsForm = form(this.mapSettingsModel);

  private locationFormInitialized = false;

  private map: any;
  private currentTileLayer: any;
  private markerClusterGroup: any;
  private resizeObserver: ResizeObserver | null = null;
  private markerBounds: any[] = [];

  constructor() {
    effect(() => {
      const providerId = this.mapSettingsModel().tileProvider;
      if (!this.locationFormInitialized) return;

      this.localStorageService.set(MAP_TILE_PROVIDER_STORAGE_KEY, providerId);

      if (!this.map) return;

      const provider = this.tileProviders.find(p => p.id === providerId);
      if (!provider) return;

      if (this.currentTileLayer) {
        this.map.removeLayer(this.currentTileLayer);
      }
      this.currentTileLayer = L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: provider.maxZoom,
      }).addTo(this.map);
    });
  }

  ngOnInit(): void {
    this.loadSavedTileProvider();
    this.loadSavedViewMode();
    this.locationFormInitialized = true;
    this.loadVisibilityStatus();
    this.loadDataForCurrentMode();
  }

  private loadVisibilityStatus(): void {
    this.dataDashboardService.getVisibilityStatus().subscribe({
      next: (status) => {
        this.noGroupsAssigned.set(status.isRestricted && !status.hasVisibleGroups);
      },
      error: () => {
        this.noGroupsAssigned.set(false);
      },
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldInitializeMap && !this.mapInitialized && this.mapContainerRef()?.nativeElement) {
      this.mapInitialized = true;
      this.shouldInitializeMap = false;
      this.initializeMap();
      this.loadMarkersOnMap(this.locations());
    }
  }

  private loadSavedTileProvider(): void {
    const savedProviderId = this.localStorageService.get(MAP_TILE_PROVIDER_STORAGE_KEY);
    if (savedProviderId && this.tileProviders.some(p => p.id === savedProviderId)) {
      this.mapSettingsModel.update(m => ({ ...m, tileProvider: savedProviderId }));
    }
  }

  private loadSavedViewMode(): void {
    const savedMode = this.localStorageService.get(LOCATION_VIEW_MODE_STORAGE_KEY);
    if (savedMode === 'city' || savedMode === 'group') {
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
    this.localStorageService.set(LOCATION_VIEW_MODE_STORAGE_KEY, mode);
    this.resetMap();
    this.loadDataForCurrentMode();
  }

  private resetMap(): void {
    this.mapInitialized = false;
    this.shouldInitializeMap = false;
    this.markerBounds = [];
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

    this.dataDashboardService.getClientsLocationsData().subscribe({
      next: (clients) => {
        const locationMap = new Map<string, LocationData>();

        clients.forEach((client) => {
          if (client.currentAddress) {
            const address = client.currentAddress;

            if (address.city && address.country) {
              const key = `${address.city}_${address.country}`;
              const clientType = client.type;

              if (locationMap.has(key)) {
                const existing = locationMap.get(key)!;
                existing.count++;

                if (clientType === ClientType.Employee) {
                  existing.employeeCount++;
                } else if (clientType === ClientType.ExternEmp) {
                  existing.externEmpCount++;
                } else if (clientType === ClientType.Customer) {
                  existing.customerCount++;
                }
              } else {
                locationMap.set(key, {
                  city: address.city,
                  country: address.country,
                  count: 1,
                  employeeCount: clientType === ClientType.Employee ? 1 : 0,
                  externEmpCount: clientType === ClientType.ExternEmp ? 1 : 0,
                  customerCount: clientType === ClientType.Customer ? 1 : 0,
                  latitude: address.latitude ?? undefined,
                  longitude: address.longitude ?? undefined,
                });
              }
            }
          }
        });

        const locationsArray = Array.from(locationMap.values()).sort(
          (a, b) => b.count - a.count
        );

        this.locations.set(locationsArray);
        this.totalLocations.set(locationsArray.length);
        this.totalClients.set(clients.length);
        this.isLoading.set(false);

        this.shouldInitializeMap = locationsArray.length > 0;
      },
      error: (err) => {
        this.shouldInitializeMap = false;
        this.error.set('Failed to load location data');
        console.error('Error loading locations:', err);
        this.isLoading.set(false);
      },
    });
  }

  private loadGroupData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.dataDashboardService.getClientsOverviewData().subscribe({
      next: (tree) => {
        const groups = this.flattenGroups(tree.nodes || []);
        const groupsWithClients = groups.filter(g => g.clientsCount > 0);

        const groupLocations: LocationData[] = groupsWithClients
          .map(group => ({
            city: group.name,
            country: '',
            count: group.clientsCount,
            employeeCount: group.employeesCount,
            externEmpCount: group.externEmpsCount,
            customerCount: group.customersCount,
          }))
          .sort((a, b) => b.count - a.count);

        const totalClients = groupLocations.reduce((sum, g) => sum + g.count, 0);

        this.locations.set(groupLocations);
        this.totalLocations.set(groupLocations.length);
        this.totalClients.set(totalClients);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load group data');
        console.error('Error loading group data:', err);
        this.isLoading.set(false);
      },
    });
  }

  private flattenGroups(groups: IGroup[]): IGroup[] {
    const result: IGroup[] = [];
    for (const group of groups) {
      result.push(group);
      if (group.children && group.children.length > 0) {
        result.push(...this.flattenGroups(group.children));
      }
    }
    return result;
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

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/assets/leaflet/marker-icon-2x.png',
      iconUrl: '/assets/leaflet/marker-icon.png',
      shadowUrl: '/assets/leaflet/marker-shadow.png',
    });

    this.map = L.map(mapContainer).setView([46.8182, 8.2275], 7);

    const provider = this.tileProviders.find(p => p.id === this.mapSettingsModel().tileProvider) || this.tileProviders[0];
    this.currentTileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
    }).addTo(this.map);

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

    this.markerClusterGroup.clearLayers();
    const bounds: any[] = [];

    locations.forEach((location) => {
      if (location.latitude && location.longitude) {
        const marker = L.marker([location.latitude, location.longitude]);

        const streetViewUrl = `https://www.google.com/maps/@${location.latitude},${location.longitude},3a,75y,90t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192`;
        const streetViewIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="14" height="14" fill="white"><path d="M320 64A64 64 0 1 0 192 64a64 64 0 1 0 128 0zm-96 96c-35.3 0-64 28.7-64 64l0 48c0 17.7 14.3 32 32 32l1.8 0 11.1 99.5c1.8 16.2 15.5 28.5 31.8 28.5l38.7 0c16.3 0 30-12.3 31.8-28.5L318.2 304l1.8 0c17.7 0 32-14.3 32-32l0-48c0-35.3-28.7-64-64-64l-64 0zM132.3 394.2c13-2.4 21.7-14.9 19.3-27.9s-14.9-21.7-27.9-19.3c-32.4 5.9-60.9 14.2-82 24.8c-10.5 5.3-20.3 11.7-27.8 19.6C6.4 399.5 0 410.5 0 424c0 21.4 15.5 36.1 29.1 45c14.7 9.6 34.3 17.3 56.4 23.4C130.2 504.7 190.4 512 256 512s125.8-7.3 170.4-19.6c22.1-6.1 41.8-13.8 56.4-23.4c13.7-8.9 29.1-23.6 29.1-45c0-13.5-6.4-24.5-13.9-32.6c-7.5-8-17.3-14.4-27.8-19.6c-21-10.6-49.5-18.9-82-24.8c-13-2.4-25.5 6.3-27.9 19.3s6.3 25.5 19.3 27.9c30.2 5.5 53.7 12.8 69 20.5c3.2 1.6 5.8 3.1 7.9 4.5c3.6 2.4 3.6 7.2 0 9.6c-8.8 5.7-23.1 11.8-43 17.3C374.3 457 318.5 464 256 464s-118.3-7-157.7-17.9c-19.9-5.5-34.2-11.6-43-17.3c-3.6-2.4-3.6-7.2 0-9.6c2.1-1.4 4.8-2.9 7.9-4.5c15.3-7.7 38.8-14.9 69-20.5z"/></svg>`;

        const popupContent = `
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 10px 0;">${location.city}, ${location.country}</h4>
            <p style="margin: 5px 0;"><strong>Total:</strong> ${location.count} Clients</p>
            ${location.employeeCount > 0 ? `<p style="margin: 5px 0; color: #1bc5bd;"><strong>Employees:</strong> ${location.employeeCount}</p>` : ''}
            ${location.externEmpCount > 0 ? `<p style="margin: 5px 0; color: #6993ff;"><strong>Extern Emp:</strong> ${location.externEmpCount}</p>` : ''}
            ${location.customerCount > 0 ? `<p style="margin: 5px 0; color: #ffa800;"><strong>Customers:</strong> ${location.customerCount}</p>` : ''}
            <div style="margin-top: 10px;">
              <a href="${streetViewUrl}" target="_blank" class="btn btn-primary" style="color: white;">
                ${streetViewIcon} Street View
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        this.markerClusterGroup.addLayer(marker);

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
    if (!query || !this.map) {
      return;
    }

    this.spinnerService.showProgressSpinner = true;

    this.dataGeocodingService.searchAddress(query).subscribe({
      next: (result) => {
        this.spinnerService.showProgressSpinner = false;

        if (result) {
          const { lat, lon, displayName } = result;

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

          const streetViewUrl = `https://www.google.com/maps/@${lat},${lon},3a,75y,90t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192`;
          const streetViewIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="14" height="14" fill="white"><path d="M320 64A64 64 0 1 0 192 64a64 64 0 1 0 128 0zm-96 96c-35.3 0-64 28.7-64 64l0 48c0 17.7 14.3 32 32 32l1.8 0 11.1 99.5c1.8 16.2 15.5 28.5 31.8 28.5l38.7 0c16.3 0 30-12.3 31.8-28.5L318.2 304l1.8 0c17.7 0 32-14.3 32-32l0-48c0-35.3-28.7-64-64-64l-64 0zM132.3 394.2c13-2.4 21.7-14.9 19.3-27.9s-14.9-21.7-27.9-19.3c-32.4 5.9-60.9 14.2-82 24.8c-10.5 5.3-20.3 11.7-27.8 19.6C6.4 399.5 0 410.5 0 424c0 21.4 15.5 36.1 29.1 45c14.7 9.6 34.3 17.3 56.4 23.4C130.2 504.7 190.4 512 256 512s125.8-7.3 170.4-19.6c22.1-6.1 41.8-13.8 56.4-23.4c13.7-8.9 29.1-23.6 29.1-45c0-13.5-6.4-24.5-13.9-32.6c-7.5-8-17.3-14.4-27.8-19.6c-21-10.6-49.5-18.9-82-24.8c-13-2.4-25.5 6.3-27.9 19.3s6.3 25.5 19.3 27.9c30.2 5.5 53.7 12.8 69 20.5c3.2 1.6 5.8 3.1 7.9 4.5c3.6 2.4 3.6 7.2 0 9.6c-8.8 5.7-23.1 11.8-43 17.3C374.3 457 318.5 464 256 464s-118.3-7-157.7-17.9c-19.9-5.5-34.2-11.6-43-17.3c-3.6-2.4-3.6-7.2 0-9.6c2.1-1.4 4.8-2.9 7.9-4.5c15.3-7.7 38.8-14.9 69-20.5z"/></svg>`;
          const popupContent = `
            <div style="min-width: 200px;">
              <strong>${displayName}</strong>
              <div style="margin-top: 10px;">
                <a href="${streetViewUrl}" target="_blank" class="btn btn-primary" style="color: white;">
                  ${streetViewIcon} Street View
                </a>
              </div>
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
        } else {
          this.toastService.showError(
            this.translateService.instant('dashboard.locations.searchNotFound')
          );
        }
      },
      error: (error) => {
        this.spinnerService.showProgressSpinner = false;
        console.error('Error searching address:', error);
      },
    });
  }

  public onOpenStreetView(location: LocationData, event: Event): void {
    event.stopPropagation();

    if (!location.latitude || !location.longitude) {
      return;
    }

    const url = `https://www.google.com/maps/@${location.latitude},${location.longitude},3a,75y,90t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192`;
    window.open(url, '_blank');
  }

  public onSearchQueryChange(value: string): void {
    this.searchQuery.set(value);

    if (!value.trim() && this.searchMarker && this.map) {
      this.map.removeLayer(this.searchMarker);
      this.searchMarker = null;
    }
  }
}

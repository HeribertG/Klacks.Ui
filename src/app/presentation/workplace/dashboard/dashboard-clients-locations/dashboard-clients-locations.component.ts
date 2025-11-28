/* eslint-disable @typescript-eslint/no-explicit-any */

import { Component, inject, OnInit, OnDestroy, signal, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { TranslateModule } from '@ngx-translate/core';

declare let L: any;

export interface LocationData {
  city: string;
  country: string;
  count: number;
  employeeCount: number;
  externEmpCount: number;
  customerCount: number;
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

const MAP_TILE_PROVIDER_STORAGE_KEY = 'dashboard-map-tile-provider';

@Component({
  selector: 'app-dashboard-clients-locations',
  templateUrl: './dashboard-clients-locations.component.html',
  styleUrls: ['./dashboard-clients-locations.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormsModule],
})
export class DashboardClientsLocationsComponent implements OnInit, OnDestroy {
  private dataDashboardService = inject(DataDashboardService);
  private localStorageService = inject(LocalStorageService);
  private elementRef = inject(ElementRef);

  public locations = signal<LocationData[]>([]);
  public totalLocations = signal(0);
  public totalClients = signal(0);
  public isLoading = signal(true);
  public error = signal<string | null>(null);

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

  public selectedTileProviderId = signal('osm-standard');

  private map: any;
  private currentTileLayer: any;
  private markerClusterGroup: any;
  private resizeObserver: ResizeObserver | null = null;
  private markerBounds: any[] = [];

  ngOnInit(): void {
    this.loadSavedTileProvider();
    this.loadLocationData();
  }

  private loadSavedTileProvider(): void {
    const savedProviderId = this.localStorageService.get(MAP_TILE_PROVIDER_STORAGE_KEY);
    if (savedProviderId && this.tileProviders.some(p => p.id === savedProviderId)) {
      this.selectedTileProviderId.set(savedProviderId);
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

        setTimeout(() => {
          this.initializeMap();
          this.loadMarkersOnMap(locationsArray);
        }, 100);
      },
      error: (err) => {
        this.error.set('Failed to load location data');
        console.error('Error loading locations:', err);
        this.isLoading.set(false);
      },
    });
  }

  private initializeMap(): void {
    if (typeof L === 'undefined') {
      console.error('Leaflet is not loaded');
      return;
    }

    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.map = L.map('map-container').setView([46.8182, 8.2275], 7);

    const provider = this.tileProviders.find(p => p.id === this.selectedTileProviderId()) || this.tileProviders[0];
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

  public onTileProviderChange(providerId: string): void {
    this.selectedTileProviderId.set(providerId);
    this.localStorageService.set(MAP_TILE_PROVIDER_STORAGE_KEY, providerId);

    if (!this.map) {
      return;
    }

    const provider = this.tileProviders.find(p => p.id === providerId);
    if (!provider) {
      return;
    }

    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }

    this.currentTileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
    }).addTo(this.map);
  }

  private loadMarkersOnMap(locations: LocationData[]): void {
    if (!this.map || !this.markerClusterGroup) {
      return;
    }

    this.markerClusterGroup.clearLayers();
    const bounds: any[] = [];

    this.dataDashboardService.getClientsLocationsData().subscribe({
      next: (clients) => {
        const locationCoords = new Map<string, { lat: number; lon: number }>();

        clients.forEach((client) => {
          if (
            client.currentAddress &&
            client.currentAddress.latitude &&
            client.currentAddress.longitude
          ) {
            const key = `${client.currentAddress.city},${client.currentAddress.country}`;
            locationCoords.set(key, {
              lat: client.currentAddress.latitude,
              lon: client.currentAddress.longitude,
            });
          }
        });

        locations.forEach((location) => {
          const key = `${location.city},${location.country}`;
          const coords = locationCoords.get(key);

          if (coords) {
            const marker = L.marker([coords.lat, coords.lon]);

            const popupContent = `
              <div style="min-width: 200px;">
                <h4 style="margin: 0 0 10px 0;">${location.city}, ${
              location.country
            }</h4>
                <p style="margin: 5px 0;"><strong>Total:</strong> ${
                  location.count
                } Clients</p>
                ${
                  location.employeeCount > 0
                    ? `<p style="margin: 5px 0; color: #1bc5bd;"><strong>Employees:</strong> ${location.employeeCount}</p>`
                    : ''
                }
                ${
                  location.externEmpCount > 0
                    ? `<p style="margin: 5px 0; color: #6993ff;"><strong>Extern Emp:</strong> ${location.externEmpCount}</p>`
                    : ''
                }
                ${
                  location.customerCount > 0
                    ? `<p style="margin: 5px 0; color: #ffa800;"><strong>Customers:</strong> ${location.customerCount}</p>`
                    : ''
                }
              </div>
            `;

            marker.bindPopup(popupContent);
            this.markerClusterGroup.addLayer(marker);

            bounds.push([coords.lat, coords.lon]);
          }
        });

        if (bounds.length > 0) {
          this.markerBounds = bounds;
          this.map.fitBounds(bounds);
        }
      },
      error: (err) => {
        console.error('Error loading location coordinates:', err);
      },
    });
  }

  public onZoomToAllMarkers(): void {
    if (!this.map || this.markerBounds.length === 0) {
      return;
    }
    this.map.fitBounds(this.markerBounds);
  }
}

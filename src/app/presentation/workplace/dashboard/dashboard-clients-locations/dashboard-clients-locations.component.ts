
import { Component, inject, OnInit, signal, AfterViewInit } from '@angular/core';
import { DataDashboardService } from 'src/app/infrastructure/api/data-dashboard.service';
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

export enum ClientType {
  Employee = 0,
  ExternEmp = 1,
  Customer = 2
}

@Component({
  selector: 'app-dashboard-clients-locations',
  templateUrl: './dashboard-clients-locations.component.html',
  styleUrls: ['./dashboard-clients-locations.component.scss'],
  standalone: true,
  imports: [TranslateModule],
})
export class DashboardClientsLocationsComponent implements OnInit, AfterViewInit {
  private dataDashboardService = inject(DataDashboardService);

  public locations = signal<LocationData[]>([]);
  public totalLocations = signal(0);
  public totalClients = signal(0);
  public isLoading = signal(true);
  public error = signal<string | null>(null);

  private map: any;
  private markerClusterGroup: any;

  ngOnInit(): void {
    this.loadLocationData();
  }

  ngAfterViewInit(): void {
  }

  private loadLocationData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.dataDashboardService.getClientsLocationsData().subscribe({
      next: (clients) => {
        const locationMap = new Map<string, LocationData>();

        clients.forEach(client => {
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
                  customerCount: clientType === ClientType.Customer ? 1 : 0
                });
              }
            }
          }
        });

        const locationsArray = Array.from(locationMap.values())
          .sort((a, b) => b.count - a.count);

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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.markerClusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      removeOutsideVisibleBounds: true,
    });

    this.map.addLayer(this.markerClusterGroup);
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

        clients.forEach(client => {
          if (client.currentAddress && client.currentAddress.latitude && client.currentAddress.longitude) {
            const key = `${client.currentAddress.city},${client.currentAddress.country}`;
            locationCoords.set(key, {
              lat: client.currentAddress.latitude,
              lon: client.currentAddress.longitude
            });
          }
        });

        locations.forEach(location => {
          const key = `${location.city},${location.country}`;
          const coords = locationCoords.get(key);

          if (coords) {
            const marker = L.marker([coords.lat, coords.lon]);

            const popupContent = `
              <div style="min-width: 200px;">
                <h4 style="margin: 0 0 10px 0;">${location.city}, ${location.country}</h4>
                <p style="margin: 5px 0;"><strong>Total:</strong> ${location.count} Clients</p>
                ${location.employeeCount > 0 ? `<p style="margin: 5px 0; color: #1bc5bd;"><strong>Employees:</strong> ${location.employeeCount}</p>` : ''}
                ${location.externEmpCount > 0 ? `<p style="margin: 5px 0; color: #6993ff;"><strong>Extern Emp:</strong> ${location.externEmpCount}</p>` : ''}
                ${location.customerCount > 0 ? `<p style="margin: 5px 0; color: #ffa800;"><strong>Customers:</strong> ${location.customerCount}</p>` : ''}
              </div>
            `;

            marker.bindPopup(popupContent);
            this.markerClusterGroup.addLayer(marker);

            bounds.push([coords.lat, coords.lon]);
          }
        });

        if (bounds.length > 0) {
          this.map.fitBounds(bounds, { padding: [50, 50] });
        }
      },
      error: (err) => {
        console.error('Error loading location coordinates:', err);
      },
    });
  }
}

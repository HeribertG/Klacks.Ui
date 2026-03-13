---
name: dashboard
description: Verwende wenn am Dashboard, Pie-Charts, Leaflet-Karte oder Client-Locations gearbeitet wird
---

# Dashboard

## Übersicht

Die Dashboard-Seite enthält:
1. **Clients Overview** - Pie-Chart mit Client-Gruppen
2. **Clients Locations** - Leaflet-Karte mit Standorten
3. **Shifts Overview** - Schicht-Statistiken

## Frontend Services

### DataDashboardService

```typescript
@Injectable({ providedIn: 'root' })
export class DataDashboardService {
  getClientsOverviewData(): Observable<IGroupTree> {
    return this.httpClient.get<IGroupTree>(`${environment.baseUrl}Groups/tree`);
  }

  getClientsLocationsData(): Observable<IClientLocationResource[]> {
    return this.httpClient.get<IClientLocationResource[]>(
      `${environment.baseUrl}Dashboard/ClientLocations`
    );
  }
}
```

### DataGeocodingService

Für Frontend-Adresssuche (direkt an Nominatim):

```typescript
searchAddress(query: string): Observable<GeocodingResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  return this.httpClient.get<NominatimResult[]>(url).pipe(
    map(results => results?.[0] ? { lat, lon, displayName } : null)
  );
}
```

## Models

```typescript
interface IClientLocationResource {
  id: string;
  type: number;
  currentAddress: IAddressInfo | null;
}

interface IAddressInfo {
  city: string;
  country: string;
  zip: string;
  latitude?: number | null;
  longitude?: number | null;
}
```

## API Endpunkte

| Method | Route | Beschreibung |
|--------|-------|--------------|
| GET | `/api/backend/Dashboard/ClientLocations` | Client-Standorte mit GPS |
| GET | `/api/backend/Groups/tree` | Gruppen-Hierarchie |

## Leaflet Map

### Setup (index.html)

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
```

### Features

- **Marker Clustering** - Gruppiert nahe Marker
- **Tile Provider Auswahl** - 6 Kartenstile (LocalStorage)
- **Adress-Suche** - Roter Marker für Suchergebnis
- **Street View** - Button in Popups öffnet Google Street View
- **Zoom to Location** - Klick auf Card zoomt zur Karte

## Komponenten

| Component | Pfad | Beschreibung |
|-----------|------|--------------|
| DashboardHomeComponent | `dashboard-home/` | Container |
| DashboardClientsOverviewComponent | `dashboard-clients-overview/` | Pie-Chart |
| DashboardClientsLocationsComponent | `dashboard-clients-locations/` | Karte + Liste |
| DashboardShiftsOverviewComponent | `dashboard-shifts-overview/` | Statistiken |

## Dateien

**Frontend:**
```
presentation/workplace/dashboard/
├── dashboard-home/
├── dashboard-clients-overview/
├── dashboard-clients-locations/
└── dashboard-shifts-overview/
```

**Backend:**
```
Klacks.Api/
├── Presentation/Controllers/UserBackend/DashboardController.cs
├── Application/Handlers/Dashboard/GetClientLocationsQueryHandler.cs
└── Infrastructure/Services/GeocodingService.cs
```

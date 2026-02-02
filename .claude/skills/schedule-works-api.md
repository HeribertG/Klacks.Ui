# Works API

## Autorisierung

Der `WorksController` erbt von `BaseController` (nicht `InputBaseController`).
**Alle Endpunkte** erfordern nur JWT-Authentifizierung, **keine spezifischen Rollen**.

## Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/api/v1/backend/Works/{id}` | Work abrufen |
| POST | `/api/v1/backend/Works` | Work erstellen |
| PUT | `/api/v1/backend/Works` | Work aktualisieren |
| DELETE | `/api/v1/backend/Works/{id}` | Work löschen |
| POST | `/api/v1/backend/Works/Bulk` | Mehrere Works erstellen |
| DELETE | `/api/v1/backend/Works/Bulk` | Mehrere Works löschen |
| POST | `/api/v1/backend/Works/Schedule` | Arbeitsplan abrufen |
| GET | `/api/v1/backend/Works/Changes` | WorkChanges auflisten |
| GET | `/api/v1/backend/Works/Changes/{id}` | WorkChange abrufen |
| POST | `/api/v1/backend/Works/Changes` | WorkChange erstellen |
| PUT | `/api/v1/backend/Works/Changes` | WorkChange aktualisieren |
| DELETE | `/api/v1/backend/Works/Changes/{id}` | WorkChange löschen |

## Service-Architektur

```
DataManagementScheduleService
        | delegiert
        v
WorkScheduleCrudService
  - addWorkScheduleEntry(params, workFilter)
  - deleteWorkScheduleEntry(params, workFilter)
  - bulkDeleteWorkScheduleEntries(entries[], workFilter)
  - scheduleRefreshed: Signal<boolean>
  - shiftScheduleRefreshed: Signal<boolean>
        | API Calls (mit periodStart/periodEnd)
        v
WorkCrudService
  - createWork(params): Promise<IWork>      // enthält periodHours in Response
  - deleteWorkById(workId, periodStart, periodEnd): Promise<IWork>
  - bulkDeleteWorks(workIds[]): Promise<BulkWorksResponse>
        | HTTP
        v
DataScheduleService
  - addWork(work): Observable               // work enthält periodStart/periodEnd
  - deleteWork(id, periodStart, periodEnd): Observable  // Query-Parameter
  - bulkDeleteWorks(workIds[]): Observable<BulkWorksResponse>
```

## PeriodHours in Response

```typescript
interface IWork {
  // ... bestehende Felder
  periodHours?: IPeriodHours;  // in Response enthalten
  periodStart?: string;        // im Request mitschicken
  periodEnd?: string;          // im Request mitschicken
}

interface IPeriodHours {
  hours: number;
  surcharges: number;
  guaranteedHours: number;
}
```

Das Frontend schickt `periodStart`/`periodEnd` aus `workScheduleLoader.startDate/endDate`:

```typescript
const periodStart = formatDateOnly(this.workScheduleLoader.startDate);
const periodEnd = formatDateOnly(this.workScheduleLoader.endDate);
```

Bei Delete werden diese als Query-Parameter gesendet:
```
DELETE /Works/{id}?periodStart=2026-01-01&periodEnd=2026-01-31
```

## Workflow: Add Work

1. Drop Shift auf Schedule-Section
2. `DataManagementScheduleService.addWorkScheduleEntry()`
3. `WorkCrudService.createWork({ ...params, periodStart, periodEnd })` -> POST /Works
4. Response enthält `periodHours` -> `workScheduleLoader.periodHours.set(clientId, response.periodHours)`
5. `refreshClientScheduleForDays(clientId, date)` -> Lädt 3 Tage
6. `updateShiftEngagedLocally(shiftId, date, +1)`

## Workflow: Bulk Delete

1. Delete-Taste bei Multi-Selection
2. Sammelt alle workIds aus Positionen
3. `DELETE /Works/Bulk`
4. 3-Tage-Regel mit Überlappungs-Merging
5. `bulkUpdateShiftEngagedLocally(entries)`

### 3-Tage-Regel mit Überlappungs-Merging

```
Eingabe:  Tag 5, Tag 6, Tag 7 (gleicher Shift)

3-Tage pro Tag:
  Tag 5 -> [4, 5, 6]
  Tag 6 -> [5, 6, 7]
  Tag 7 -> [6, 7, 8]

Nach Merge: [4, 5, 6, 7, 8] -> 1 API-Call
```

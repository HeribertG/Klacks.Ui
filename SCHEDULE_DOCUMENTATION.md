# Schedule Documentation

**Letzte Aktualisierung:** 26.01.2026

---

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Architektur](#architektur)
3. [Konzept: Beschäftigungen vs Dienste](#konzept-beschäftigungen-vs-dienste)
4. [Shift-System](#shift-system)
5. [Works API](#works-api)
6. [WorkSchedule Implementation](#workschedule-implementation)
7. [Client Period Hours](#client-period-hours-periodenbasierte-stundenplanung)
8. [Grid Cell Editing](#grid-cell-editing)
9. [Monatsberechnung](#monatsberechnung)
10. [Feiertags-Integration](#feiertags-integration)
11. [Horizontale Scroll-Synchronisierung](#horizontale-scroll-synchronisierung)
12. [Grid Selection Mode](#grid-selection-mode)
13. [Verfügbare Shifts Anzeige](#verfügbare-shifts-anzeige)
14. [Drag & Drop von Shifts](#drag--drop-von-shifts)
15. [Work CRUD - Architektur & Workflows](#work-crud---architektur--workflows)
16. [Copy/Paste Funktionalität](#copypaste-funktionalität)
17. [Fill Handle](#fill-handle)
18. [Context Menu](#context-menu)
19. [Client Filter](#client-filter)
20. [Changelog](#changelog)

---

## Übersicht

Die Schedule-Ansicht zeigt eine Kalenderübersicht für einen ausgewählten Monat mit:
- Kunden/Mitarbeiter-Zeilen
- Tages-Spalten (inkl. Vor-/Nachlauf-Tage)
- Feiertags-Markierungen
- Wochenend-Markierungen

---

## Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                    ScheduleHeaderComponent                       │
│  - Monat/Jahr-Auswahl                                           │
│  - Kalender-Selektor für Feiertage                              │
│  - Zoom-Slider                                                  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                                       ▼
┌─────────────────────────┐             ┌─────────────────────────┐
│   ScheduleSectionComponent │           │   ShiftSectionComponent   │
│   (Beschäftigungen)      │             │   (Dienste)              │
└─────────────────────────┘             └─────────────────────────┘
              │                                       │
              ▼                                       ▼
┌─────────────────────────┐             ┌─────────────────────────┐
│   ScheduleDataService   │             │   ShiftDataService      │
│   - startDate           │             │   - startDate           │
│   - columns             │             │   - columns             │
│   - getWeekday()        │             │   - getWeekday()        │
│   - holidayInfo()       │             │   - holidayInfo()       │
└─────────────────────────┘             └─────────────────────────┘
```

---

## Konzept: Beschäftigungen vs Dienste

### Die zwei Hauptarten von Arbeit

| Kriterium | Beschäftigungen | Dienste |
|-----------|----------------|---------|
| **Bezahlt von** | Firma | Kunde |
| **Typ** | Interne Tätigkeit / Abwesenheit | Kundenbestellung |
| **Hat Kundenbezug** | Nein | Ja (Kunde bestellt) |
| **Beispiel** | Urlaub, Krankheit, Schulung | Pflegedienst, Betreuung |

### Absenzen (= Beschäftigungen)

Alle Beschäftigungen werden als Absenzen definiert:
- Urlaub, Krankheit, Mutterschaft
- Weiterbildung, Gesperrte Tage
- Unbezahlter Urlaub

**Wichtige Flags:**
- `Undeletable = true` → Kann NICHT gelöscht werden (Urlaub, Krankheit, Unfall)
- `HideInGantt = true` → Wird NICHT im Gantt-Kalender angezeigt

### Dienste (Shifts)

Dienste sind Kundenbestellungen - bezahlte Tätigkeiten beim Kunden.

**Nur** OriginalShift (2) und SplitShift (3) können verplant werden!

---

## Shift-System

### Status-Flow

```
0 (OriginalOrder) → 1 (SealedOrder) → 2 (OriginalShift) → 3 (SplitShift)
     [Entwurf]        [Versiegelt]      [Backend-Kopie]     [Geschnitten]
```

### Wichtige Felder für TimeRange-Shifts

- `isTimeRange: true` → draggable im Time-Ruler
- `timeRangeStartShift` / `timeRangeEndShift` → Zeitfenster
- `startShift` / `endShift` → Original-Zeiten

### Nested Set Tree (für Cuts)

- `lft`, `rgt` → Nested Set Werte
- `parent_id` → Eltern-Cut
- `root_id` → Wurzel-Cut

---

## Works API

### Autorisierung

Der `WorksController` erbt von `BaseController` (nicht `InputBaseController`).
**Alle Endpunkte** erfordern nur JWT-Authentifizierung, **keine spezifischen Rollen**.

### Endpunkte

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

---

## WorkSchedule Implementation

### Stored Procedure

Die SP `get_work_schedule` kombiniert vier Entitäten:
- **EntryType 0**: Work (Arbeitseinsätze)
- **EntryType 1**: WorkChange (Zeitkorrekturen, Vertretungen)
- **EntryType 2**: Expenses (Spesen)
- **EntryType 3**: Break (Abwesenheiten: Urlaub, Krankheit, etc.)

```sql
SELECT * FROM get_work_schedule(
    '2026-01-01'::DATE,   -- start_date
    '2026-01-31'::DATE,   -- end_date
    ARRAY[]::UUID[],      -- visible_group_ids (optional)
    'de'::TEXT,           -- current_language
    ARRAY['de','en','fr','it']::TEXT[]  -- fallback_order (aus MultiLanguage.SupportedLanguages)
)
```

### Rückgabe-Felder

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Eindeutige ID des Eintrags |
| entry_type | INTEGER | 0=Work, 1=WorkChange, 2=Expenses, 3=Break |
| source_id | UUID | Referenz zum Quell-Eintrag (Work oder Break) |
| client_id | UUID | Mitarbeiter-ID |
| entry_date | DATE | Datum des Eintrags |
| start_time | TIME | Startzeit |
| end_time | TIME | Endzeit |
| change_time | NUMERIC | Zeitänderung in Minuten |
| work_change_type | INTEGER | Art der Änderung (0-3) |
| description | TEXT | Beschreibung |
| amount | NUMERIC | Betrag (Expenses) |
| shift_id | UUID | Schicht-ID (bei Break: Absence-ID) |
| entry_name | TEXT | Name (Shift-Name oder lokalisierter Absence-Name) |
| abbreviation | TEXT | Abkürzung (bei Break: lokalisiert)

### Backend Dateien

```
Infrastructure/Persistence/StoredProcedures/GetWorkSchedule.sql
Domain/Models/Schedules/WorkScheduleEntry.cs
Domain/Interfaces/IWorkScheduleService.cs
Domain/Services/WorkSchedule/WorkScheduleService.cs
Application/Queries/WorkSchedule/GetWorkScheduleQuery.cs
Application/Handlers/WorkSchedule/GetWorkScheduleQueryHandler.cs
Presentation/DTOs/Schedules/WorkScheduleResource.cs
Presentation/DTOs/Schedules/WorkScheduleResponse.cs
```

### Frontend Model

```typescript
export interface IScheduleCell {
  id: string;
  entryType: number;
  sourceId: string;           // Referenz auf Work oder Break
  clientId: string;
  entryDate: Date;
  startTime: string;
  endTime: string;
  changeTime: number | null;
  workChangeType: number | null;
  description: string | null;
  amount: number | null;
  shiftId: string;            // Bei Break: AbsenceId
  entryName: string | null;   // Shift-Name oder lokalisierter Absence-Name
  abbreviation: string | null;
  toInvoice: boolean | null;
  taxable: boolean | null;
  replaceClientId: string | null;
  isReplacementEntry: boolean;
}

export enum WorkScheduleEntryType {
  Work = 0,
  WorkChange = 1,
  Expenses = 2,
  Break = 3,
}
```

---

## Client Period Hours (Periodenbasierte Stundenplanung)

### Konzept

`ClientPeriodHours` speichert die aggregierten Stunden eines Clients pro Planungsperiode. Die Periodenart wird durch `PaymentInterval` bestimmt:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PaymentInterval (Enum)                                │
├─────────────────┬───────────────────────────────────────────────────────────┤
│ Weekly (0)      │ Wöchentliche Planung → Year + WeekNumber (1-53)           │
│ Biweekly (1)    │ 2-wöchentliche Planung → Year + WeekNumber (2,4,6...)     │
│ Monthly (2)     │ Monatliche Planung → Year + Month (1-12)                  │
│ Individual (3)  │ Benutzerdefiniert → IndividualPeriodId                    │
└─────────────────┴───────────────────────────────────────────────────────────┘
```

### Anwendungsfall

Jeder Client, der verplant wird, erhält `n` ClientPeriodHours-Einträge:

| PaymentInterval | Beispiel | Verwendete Felder |
|-----------------|----------|-------------------|
| **Monthly** | Januar 2026 | `Year=2026`, `Month=1` |
| **Weekly** | KW 5/2026 | `Year=2026`, `WeekNumber=5` |
| **Biweekly** | KW 2,4,6.../2026 | `Year=2026`, `WeekNumber=2` |
| **Individual** | "Sommersaison" | `IndividualPeriodId=<guid>` |

So können monatliche, wöchentliche, 2-wöchentliche und individuelle Planungen parallel existieren.

### Tabelle: `client_period_hours`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primärschlüssel |
| `client_id` | UUID | FK zu Client |
| `year` | int | Jahr |
| `month` | int? | Monat (1-12), nur bei Monthly |
| `week_number` | int? | Kalenderwoche (1-53), nur bei Weekly/Biweekly |
| `individual_period_id` | UUID? | FK zu IndividualPeriod, nur bei Individual |
| `hours` | decimal | Summe der Arbeitsstunden |
| `surcharges` | decimal | Zuschlagsstunden (Nacht/Feiertag) |
| `payment_interval` | int | 0=Weekly, 1=Biweekly, 2=Monthly, 3=Individual |

### Filtered Unique Indexes

Da je nach `PaymentInterval` unterschiedliche Felder relevant sind, werden **Filtered Unique Indexes** verwendet:

```sql
-- Monthly: Eindeutig pro Client + Jahr + Monat
CREATE UNIQUE INDEX ix_client_period_hours_monthly
ON client_period_hours (client_id, year, month)
WHERE payment_interval = 2;

-- Weekly/Biweekly: Eindeutig pro Client + Jahr + Woche
CREATE UNIQUE INDEX ix_client_period_hours_weekly
ON client_period_hours (client_id, year, week_number)
WHERE payment_interval IN (0, 1);

-- Individual: Eindeutig pro Client + IndividualPeriod
CREATE UNIQUE INDEX ix_client_period_hours_individual
ON client_period_hours (client_id, individual_period_id)
WHERE payment_interval = 3;
```

### EF Core Konfiguration

```csharp
// DataBaseContext.cs
modelBuilder.Entity<ClientPeriodHours>()
    .HasIndex(p => new { p.ClientId, p.Year, p.Month })
    .HasFilter("payment_interval = 2")
    .IsUnique();

modelBuilder.Entity<ClientPeriodHours>()
    .HasIndex(p => new { p.ClientId, p.Year, p.WeekNumber })
    .HasFilter("payment_interval IN (0, 1)")
    .IsUnique();

modelBuilder.Entity<ClientPeriodHours>()
    .HasIndex(p => new { p.ClientId, p.IndividualPeriodId })
    .HasFilter("payment_interval = 3")
    .IsUnique();

// Query Filter: Nur Clients die nicht gelöscht sind
modelBuilder.Entity<ClientPeriodHours>()
    .HasQueryFilter(p => !p.Client!.IsDeleted);
```

---

### IndividualPeriod (Benutzerdefinierte Perioden)

Für `PaymentInterval.Individual` können beliebige Zeiträume definiert werden.

#### Tabelle: `individual_period`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primärschlüssel |
| `name` | string | Name der Periode (z.B. "Sommersaison 2026") |

#### Tabelle: `period` (Zeitabschnitte)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primärschlüssel |
| `individual_period_id` | UUID | FK zu IndividualPeriod |
| `from_date` | DateOnly | Startdatum des Zeitraums |
| `until_date` | DateOnly? | Enddatum (optional, null = unbegrenzt) |
| `full_hours` | decimal | Soll-Stunden für diesen Zeitraum |

#### Beispiel: Sommersaison

```
IndividualPeriod: { name: "Sommersaison 2026" }
├── Period: { from: 01.06.2026, until: 30.06.2026, fullHours: 180 }
├── Period: { from: 01.07.2026, until: 31.07.2026, fullHours: 200 }
└── Period: { from: 01.08.2026, until: 31.08.2026, fullHours: 180 }
```

---

### Entitäten (Domain Models)

```csharp
// ClientPeriodHours.cs
public class ClientPeriodHours : BaseEntity
{
    public Guid ClientId { get; set; }
    public int Year { get; set; }
    public int? Month { get; set; }
    public int? WeekNumber { get; set; }
    public Guid? IndividualPeriodId { get; set; }
    public decimal Hours { get; set; }
    public decimal Surcharges { get; set; }
    public PaymentInterval PaymentInterval { get; set; } = PaymentInterval.Monthly;

    public virtual Client? Client { get; set; }
    public virtual IndividualPeriod? IndividualPeriod { get; set; }
}

// IndividualPeriod.cs
public class IndividualPeriod : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public virtual ICollection<Period> Periods { get; set; } = [];
}

// Period.cs
public class Period : BaseEntity
{
    public Guid IndividualPeriodId { get; set; }
    public DateOnly FromDate { get; set; }
    public DateOnly? UntilDate { get; set; }
    public decimal FullHours { get; set; }
    public virtual IndividualPeriod? IndividualPeriod { get; set; }
}

// PaymentInterval.cs (Enum)
public enum PaymentInterval
{
    Weekly = 0,
    Biweekly = 1,
    Monthly = 2,
    Individual = 3
}
```

---

### API Response

`POST /api/backend/Works/Schedule` liefert zusätzlich:

```json
{
  "entries": [...],
  "clients": [...],
  "periodHours": {
    "<clientId>": {
      "hours": 120.5,
      "surcharges": 8.0,
      "guaranteedHours": 160.0
    }
  }
}
```

### Berechnung

1. Falls `client_period_hours` Eintrag für die aktuelle Periode existiert → diesen verwenden
2. Sonst → Summe aus `work.work_time` für den Zeitraum berechnen
3. `guaranteedHours` kommt aus aktivem `client_contract`

### Frontend Row-Header

| Slot | Inhalt | Format |
|------|--------|--------|
| Slot1 | Soll-Stunden (`guaranteedHours`) | HH:mm (z.B. `170:00`) |
| Slot2 | Geleistete Stunden (`hours`) | HH:mm (z.B. `168:30`) |
| Slot3 | Zuschläge (`surcharges`) | HH:mm (z.B. `05:15`) |

Die Formatierung verwendet `hoursToHHMM()` aus `time-format.helper.ts`.

---

## Grid Cell Editing

### Komponenten

| Datei | Beschreibung |
|-------|--------------|
| `grid-surface-template.component.ts` | Basis-Grid mit editierbarem Input-Overlay |
| `cell-input-events.directive.ts` | Keyboard/Mouse Events für Cell-Input |
| `grid-template-events.directive.ts` | Canvas Events für Grid-Navigation |

### Input-Overlay Verhalten

- Erscheint wenn: Zelle selektiert UND `settings.editable = true` UND `isCellEditable(row, col) = true`
- Bewegt sich mit Scroll und Zoom
- Font-Größe folgt `GridFontsService.mainFontSizeZoom`

### Keyboard-Navigation

| Taste | Verhalten |
|-------|-----------|
| Enter, Tab | Immer speichern + navigieren |
| ArrowUp/Down, Home, End | Immer speichern + navigieren |
| ArrowRight | Navigieren nur wenn Cursor am Ende |
| ArrowLeft, Backspace | Navigieren nur wenn Cursor am Anfang |
| Escape | Abbrechen (Originalwert wiederherstellen) |

### isCellEditable Override

```typescript
public override isCellEditable(row: number, col: number): boolean {
  if (this.isColumnSealed(col)) return false;
  return this.isCellActive(row, col);
}
```

### Cell Value Change Event

```typescript
onCellValueChange(event: CellValueChangeEvent): void {
  // event = { row, column, value }
  // Match abbreviation gegen shiftSchedules
  // Bei Match: addWorkScheduleEntry aufrufen
}
```

### Refresh ohne Scroll-Reset

```typescript
this.scheduleSurface.Refresh(false);  // resetScroll = false
```

---

## Monatsberechnung

### Konventionen

| Komponente | Monats-Basis | Beispiel Dezember |
|------------|--------------|-------------------|
| JavaScript `Date` | 0-basiert | 11 |
| `WorkFilter.currentMonth` | 1-basiert | 12 |
| `getDaysInMonth()` | 0-basiert | 11 |
| `monthsName[]` Array | 0-basiert | Index 11 |

### Korrekte Verwendung

```typescript
public override initializeDateAndColumns(): void {
  const currentMonth = this.dataManagementSchedule.workFilter.currentMonth;  // 1-basiert!

  // Date braucht 0-basiert → -1
  this.startDate = new Date(currentYear, currentMonth - 1, 1);

  // getDaysInMonth braucht 0-basiert → -1
  this.columns = getDaysInMonth(currentYear, currentMonth - 1) +
                 dayVisibleBeforeMonth + dayVisibleAfterMonth;
}
```

### Häufige Fehler

| Fehler | Symptom | Lösung |
|--------|---------|--------|
| `getDaysInMonth(year, currentMonth)` ohne -1 | Canvas-Fehler | `currentMonth - 1` |
| `selectedMonth = getMonth()` ohne +1 | Inkonsistenz | `getMonth() + 1` |
| `[ngValue]="i"` ohne +1 | Falscher Monat | `i + 1` |

---

## Feiertags-Integration

```typescript
override getWeekday(column: number): WeekDaysEnum {
  const today = addDays(this.startDate, column);

  const holiday = this.holidayCollection.holidays.holidayList.find(
    (x) => EqualDate(x.currentDate, today) === 0
  );

  if (holiday) {
    return holiday.officially
      ? WeekDaysEnum.OfficiallyHoliday
      : WeekDaysEnum.Holiday;
  }
  // ...
}
```

---

## Horizontale Scroll-Synchronisierung

### Architektur (aktualisiert 22.01.2026)

```
┌─ ScheduleContainerComponent ────────────────────────────────────────────┐
│                                                                          │
│  ┌─ ScheduleSectionComponent ────────────────────────────────────────┐  │
│  │  H-Scrollbar.valueChange → hScrollPositionChange.emit(value)      │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
│                                     │                                    │
│                    hScrollPosition = value  (direktes Binding)           │
│                                     │                                    │
│  ┌─ ShiftSectionComponent ──────────▼────────────────────────────────┐  │
│  │  @Input() hScrollPosition → scrollService.horizontalScrollPosition│  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Wichtige Details

**Jede Section hat eigenen ScrollService:**
- `schedule-section`: eigener ScrollService (providers)
- `shift-section`: eigener ScrollService (providers)

**MaxCols Workaround in GridSurfaceTemplate:**
```typescript
// grid-surface-template.component.ts - ngOnChanges
if (currH > this.scroll.maxCols) {
  this.scroll.maxCols = currH + 10;
}
```

**Grund:** Der ScrollService clampet die Position auf `maxCols`. Da `maxCols` initial auf einen kleineren Wert gesetzt wird (basierend auf sichtbaren Spalten), würde das Clamping die Synchronisierung blockieren. Der Workaround erhöht `maxCols` automatisch wenn ein größerer Wert reinkommt.

### Legacy: ScheduleHorizontalScrollService

Der `ScheduleHorizontalScrollService` existiert noch für bidirektionale Kommunikation (wenn in shift-section gescrollt wird), wird aber primär durch direkte Input-Bindings ersetzt.

---

## Grid Selection Mode

### GridSelectionModeEnum

```typescript
export enum GridSelectionModeEnum {
  Cell = 1,        // Standard: nur Zelle selektierbar
  Row = 2,         // Ganze Zeile wird markiert
  RowActiveOnly = 3  // Zeile nur markiert wenn Zelle aktiv
}
```

### RowActiveOnly Modus (Shift-Section)

- **Jede Zelle** kann selektiert werden
- **Zeilen-Highlight** nur wenn selektierte Zelle Inhalt hat
- **Multiselect** ist deaktiviert

---

## Verfügbare Shifts Anzeige

- **Rote Schriftfarbe:** Es gibt noch verfügbare Shifts an diesem Tag
- **Standard Schriftfarbe:** Alle Shifts sind vollständig besetzt

Ein Shift gilt als verfügbar wenn: `engaged < sumEmployees * quantity`

```typescript
override getHeaderFontColor(column: number): string | null {
  const availableShifts = this.dataManagementSchedule.availableShiftsByDay;
  if (availableShifts[column]?.length > 0) {
    return 'red';
  }
  return null;
}
```

---

## Drag & Drop von Shifts

### Ablauf

1. **Mousedown** auf gefüllte Shift-Zelle → Zelle wird selektiert
2. **Nach Verzögerung** (DRAG_DELAY_MS) → Drag startet
3. **Mouseup vor Verzögerung** → Nur Selektion, kein Drag

```typescript
private tryPrepareShiftDrag(event: MouseEvent): void {
  if (this.gridSurface.nameId !== 'shift') return;
  if (!this.gridData.isCellActive(pos.row, pos.column)) return;

  this.dragDelayTimer = setTimeout(() => {
    this.shiftDragService.startDrag(event, dragData);
  }, this.DRAG_DELAY_MS);
}
```

---

## Work CRUD - Architektur & Workflows

### Service-Architektur

```
DataManagementScheduleService
        │ delegiert
        ▼
WorkScheduleCrudService
  - addWorkScheduleEntry(params, workFilter)
  - deleteWorkScheduleEntry(params, workFilter)
  - bulkDeleteWorkScheduleEntries(entries[], workFilter)
  - scheduleRefreshed: Signal<boolean>
  - shiftScheduleRefreshed: Signal<boolean>
        │ API Calls (mit periodStart/periodEnd)
        ▼
WorkCrudService
  - createWork(params): Promise<IWork>      // enthält periodHours in Response
  - deleteWorkById(workId, periodStart, periodEnd): Promise<IWork>
  - bulkDeleteWorks(workIds[]): Promise<BulkWorksResponse>
        │ HTTP
        ▼
DataScheduleService
  - addWork(work): Observable               // work enthält periodStart/periodEnd
  - deleteWork(id, periodStart, periodEnd): Observable  // Query-Parameter
  - bulkDeleteWorks(workIds[]): Observable<BulkWorksResponse>
```

### PeriodHours in Response

Seit Januar 2026 wird `periodHours` bei Work CRUD-Operationen direkt in der HTTP-Response zurückgegeben:

```typescript
interface IWork {
  // ... bestehende Felder
  periodHours?: IPeriodHours;  // NEU: in Response enthalten
  periodStart?: string;        // NEU: im Request mitschicken
  periodEnd?: string;          // NEU: im Request mitschicken
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

### Workflow: Add Work

1. Drop Shift auf Schedule-Section
2. `DataManagementScheduleService.addWorkScheduleEntry()`
3. `WorkCrudService.createWork({ ...params, periodStart, periodEnd })` → POST /Works
4. **NEU:** Response enthält `periodHours` → `workScheduleLoader.periodHours.set(clientId, response.periodHours)`
5. `refreshClientScheduleForDays(clientId, date)` → Lädt 3 Tage
6. `updateShiftEngagedLocally(shiftId, date, +1)`

### Workflow: Bulk Delete

1. Delete-Taste bei Multi-Selection
2. Sammelt alle workIds aus Positionen
3. `DELETE /Works/Bulk`
4. 3-Tage-Regel mit Überlappungs-Merging
5. `bulkUpdateShiftEngagedLocally(entries)`

### 3-Tage-Regel mit Überlappungs-Merging

```
Eingabe:  Tag 5, Tag 6, Tag 7 (gleicher Shift)

3-Tage pro Tag:
  Tag 5 → [4, 5, 6]
  Tag 6 → [5, 6, 7]
  Tag 7 → [6, 7, 8]

Nach Merge: [4, 5, 6, 7, 8] → 1 API-Call
```

---

## Copy/Paste Funktionalität

### Tastenkombinationen

| Taste | Funktion |
|-------|----------|
| `Ctrl+C` | Kopiert selektierte Zellen |
| `Ctrl+V` | Fügt Clipboard-Inhalt ein |
| `F2` | Öffnet Edit-Modus |
| `Delete` | Löscht selektierte Work-Einträge |

### Copy (Ctrl+C)

- **Spalten** durch Tab (`\t`) getrennt
- **Zeilen** durch Newline (`\r\n`) getrennt

### Paste Modi

**Modus 1 (Excel-Paste):** Grid-Daten ab Startposition einfügen

**Modus 2 (Multi-Fill):** Einzelwert in alle selektierten leeren Zellen

### Zell-Editing

| Aktion | Ergebnis |
|--------|----------|
| Einfacher Klick | Nur Selektion |
| Doppelklick | Edit-Modus |
| F2-Taste | Edit-Modus |
| Buchstabe tippen | Edit-Modus mit Zeichen |

---

## Fill Handle

### Funktionsweise

1. Bei einzeln selektierter, gefüllter Zelle erscheint kleiner Kreis rechts unten
2. Mit gedrückter Maustaste nach rechts ziehen
3. Beim Loslassen werden Shifts in alle validen Zellen kopiert

### Validierung beim Drop

| Prüfung | Verhalten |
|---------|-----------|
| Spalte sealed | Skip |
| Zelle bereits gefüllt | Skip |
| Shift nicht verfügbar | Skip |
| Kapazität überschritten | Skip |

---

## Context Menu

### Leere Zelle - Rechtsklick

| Menüpunkt | Aktion |
|-----------|--------|
| Einfügen (Ctr-V) | Fügt kopierten Shift ein |
| Dienste... | Öffnet Submenu mit verfügbaren Shifts |

### Dienste-Submenu

Zeigt alle verfügbaren Shifts für den angeklickten Tag:

```
[Icon] AB-MF          (14:00 - 22:00)
[Icon] BD             (00:00 - 00:00)
[Icon] CA100          (14:00 - 22:00)
```

**Format:**
- Icon basierend auf Shift-Typ (SVG)
- Abbreviation (min-width: 80px)
- Zeit in Klammern (kleinere Schrift, rechtsbündig)

### Shift-Typ Icons

| Bedingung | Icon | Komponente |
|-----------|------|------------|
| `shiftType === 1` | Container (Box) | `IconBoxContainerComponent` |
| `isSporadic` | Fragezeichen-Uhr | `IconUnknownTimeComponent` |
| `isTimeRange` | Pie-Uhr | `IconTimeWindowComponent` |
| Default | Viertel-Uhr | `IconShiftSegmentComponent` |

### MenuItem Erweiterungen

```typescript
interface IMenuItem {
  // ... bestehende Properties
  svgIcon: string | undefined;  // Inline SVG für Icon
  subText: string | undefined;  // Sekundärtext (kleiner, rechts)
}
```

### Gefüllte Zelle - Rechtsklick

| Menüpunkt | Aktion |
|-----------|--------|
| Kopieren (Ctr+C) | Kopiert Shift in Zwischenablage |
| Ausschneiden (Ctr+X) | Kopiert und löscht |
| Einfügen (Ctr-V) | Fügt kopierten Shift ein |
| Löschen (Delete) | Löscht den Work-Eintrag |
| In Dienst zeigen | Scrollt zur Shift-Section |

---

## Client Filter

### Shared Component

Der `ClientFilterComponent` ist eine wiederverwendbare Komponente für Filter-Dropdowns:

```
src/app/presentation/shared/client-filter/
├── client-filter.component.ts
├── client-filter.component.html
├── client-filter.component.scss
└── client-filter.interface.ts
```

### Verwendung

| Ansicht | Service | Filter-Objekt |
|---------|---------|---------------|
| Schedule | `DataManagementScheduleService` | `workFilter` |
| Absence-Gantt | `DataManagementBreakPlaceholderService` | `breakFilter` |

### IClientTypeFilter Interface

```typescript
export interface IClientTypeFilter {
  orderBy: string;           // 'name' | 'group' | 'hours'
  sortOrder: string;         // 'asc' | 'desc'
  showEmployees: boolean;    // Mitarbeiter anzeigen
  showExtern: boolean;       // Externe anzeigen
  hoursSortOrder: string | undefined;  // Sekundäre Sortierung nach Stunden
}
```

### Filter-Optionen

| Option | Beschreibung |
|--------|--------------|
| **Nachname** | Sortierung nach Client-Nachname |
| **Gruppenzugehörigkeit** | Sortierung nach Gruppenname |
| **Vertraglich garantierte Stunden** | Sortierung nach `Contract.GuaranteedHoursPerMonth` |
| **Mitarbeiter** | Checkbox - EntityTypeEnum.Employee (0) |
| **Externe** | Checkbox - EntityTypeEnum.ExternEmp (1) |

### Sortierung

- **Primäre Sortierung:** `orderBy` + `sortOrder`
- **Sekundäre Sortierung:** `hoursSortOrder` (unabhängig, als ThenBy)

```typescript
// Backend: WorkRepository.cs
query = ApplyOrderBy(query, filter, refDate);

if (!string.IsNullOrEmpty(filter.HoursSortOrder)) {
    query = filter.HoursSortOrder == "asc"
        ? query.ThenBy(...)
        : query.ThenByDescending(...);
}
```

---

## Changelog

### 30.01.2026 - WorkChange Dialoge (Korrektur & Ablösung)

**Neue Features:**

1. **Korrektur-Dialog:** Zeitkorrektur am Anfang/Ende einer Schicht erstellen
2. **Ablösung-Dialog:** Zeit an anderen Client übertragen (Replacement)

**Backend Änderungen:**

| Datei | Änderung |
|-------|----------|
| `WorkChangeClientResult.cs` | Neue DTO-Klasse mit `ClientId`, `PeriodHours`, `ScheduleEntries` |
| `WorkChangeResource.cs` | `PeriodHours`/`ScheduleEntries` entfernt → `ClientResults` Array |
| `PostCommandHandler.cs` | Gibt `ClientResults` Array zurück (1 bei Korrektur, 2 bei Ablösung) |
| `PutCommandHandler.cs` | Gleiche Änderung wie Post |
| `DeleteCommandHandler.cs` | Gleiche Änderung wie Post |

**Frontend Änderungen:**

| Datei | Änderung |
|-------|----------|
| `work-change.ts` | `WorkChangeClientResult` Interface hinzugefügt |
| `correction-dialog.component.ts` | Vollständiger Dialog mit Zeitauswahl |
| `replacement-dialog.component.ts` | Dialog mit Client-Auswahl |
| `schedule-entry-crud.service.ts` | `triggerScheduleRefresh()` ist jetzt public |
| `schedule-section.component.ts` | Context-Menü "Korrektur..." und "Ablösung..." |

**Wichtige Architektur-Details:**

1. **Response-Struktur:**
   - Korrektur: 1 `WorkChangeClientResult` im Array
   - Ablösung: 2 `WorkChangeClientResult` im Array (Original-Client + Ersatz-Client)

2. **UI-Refresh nach WorkChange:**
   - Dialoge müssen `scheduleEntryCrud.triggerScheduleRefresh()` aufrufen
   - NICHT `workScheduleLoader.isRead.set()` (falsches Signal!)
   - `triggerScheduleRefresh()` setzt `scheduleRefreshed` Signal
   - `DataManagementScheduleService` Effect reagiert darauf und setzt `isRead`

3. **Schedule-Update nach Create:**
   ```typescript
   for (const clientResult of response.clientResults) {
     if (clientResult.periodHours) {
       this.workScheduleLoader.periodHours.set(clientResult.clientId, clientResult.periodHours);
     }
     if (clientResult.scheduleEntries) {
       this.workScheduleLoader.replaceClientEntriesForDays(clientResult.clientId, startDate, endDate, clientResult.scheduleEntries);
     }
   }
   this.workScheduleLoader.updateClientNeededRows();
   this.scheduleEntryCrud.triggerScheduleRefresh();
   ```

**Noch zu erledigen (TODOs):**

- [ ] WorkChange Delete: Frontend UI-Refresh für beide Clients bei Ablösung testen
- [ ] Weitere Tests und Bugfixes nach Benutzer-Feedback

---

### 26.01.2026 - Break Entry Type & HH:mm Formatierung

**Neue Features:**

1. **Break Entry Type (Type = 3):**
   - Neuer Entry Type für Abwesenheiten (Urlaub, Krankheit, etc.)
   - `WorkScheduleEntryType.Break = 3` im Frontend Enum
   - Break-Einträge werden zusammen mit Work/WorkChange/Expenses angezeigt

2. **Feld-Umbenennung in `IScheduleCell`:**
   - `workId` → `sourceId` (generisch für Work und Break)
   - `shiftName` → `entryName` (generisch für Shift-Name oder Absence-Name)

3. **Row Header HH:mm Formatierung:**
   - `guaranteedHours`, `hours`, `surcharges` werden als HH:mm angezeigt
   - Neue Helper-Funktion `hoursToHHMM()` in `time-format.helper.ts`

**Betroffene Dateien:**

| Datei | Änderung |
|-------|----------|
| `work-schedule-class.ts` | `IScheduleCell`: `sourceId`, `entryName`; Enum: `Break = 3` |
| `work-schedule-crud.service.ts` | `DeleteWorkScheduleEntryParams.sourceId` |
| `schedule-data.service.ts` | Row Header: `hoursToHHMM` für HH:mm Format |
| `time-format.helper.ts` | Neue Funktion `hoursToHHMM(value: number): string` |
| `grid-template-events.directive.ts` | Lokale Type-Definitionen aktualisiert |

---

### 22.01.2026 - Surcharges Berechnung & Cache Invalidierung Fix

**Bug Fixes:**
- **Surcharges Berechnung:** `PeriodHoursService` und `WorkRepository` summieren jetzt `Work.Surcharges` (vorher nur `WorkChange.ChangeTime`)
- **Cache Invalidierung:** Bei Work CRUD werden jetzt ALLE `ClientPeriodHours`-Einträge für den betroffenen Client gelöscht, nicht nur der aktuelle Perioden-Eintrag
- **Surcharges Display:** Dritte Info-Zelle (Slot3) zeigt jetzt auch `0h` statt leerer String wenn `surcharges = 0`
- **Resize Race Condition:** `GridSurfaceTemplateComponent` speichert Resize-Events als "pending" wenn Canvas nicht bereit, statt sie zu ignorieren

**Betroffene Dateien:**
| Datei | Änderung |
|-------|----------|
| `PeriodHoursService.cs` | `CalculatePeriodHoursForClientsAsync()` summiert `Work.Surcharges` |
| `PeriodHoursService.cs` | `RecalculateAndNotifyAsync()` löscht andere Cache-Einträge vor Neuberechnung |
| `WorkRepository.cs` | `GetPeriodHoursForClients()` summiert `Work.Surcharges` |
| `schedule-data.service.ts` | `getRowHeaderSlot3Text()` zeigt auch `0h` |
| `grid-surface-template.component.ts` | `handleParentResize()` speichert pending resize |

**Surcharges Berechnung (korrigiert):**
```csharp
// Vorher: Nur WorkTime
.Select(g => new { ClientId = g.Key, TotalHours = g.Sum(w => w.WorkTime) })

// Nachher: WorkTime + Surcharges
.Select(g => new {
    ClientId = g.Key,
    TotalHours = g.Sum(w => w.WorkTime),
    TotalSurcharges = g.Sum(w => w.Surcharges)
})

// Ergebnis kombiniert Work.Surcharges + WorkChange.ChangeTime (wenn ToInvoice)
Surcharges = workData.Surcharges + workChangeSurcharges
```

**Cache Invalidierung (neu):**
```csharp
// Bei RecalculateAndNotifyAsync: Lösche alle anderen Cache-Einträge für diesen Client
var otherCacheEntries = await _context.ClientPeriodHours
    .Where(p => p.ClientId == clientId
        && (p.StartDate != startDate || p.EndDate != endDate))
    .ToListAsync();

if (otherCacheEntries.Count > 0)
{
    _context.ClientPeriodHours.RemoveRange(otherCacheEntries);
}
```

### 21.01.2026 - PeriodHours in Work CRUD Response

- `WorkResource` um `PeriodStart`, `PeriodEnd` und `PeriodHours` erweitert
- Frontend schickt `periodStart`/`periodEnd` bei Work CRUD-Operationen mit
- Backend gibt `periodHours` (Hours, Surcharges, GuaranteedHours) in HTTP-Response zurück
- DELETE verwendet Query-Parameter: `?periodStart=...&periodEnd=...`
- Repository-Methoden: `AddWithPeriodHours`, `PutWithPeriodHours`, `DeleteWithPeriodHours`
- `RecalculateAndNotifyAsync` verwendet jetzt explizite Periode statt Berechnung

### 03.01.2026 - ClientPeriodHours Refactoring

- `MonthlyClientHours` → `ClientPeriodHours` umbenannt
- `PaymentInterval` Enum hinzugefügt: Weekly, Biweekly, Monthly, Individual
- `Month` → `int?` (nullable), `WeekNumber` (`int?`) hinzugefügt
- `IndividualPeriodId` (`Guid?`) für benutzerdefinierte Perioden
- Neue Entities: `IndividualPeriod`, `Period`
- Filtered Unique Indexes für unterschiedliche PaymentIntervals
- Query Filter für Soft-Delete (Client.IsDeleted)
- Dokumentation erweitert mit Konzept-Erklärung und Beispielen

### 28.12.2025 - Context Menu "Dienste" Submenu

- "Dienste..." Submenu für leere Zellen im Schedule Context Menu
- Zeigt verfügbare Shifts für den angeklickten Tag
- SVG-Icons basierend auf Shift-Typ (Container, Sporadic, TimeRange, Standard)
- Zeit-Format: hh:mm in Klammern, kleinere Schrift, rechtsbündig
- MenuItem erweitert: `svgIcon` und `subText` Properties
- Submenu Scrollbar bei langen Listen
- Viewport-Overflow Fix für Submenus

### 28.12.2025 - Shared ClientFilterComponent + SignalR Resilience

- `ClientFilterComponent` in `presentation/shared/client-filter/` erstellt (DRY)
- Alte `schedule-filter` und `absence-gantt-filter` Komponenten gelöscht
- SignalR Service: Health Check + Retry Logik für robustere Verbindung
- Backend: `/health` Endpoint hinzugefügt
- Filter-Dropdown: Breite passt sich automatisch an Inhalt an
- Übersetzungen: "Stunden" → "Vertraglich garantierte Stunden", "MA" → "Mitarbeiter"

### 27.12.2025 - Dokumentation zusammengeführt

- WORK_PLANNING_DOCUMENTATION.md → hierher verschoben
- WORK_SCHEDULE_IMPLEMENTATION.md → hierher verschoben
- Works API, Monthly Client Hours aus CLAUDE_QUICKREF.md → hierher
- SignalR → separate Datei `Klacks.Api/SIGNALR_DOCUMENTATION.md`

### 26.12.2025 - Fill Handle + Copy/Paste + Bulk Delete

- Fill Handle für horizontales Kopieren
- Copy/Paste mit Multi-Fill-Modus
- Bulk Delete mit 3-Tage-Regel und Überlappungs-Merging
- WorkScheduleCrudService Refactoring

### 23.12.2025 - Scroll-Fix + Bulk Operations

- Scroll-Position bei CRUD beibehalten
- `POST /Works/Bulk`, `DELETE /Works/Bulk`
- `POST /Shifts/Schedule/Partial`

### 21.12.2025 - Verfügbare Shifts + Drag-Fix

- Rote Header-Schriftfarbe für verfügbare Shifts
- Drag/Selection Logik korrigiert

### 10.12.2025 - Horizontal Scroll Sync + Tab + Row Selection

- ScheduleHorizontalScrollService
- Bootstrap Tab-Container für Shift-Section
- GridSelectionModeEnum.RowActiveOnly

### 01.12.2025 - Monatsberechnung korrigiert

- 0-basiert vs 1-basiert Probleme behoben

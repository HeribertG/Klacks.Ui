# Schedule Documentation

**Erstellt:** 01.12.2025
**Betroffene Komponenten:** Schedule Section, Shift Section, Schedule Header

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
│   ScheduleSectionComponent │             │   ShiftSectionComponent   │
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

## Monatsberechnung (WICHTIG!)

### Konventionen

| Komponente | Monats-Basis | Beispiel Dezember |
|------------|--------------|-------------------|
| JavaScript `Date` | 0-basiert | 11 |
| JavaScript `getMonth()` | 0-basiert | 11 |
| `WorkFilter.currentMonth` | 1-basiert | 12 |
| `selectedMonth` | 1-basiert | 12 |
| `getDaysInMonth()` (date.helper) | 0-basiert | 11 |
| `monthsName[]` Array | 0-basiert | Index 11 |

### Korrekte Verwendung

#### In Data-Services (`schedule-data.service.ts`, `shift-data.service.ts`)

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

#### In Header-Calendar (`schedule-header-calendar.component.ts`)

```typescript
// 1-basiert initialisieren (konsistent mit WorkFilter)
selectedMonth: number = new Date().getMonth() + 1;
```

#### In HTML-Template (`schedule-header-calendar.component.html`)

```html
<!-- Option-Werte 1-basiert (i + 1) -->
@for (c of gridSettingsService.monthsName; track $index; let i = $index) {
  <option [ngValue]="i + 1" [selected]="i + 1 === selectedMonth">
    {{ c | translate }}
  </option>
}
```

#### In Header (`schedule-header.component.ts`)

```typescript
onCalendarReset(data: CalendarResetData) {
  // monthsName ist 0-basiert, selectedMonth ist 1-basiert → -1
  this.displayMonth = this.gridSettingsService.monthsName[data.selectedMonth - 1];
}
```

### Häufige Fehler

| Fehler | Symptom | Lösung |
|--------|---------|--------|
| `getDaysInMonth(year, currentMonth)` ohne -1 | Dezember gibt `undefined`, Canvas-Fehler | `currentMonth - 1` |
| `selectedMonth = getMonth()` ohne +1 | Inkonsistenz mit WorkFilter | `getMonth() + 1` |
| `[ngValue]="i"` ohne +1 | Falscher Monat wird gesetzt | `i + 1` |
| `monthsName[selectedMonth]` ohne -1 | Monatsname fehlt (Index out of bounds) | `selectedMonth - 1` |

---

## Dateien

| Datei | Zweck |
|-------|-------|
| `schedule-header.component.ts/html` | Header mit Monat/Jahr-Auswahl |
| `schedule-header-calendar.component.ts/html` | Dropdown für Monatsauswahl |
| `schedule-data.service.ts` | Daten-Service für Schedule-Section |
| `shift-data.service.ts` | Daten-Service für Shift-Section |
| `schedule-section.component.ts` | Beschäftigungs-Ansicht |
| `shift-section.component.ts` | Dienste-Ansicht |

---

## WorkFilter

Der `WorkFilter` steuert die Ansicht:

```typescript
// In schedule-class.ts
export class WorkFilter implements IWorkFilter {
  dayVisibleBeforeMonth = 10;    // Tage vor dem Monat
  dayVisibleAfterMonth = 10;     // Tage nach dem Monat
  currentMonth: number = new Date().getMonth() + 1;  // 1-basiert!
  currentYear: number = new Date().getFullYear();
}
```

---

## Feiertags-Integration

Die Feiertage werden über `HolidayCollectionService` geladen und in den Data-Services geprüft:

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

### Übersicht

Die Schedule-Section und Shift-Section teilen sich die horizontale Scroll-Position über den `ScheduleHorizontalScrollService`.

### Architektur

```
┌─ ScheduleHomeComponent ─────────────────────────────────────────────────┐
│  providers: [ ScheduleHorizontalScrollService ]  ← Shared Singleton     │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─ ScheduleSectionComponent ────────────────────────────────────────┐  │
│  │  WRITES: H-Scrollbar.valueChange → hScrollService.setPosition()   │  │
│  │  READS:  hScrollPositionEffect → hScrollbar.value = signal()      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                ↕ Signal (bidirectional)                  │
│  ┌─ ShiftSectionComponent ───────────────────────────────────────────┐  │
│  │  WRITES: (valueHScrollbar) → onHScrollChange → setPosition()      │  │
│  │  READS:  hScrollEffect → hScrollPositionValue = signal()          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dateien

| Datei | Zweck |
|-------|-------|
| `services/schedule-horizontal-scroll.service.ts` | Shared Service mit Angular Signals |
| `schedule-section.component.ts` | Schreibt H-Scrollbar Werte, liest Position für Keyboard-Nav |
| `shift-section.component.ts` | Liest Position, schreibt bei Keyboard-Navigation |

---

## Shift-Section Tab Component

### Übersicht

Die Shift-Section ist in einem Bootstrap-Tab-Container gewrapped.

### Struktur

```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────┐                                                 │
│ │ Dienste │        (var(--backgroundColorCard) background)  │
├─┴─────────┴─────────────────────────────────────────────────┤
│ [Content Header - 35px, gridColorService.controlBackGroundColor] │
├─────────────────────────────────────────────────────────────┤
│                    Grid-Inhalt (as-split)                   │
└─────────────────────────────────────────────────────────────┘
```

### i18n Übersetzungen

| Sprache | Key | Wert |
|---------|-----|------|
| Deutsch | `schedule.shift-section.tab.shifts` | Dienste |
| English | `schedule.shift-section.tab.shifts` | Shifts |
| Français | `schedule.shift-section.tab.shifts` | Services |
| Italiano | `schedule.shift-section.tab.shifts` | Turni |

### CSS Variables (Dark Mode Support)

- `--backgroundColorCard` - Tab Header Hintergrund
- `--colorLine` - Border-Farbe für Tab Header
- `--backgroundColoPagination` - Inaktiver Tab Hintergrund
- `--backgroundColoPaginationSelected` - Aktiver Tab Hintergrund

---

## Grid Selection Mode

### GridSelectionModeEnum

```typescript
// In enums/divers.ts
export enum GridSelectionModeEnum {
  Cell = 1,        // Standard: nur Zelle selektierbar
  Row = 2,         // Ganze Zeile wird markiert
  RowActiveOnly = 3  // Zeile wird nur markiert wenn Zelle aktiv ist
}
```

### RowActiveOnly Modus (Shift-Section)

Die Shift-Section verwendet `GridSelectionModeEnum.RowActiveOnly`:

- **Jede Zelle** kann selektiert werden
- **Zeilen-Highlight** wird nur angezeigt wenn die selektierte Zelle aktiv ist (Inhalt hat)
- **Multiselect** ist deaktiviert

### Implementierung

```typescript
// In shift-settings.service.ts
override selectionMode = GridSelectionModeEnum.RowActiveOnly;

// In grid-render.service.ts (drawGridSelectedCell)
const isRowMode = selectionMode === Row || selectionMode === RowActiveOnly;
const showRowHighlight = isRowMode &&
  (selectionMode !== RowActiveOnly || gridData.isCellActive(row, col));
```

### Row-Header Highlight

Der Row-Header der Shift-Section zeigt auch das Highlight:

```typescript
// In shift-draw-row-header.service.ts
private drawHighlightOnMainCanvas(ctx): void {
  if (!this.isSelectedRowActive) return;
  // Highlight auf MainCanvas (nicht RenderCanvas) für Cache-Konsistenz
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = this.gridColors.focusBorderColor;
  ctx.fillRect(0, yPosition, width, cellHeight);
  ctx.globalAlpha = 1.0;
}
```

**Wichtig:** Das Highlight wird auf dem **MainCanvas** gezeichnet, nicht auf dem RenderCanvas. So bleibt der RenderCanvas als Cache "rein" und Alpha-Werte addieren sich nicht auf.

### Dateien

| Datei | Zweck |
|-------|-------|
| `enums/divers.ts` | `GridSelectionModeEnum` Definition |
| `settings.service.ts` | Base-Klasse mit `selectionMode` Property |
| `shift-settings.service.ts` | Override zu `RowActiveOnly` |
| `grid-render.service.ts` | `drawGridSelectedCell()` mit Row-Highlight Logik |
| `draw-schedule.service.ts` | `isPositionValid()` für Zellen-Validierung |
| `schedule-template-events.directive.ts` | Multiselect-Block in Mouse-Events |
| `data.service.ts` | `isCellActive(row, col)` Methode |
| `shift-draw-row-header.service.ts` | Row-Header Highlight auf MainCanvas |

---

## Verfügbare Shifts Anzeige

### Übersicht

Die Header der Schedule-Section zeigen an, ob an einem Tag noch Shifts mit freier Kapazität verfügbar sind.

### Logik

- **Rote Schriftfarbe:** Es gibt noch verfügbare Shifts an diesem Tag
- **Standard Schriftfarbe:** Alle Shifts sind vollständig besetzt

Ein Shift gilt als verfügbar wenn: `engaged < sumEmployees * quantity`

### Implementierung

```typescript
// In data-management-schedule.service.ts
private _availableShiftsByDay = signal<readonly (readonly string[])[]>([]);

private buildAvailableShiftsByDay(): void {
  for (const shift of this.shiftSchedules) {
    const maxCapacity = shift.sumEmployees * shift.quantity;
    if (shift.engaged < maxCapacity) {
      result[dayIndex].push(shift.abbreviation);
    }
  }
}

// In schedule-data.service.ts
override getHeaderFontColor(column: number): string | null {
  const availableShifts = this.dataManagementSchedule.availableShiftsByDay;
  if (availableShifts[column]?.length > 0) {
    return 'red';
  }
  return null;
}
```

### Dateien

| Datei | Zweck |
|-------|-------|
| `data-management-schedule.service.ts` | `availableShiftsByDay` 2D-Array mit Shift-Abkürzungen |
| `schedule-data.service.ts` | `getHeaderFontColor()` Override für rote Schrift |
| `data.service.ts` | `getHeaderFontColor()` Base-Methode |
| `create-header.service.ts` | `chooseFontColor()` nutzt custom Farbe |

---

## Drag & Drop von Shifts

### Übersicht

Shifts können per Drag & Drop aus der Shift-Section in die Schedule-Section gezogen werden.

### Ablauf

1. **Mousedown** auf gefüllte Shift-Zelle → Zelle wird selektiert
2. **Nach Verzögerung** (DRAG_DELAY_MS) → Drag startet
3. **Mouseup vor Verzögerung** → Nur Selektion, kein Drag

### Implementierung

```typescript
// In schedule-template-events.directive.ts
@HostListener('mousedown', ['$event']) onMouseDown(event: MouseEvent): void {
  if (event.buttons === 1) {
    this.respondToLeftButtonMouseDown(event);  // Immer selektieren
    this.tryPrepareShiftDrag(event);           // Drag vorbereiten (verzögert)
  }
}

private tryPrepareShiftDrag(event: MouseEvent): void {
  // Nur für shift-section mit aktiver Zelle
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
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DataManagementScheduleService                           │
│  - Orchestriert alle Schedule-Operationen                                   │
│  - Delegiert CRUD an WorkScheduleCrudService                                │
│  - Hört auf Signals für UI-Refresh                                          │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ delegiert
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WorkScheduleCrudService                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Public Methods                                                       │    │
│  │  - addWorkScheduleEntry(params, workFilter)                         │    │
│  │  - deleteWorkScheduleEntry(params, workFilter)                      │    │
│  │  - bulkDeleteWorkScheduleEntries(entries[], workFilter)             │    │
│  │  - refreshClientScheduleForDays(clientId, centerDate)               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Signals                                                              │    │
│  │  - scheduleRefreshed: Signal<boolean>                               │    │
│  │  - shiftScheduleRefreshed: Signal<boolean>                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Private Helpers                                                      │    │
│  │  - refreshClientScheduleForDateRange()                              │    │
│  │  - updateShiftEngagedLocally()                                      │    │
│  │  - bulkUpdateShiftEngagedLocally()                                  │    │
│  │  - mergeOverlappingDateRanges()                                     │    │
│  │  - mergeClientDateRanges()                                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ API Calls
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WorkCrudService                                    │
│  - createWork(params): Promise<void>                                        │
│  - deleteWorkById(workId): Promise<void>                                    │
│  - bulkDeleteWorks(workIds[]): Promise<BulkWorksResponse>                   │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ HTTP
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DataScheduleService                                 │
│  - addWork(work): Observable                                                │
│  - deleteWork(id): Observable                                               │
│  - bulkDeleteWorks(workIds[]): Observable<BulkWorksResponse>                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Dateien

| Datei | Zweck |
|-------|-------|
| `work-schedule-crud.service.ts` | CRUD-Operationen + Refresh-Logik |
| `work-crud.service.ts` | API-Wrapper für Work-Operationen |
| `data-schedule.service.ts` | HTTP-Calls zum Backend |
| `data-management-schedule.service.ts` | Orchestrierung + UI-Signals |
| `work-schedule-loader.service.ts` | Lokale Daten-Updates |

---

## Workflow: Add Work

### Auslöser
- Drag & Drop eines Shifts auf eine leere Zelle in der Schedule-Section

### Ablauf

```
1. grid-template-events.directive.ts
   └─► handleShiftDrop() erkennt Drop-Target

2. DataManagementScheduleService.addWorkScheduleEntry(params)
   └─► delegiert an WorkScheduleCrudService

3. WorkScheduleCrudService.addWorkScheduleEntry(params, workFilter)
   │
   ├─► WorkCrudService.createWork(params)
   │   └─► POST /Works → Backend erstellt Work
   │
   ├─► Nach Erfolg: refreshClientScheduleForDays(clientId, date)
   │   └─► Lädt 3 Tage (date ± 1) für diesen Client
   │
   └─► updateShiftEngagedLocally(shiftId, date, +1)
       ├─► shift.engaged++ (lokal)
       ├─► availableShiftsCalc.calculate() → Header-Farben
       └─► shiftScheduleRefreshed.set(true) → Shift-Section refresh
```

### Sequence Diagram

```
User          Directive        DataMgmt       WorkScheduleCrud    WorkCrud      Backend
  │               │                │                │                │             │
  │──Drop Shift──►│                │                │                │             │
  │               │──addEntry()───►│                │                │             │
  │               │                │──addEntry()───►│                │             │
  │               │                │                │──createWork()─►│             │
  │               │                │                │                │──POST /Works►│
  │               │                │                │                │◄────200 OK──│
  │               │                │                │◄───resolve()───│             │
  │               │                │                │                              │
  │               │                │                │──refreshClient(3 Tage)──────►│
  │               │                │                │◄──────entries────────────────│
  │               │                │                │                              │
  │               │                │                │──updateShiftEngaged(+1)      │
  │               │                │◄──scheduleRefreshed Signal──│                 │
  │               │◄──isRead Signal│                │                              │
  │◄──UI Update───│                │                │                              │
```

---

## Workflow: Delete Work (Single)

### Auslöser
- Delete-Taste auf einer einzelnen selektierten Zelle

### Ablauf

```
1. grid-template-events.directive.ts
   └─► handleDeleteKey() → erkennt einzelne Selektion

2. DataManagementScheduleService.deleteWorkScheduleEntry(workId, clientId, date, shiftId)
   └─► delegiert an WorkScheduleCrudService

3. WorkScheduleCrudService.deleteWorkScheduleEntry(params, workFilter)
   │
   ├─► WorkCrudService.deleteWorkById(workId)
   │   └─► DELETE /Works/{id} → Backend löscht Work
   │
   ├─► Nach Erfolg: refreshClientScheduleForDays(clientId, date)
   │   └─► Lädt 3 Tage (date ± 1) für diesen Client
   │
   └─► updateShiftEngagedLocally(shiftId, date, -1)
       ├─► shift.engaged-- (lokal, min 0)
       ├─► availableShiftsCalc.calculate() → Header-Farben
       └─► shiftScheduleRefreshed.set(true) → Shift-Section refresh
```

---

## Workflow: Bulk Delete Works (Multi-Selection)

### Auslöser
- Delete-Taste wenn mehrere Zellen selektiert sind (via Maus-Drag)

### Ablauf

```
1. grid-template-events.directive.ts
   │
   ├─► handleDeleteKey()
   │   ├─► Sammelt alle Positionen aus PositionCollection
   │   ├─► Für jede Position: getDeleteInfoForPosition()
   │   │   └─► Holt workId, clientId, date, shiftId aus ScheduleDataService
   │   └─► Erstellt Array von DeleteWorkScheduleEntryParams
   │
   └─► DataManagementScheduleService.bulkDeleteWorkScheduleEntries(entries[])

2. WorkScheduleCrudService.bulkDeleteWorkScheduleEntries(entries[], workFilter)
   │
   ├─► Extrahiert workIds[] aus entries
   │
   ├─► WorkCrudService.bulkDeleteWorks(workIds[])
   │   └─► DELETE /Works/Bulk → Backend löscht alle Works
   │
   ├─► Nach Erfolg: 3-Tage-Regel mit Überlappungs-Merging
   │   │
   │   ├─► Gruppiert entries nach clientId + shiftId
   │   │   └─► Key: "${clientId}|${shiftId}"
   │   │
   │   ├─► Für jede Gruppe: mergeOverlappingDateRanges()
   │   │   └─► Wendet 3-Tage-Regel an, fasst Überlappungen zusammen
   │   │
   │   ├─► Sammelt alle Ranges pro Client
   │   │
   │   ├─► mergeClientDateRanges() für finale Zusammenfassung
   │   │   └─► Vermeidet doppelte API-Calls
   │   │
   │   └─► Für jeden Range: refreshClientScheduleForDateRange()
   │
   ├─► bulkUpdateShiftEngagedLocally(entries)
   │   ├─► Alle shift.engaged-- (in einem Durchlauf)
   │   ├─► availableShiftsCalc.calculate() (einmal)
   │   └─► shiftScheduleRefreshed.set(true) (einmal)
   │
   └─► workScheduleLoader.updateClientNeededRows()
```

### 3-Tage-Regel mit Überlappungs-Merging

Die 3-Tage-Regel (centerDate ± 1) wird **pro Shift** angewendet. Überlappende Bereiche werden zusammengefasst.

#### Beispiel 1: Works am gleichen Shift an Tagen 5, 6, 7

```
Eingabe:  Tag 5, Tag 6, Tag 7 (gleicher Shift)

3-Tage pro Tag:
  Tag 5 → [4, 5, 6]
  Tag 6 → [5, 6, 7]
  Tag 7 → [6, 7, 8]

Nach Merge: [4, 5, 6, 7, 8] → 1 API-Call
```

#### Beispiel 2: Works am gleichen Shift an Tagen 5 und 15

```
Eingabe:  Tag 5, Tag 15 (gleicher Shift)

3-Tage pro Tag:
  Tag 5  → [4, 5, 6]
  Tag 15 → [14, 15, 16]

Keine Überlappung → 2 separate API-Calls
```

#### Beispiel 3: Works an verschiedenen Shifts

```
Eingabe:
  - Shift A, Tag 5
  - Shift B, Tag 6
  - Shift A, Tag 6

Gruppierung nach Client+Shift:
  ClientX|ShiftA: [Tag 5, Tag 6] → merged zu [4-7]
  ClientX|ShiftB: [Tag 6]        → [5-7]

Nach Client-Merge (wenn Ranges überlappen):
  ClientX: [4-7] (zusammengefasst)
```

### Code: mergeOverlappingDateRanges()

```typescript
private mergeOverlappingDateRanges(sortedTimestamps: number[]): { start: Date; end: Date }[] {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const ranges: { start: Date; end: Date }[] = [];

  // Erster Bereich: timestamp ± 1 Tag
  let currentStart = new Date(sortedTimestamps[0] - ONE_DAY_MS);
  let currentEnd = new Date(sortedTimestamps[0] + ONE_DAY_MS);

  for (let i = 1; i < sortedTimestamps.length; i++) {
    const nextStart = new Date(sortedTimestamps[i] - ONE_DAY_MS);
    const nextEnd = new Date(sortedTimestamps[i] + ONE_DAY_MS);

    // Überlappung oder direkt angrenzend?
    if (nextStart.getTime() <= currentEnd.getTime() + ONE_DAY_MS) {
      // Merge: erweitere currentEnd
      currentEnd = nextEnd;
    } else {
      // Keine Überlappung: speichere aktuellen Range, starte neuen
      ranges.push({ start: currentStart, end: currentEnd });
      currentStart = nextStart;
      currentEnd = nextEnd;
    }
  }

  ranges.push({ start: currentStart, end: currentEnd });
  return ranges;
}
```

### Sequence Diagram (Bulk Delete)

```
User          Directive        DataMgmt       WorkScheduleCrud    WorkCrud      Backend
  │               │                │                │                │             │
  │──Delete Key──►│                │                │                │             │
  │  (n Zellen)   │                │                │                │             │
  │               │──bulkDelete()─►│                │                │             │
  │               │                │──bulkDelete()─►│                │             │
  │               │                │                │──bulkDelete()─►│             │
  │               │                │                │                │──DELETE Bulk►│
  │               │                │                │                │◄───response──│
  │               │                │                │◄───resolve()───│             │
  │               │                │                │                              │
  │               │                │                │ Berechne Ranges (3-Tage + Merge)
  │               │                │                │──refreshRange(Client1)──────►│
  │               │                │                │◄──────entries────────────────│
  │               │                │                │──refreshRange(Client1)──────►│
  │               │                │                │◄──────entries────────────────│
  │               │                │                │                              │
  │               │                │                │ bulkUpdateShiftEngaged(-1 pro entry)
  │               │                │                │ updateClientNeededRows()
  │               │                │◄──scheduleRefreshed Signal──│                 │
  │               │◄──isRead Signal│                │                              │
  │◄──UI Update───│                │                │                              │
```

---

## Refresh-Strategie

### Was wird geladen

| Szenario | Schedule-Section | Shift-Section |
|----------|------------------|---------------|
| Add (single) | 3 Tage, 1 Client | Lokal: engaged+1 |
| Delete (single) | 3 Tage, 1 Client | Lokal: engaged-1 |
| Bulk Delete | 3+ Tage (merged), n Clients | Lokal: engaged-n (batch) |

### Scroll-Position beibehalten

Bei partiellem Refresh wird die Scroll-Position beibehalten:

```typescript
// isRead Signal mit resetScroll Flag
this.isRead.set({ value: true, resetScroll: false });  // Bei CRUD
this.isRead.set({ value: true, resetScroll: true });   // Bei initialem Laden
```

---

## Bulk Work Operations (Backend)

### Übersicht

Das Backend unterstützt Bulk-Operationen für Works, um mehrere Einträge in einem Request zu verarbeiten.

### Endpoints

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `POST /Works/Bulk` | BulkAdd | Mehrere Works mit einem ShiftId erstellen |
| `DELETE /Works/Bulk` | BulkDelete | Mehrere Works anhand ihrer IDs löschen |
| `POST /Shifts/Schedule/Partial` | Partial Refresh | Nur bestimmte Shift/Date-Paare laden |

### BulkAddWorksRequest

```csharp
public class BulkAddWorksRequest
{
    public Guid ShiftId { get; set; }
    public decimal WorkTime { get; set; }
    public List<WorkEntry> Entries { get; set; } = [];
}

public class WorkEntry
{
    public Guid ClientId { get; set; }
    public DateTime CurrentDate { get; set; }
}
```

### BulkDeleteWorksRequest

```csharp
public class BulkDeleteWorksRequest
{
    public List<Guid> WorkIds { get; set; } = [];
}
```

### BulkWorksResponse

```csharp
public class BulkWorksResponse
{
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public List<Guid> CreatedIds { get; set; } = [];
    public List<Guid> DeletedIds { get; set; } = [];
    public List<ShiftDatePair> AffectedShifts { get; set; } = [];
}
```

### Partielles Shift-Refresh

Statt das gesamte Shift-Schedule neu zu laden, können spezifische Shift/Date-Paare aktualisiert werden:

```csharp
// ShiftSchedulePartialFilter
public class ShiftSchedulePartialFilter
{
    public List<ShiftDatePairFilter> ShiftDatePairs { get; set; } = [];
}

public class ShiftDatePairFilter
{
    public Guid ShiftId { get; set; }
    public DateTime Date { get; set; }
}
```

### Stored Procedure

Die neue `get_shift_schedule_partial()` Funktion lädt nur die angegebenen Shift/Date-Paare:

```sql
SELECT * FROM get_shift_schedule_partial(
    ARRAY[
        ('shift-uuid-1'::UUID, '2025-01-15'::DATE),
        ('shift-uuid-2'::UUID, '2025-01-16'::DATE)
    ]::shift_date_pair[]
);
```

### Dateien (Backend)

| Datei | Zweck |
|-------|-------|
| `BulkAddWorksRequest.cs` | DTO für Bulk Add |
| `BulkDeleteWorksRequest.cs` | DTO für Bulk Delete |
| `BulkWorksResponse.cs` | Response mit AffectedShifts |
| `ShiftSchedulePartialFilter.cs` | Filter für partielles Refresh |
| `BulkAddWorksCommandHandler.cs` | Handler für Bulk Add |
| `BulkDeleteWorksCommandHandler.cs` | Handler für Bulk Delete |
| `GetShiftSchedulePartialQueryHandler.cs` | Handler für partielles Shift-Refresh |
| `WorksController.cs` | Endpoints `/Bulk` |
| `ShiftsController.cs` | Endpoint `/Schedule/Partial` |
| `GetShiftSchedule.sql` | SP `get_shift_schedule_partial()` |

---

## Changelog

### 26.12.2025 - Bulk Delete + WorkScheduleCrudService Refactoring

**Neue Features:**
- Multi-Selection Delete mit Delete-Taste
- Bulk Delete API-Integration (`DELETE /Works/Bulk`)
- 3-Tage-Regel mit intelligenter Überlappungs-Zusammenfassung

**Refactoring:**
- Neuer `WorkScheduleCrudService` für zentralisierte CRUD-Operationen
- `DataManagementScheduleService` delegiert jetzt an `WorkScheduleCrudService`
- Signals für UI-Refresh (`scheduleRefreshed`, `shiftScheduleRefreshed`)

**Betroffene Dateien:**
- `work-schedule-crud.service.ts` - NEU
- `data-management-schedule.service.ts` - Refactored, delegiert an neuen Service
- `work-crud.service.ts` - `bulkDeleteWorks()` hinzugefügt
- `data-schedule.service.ts` - `bulkDeleteWorks()` API-Methode
- `work-schedule-loader.service.ts` - `updateClientNeededRows()` public
- `grid-template-events.directive.ts` - Multi-Selection Delete Handler

### 23.12.2025 - Scroll-Fix + Bulk Operations

**Bugfixes:**
- Scroll-Position wird bei addRow/deleteRow nicht mehr zurückgesetzt
- `isRead` Signal erweitert zu Objekt mit `resetScroll` Flag

**Neue Backend-Features:**
- `POST /Works/Bulk` - Bulk Add Works (ein ShiftId, mehrere Client/Date-Paare)
- `DELETE /Works/Bulk` - Bulk Delete Works (Array von WorkIds)
- `POST /Shifts/Schedule/Partial` - Partielles Shift-Refresh (Array von ShiftId/Date-Paaren)
- Neue Stored Procedure `get_shift_schedule_partial()`

**Betroffene Dateien:**
- `data-management-schedule.service.ts` - isRead Signal erweitert
- `schedule-section.component.ts` - dataReadEffect nutzt resetScroll
- `BulkAddWorksRequest.cs`, `BulkDeleteWorksRequest.cs` - Neue DTOs
- `BulkAddWorksCommandHandler.cs`, `BulkDeleteWorksCommandHandler.cs` - Handler
- `WorksController.cs` - Bulk Endpoints
- `ShiftsController.cs` - Schedule/Partial Endpoint
- `GetShiftSchedule.sql` - Neue SP

### 21.12.2025 - Verfügbare Shifts + Drag-Fix

**Neue Features:**
- Rote Header-Schriftfarbe wenn Shifts nicht vollständig besetzt
- `availableShiftsByDay` 2D-Array für verfügbare Shifts pro Tag

**Bugfixes:**
- Zell-Selektion in Shift-Section funktioniert wieder
- Horizontales Scrollen zwischen Sektionen synchronisiert korrekt

**Betroffene Dateien:**
- `data-management-schedule.service.ts` - availableShiftsByDay Signal
- `schedule-data.service.ts` - getHeaderFontColor() Override
- `data.service.ts` - getHeaderFontColor() Base-Methode
- `create-header.service.ts` - chooseFontColor() nutzt custom Farbe
- `schedule-template-events.directive.ts` - Drag/Selection Logik korrigiert
- `schedule-section.component.ts` - lock() entfernt

### 10.12.2025 - Horizontal Scroll Sync + Tab + Row Selection

**Neue Features:**
- `ScheduleHorizontalScrollService` für bidirektionale Scroll-Synchronisierung
- Bootstrap Tab-Container für Shift-Section mit i18n
- `GridSelectionModeEnum.RowActiveOnly` für Shift-Section
- Row-Header Highlight bei aktiver Zellen-Selektion

**Betroffene Dateien:**
- `services/schedule-horizontal-scroll.service.ts` - NEU
- `shift-section.component.ts/html/scss` - Tab + Scroll + Position Effect
- `schedule-section.component.ts` - Scroll Sync + Lock-Mechanismus
- `schedule-shift-row-header.component.ts` - selectedRow/isSelectedRowActive Inputs
- `shift-draw-row-header.service.ts` - Row-Header Highlight
- `enums/divers.ts` - RowActiveOnly enum
- `settings.service.ts` - selectionMode Property
- `shift-settings.service.ts` - RowActiveOnly Override
- `grid-render.service.ts` - Row Highlight Logik
- `schedule-template-events.directive.ts` - Multiselect-Block in Mouse-Events
- `data.service.ts` - isCellActive() Methode
- `assets/i18n/*.json` - Tab Übersetzungen

### 01.12.2025 - Monatsberechnung korrigiert

**Problem:** Dezember-Feiertage wurden im November angezeigt, Monatsname fehlte.

**Betroffene Dateien:**
- `schedule-data.service.ts` - `getDaysInMonth(currentYear, currentMonth - 1)`
- `shift-data.service.ts` - `getDaysInMonth(currentYear, currentMonth - 1)`
- `schedule-header-calendar.component.ts` - `selectedMonth = getMonth() + 1`
- `schedule-header-calendar.component.html` - `[ngValue]="i + 1"`
- `schedule-header.component.ts` - `monthsName[selectedMonth - 1]`

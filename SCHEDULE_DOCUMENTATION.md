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

### Lock-Mechanismus

Der Service hat einen Lock-Mechanismus um Race-Conditions beim Initialisieren zu verhindern:

```typescript
// In schedule-section.component.ts
ngOnInit() {
  this.hScrollService.lock();  // Blockiert setPosition() während Init
}

onBothGridsReady() {
  this.hScrollService.forceSetPosition(dayVisibleBeforeMonth);  // Bypasses Lock
  setTimeout(() => this.hScrollService.unlock(), 500);
}
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

## Changelog

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

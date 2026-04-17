# Schedule Timeline View — Architektur, Implementierung und Lessons Learned

Datum: 2026-04-17 (aktualisiert)

Zweite Visualisierung des Einsatzplans neben der Tabellenansicht. Zeigt je Client genau eine Zeile in 6-facher Zellenhöhe (300px bei Zoom=1), einen vertikalen 24h-Ruler im Row-Header und rendert Work/Break/Expenses pro Tag als 3D-Blöcke auf einem 00:00–24:00 Zeitstrahl. ScheduleNote und ScheduleCommand werden nicht dargestellt.

## Ergebnis in Kurzform

- Zwei separate Timeline-Komponenten (`ScheduleTimelineRowHeaderComponent`, `GridSurfaceTimelineTemplateComponent`), komplett eigenständig (kein `extends`).
- Eine schlanke Timeline-Events-Directive (`TimelineGridEventsDirective`) ohne Component-Injection.
- Rendering-Logik per `extends` der Base-Services wiederverwendet: `TimelineCreateRowHeaderService extends BaseCreateRowHeaderService`, `TimelineCreateCellService extends BaseCreateCellService`.
- Umschaltung via `BaseSettingsService.setTimelineMode(enabled)` (Signal `timelineMode` + Plain-Bool `_isTimelineMode` + automatische `cellHeight`-Berechnung).
- `ScheduleSectionComponent.viewMode` Signal (`'table' | 'timeline'`) mit Toggle-Button.

## Dateistruktur

```
Klacks.Ui/src/app/presentation/workplace/schedule/schedule-section/timeline/
├── directives/
│   └── timeline-grid-events.directive.ts
├── grid-surface-timeline-template/
│   └── grid-surface-timeline-template.component.ts
├── schedule-timeline-row-header/
│   ├── schedule-timeline-row-header.component.ts
│   ├── schedule-timeline-row-header.component.html
│   └── schedule-timeline-row-header.component.scss
├── services/
│   ├── timeline-create-cell.service.ts
│   └── timeline-create-row-header.service.ts
└── TIMELINE_VIEW_DOCUMENTATION.md
```

## Architekturprinzip

Der User-Vorgabe entsprechend: **separate Komponenten** (Single Responsibility — Table und Timeline sind zwei unterschiedliche Anzeigearten) aber **alle Services, Klassen und Helpers werden wiederverwendet**:

- Draw-Engines: `BaseDrawRowHeaderService`, `BaseDrawScheduleService` (1:1)
- Data: `BaseDataService`, `BaseSettingsService`, `ScheduleDataService`, `DataManagementScheduleService`
- Rendering: `TimeRulerRenderService`, `TimeRangeService`, `GridColorService`, `GridFontsService`, `DrawHelper`
- Schedule: `WorkScheduleLoaderService`, `ScheduleChangeService`
- Scroll: `ScrollService`, `ScrollEventService`
- Helpers: `GridRowHeader`, `OwnTime`, `Rectangle`, Enums

Nur die „Renderer" werden spezialisiert (Cell-Create, RowHeader-Create) — per Inheritance (`extends`) auf Service-Ebene, nicht auf Component-Ebene.

## DI-Architektur (CRITICAL)

### BaseSettingsService — EINE Instanz

`BaseSettingsService` wird NUR in `ScheduleHomeComponent.providers` bereitgestellt. `ScheduleSectionComponent` hat KEINEN eigenen Provider dafür. Dadurch teilen sich Section, RowHeader, Surface und `ScheduleDataService` dieselbe Instanz.

**WARNUNG**: Wenn `BaseSettingsService` zusätzlich in Section-Providers aufgenommen wird, entsteht eine Dual-Instance → `isTimelineMode` in `ScheduleDataService` sieht den falschen Wert → `initializeGroupIndices` berechnet falsches Grid-Layout → Infinite-Loop im drawGrid.

### TimelineCreateCellService — Direct ScheduleDataService Inject

`TimelineCreateCellService` injectet `ScheduleDataService` direkt:
```typescript
private scheduleData = inject(ScheduleDataService);
```
`ScheduleHomeComponent.providers` registriert beide DI-Tokens auf derselben Instanz:
```typescript
{ provide: BaseDataService, useClass: ScheduleDataService },
{ provide: ScheduleDataService, useExisting: BaseDataService },
```
Das zweite `useExisting`-Alias ist der Grund, dass `inject(ScheduleDataService)` ohne NG0201 funktioniert und keine `as`-Casts nötig sind. Wird der Alias entfernt, kehrt NG0201 zurück — der alte Code-Smell `inject(BaseDataService) as ScheduleDataService` war genau dieses Symptom.

## BaseSettingsService — Dual State (Signal + Plain Bool)

```typescript
public timelineMode = signal<boolean>(false);   // Für reactive Effects (UI-Binding)
private _isTimelineMode = false;                 // Für synchrone Reads in Draw-Methoden

public get isTimelineMode(): boolean {
  return this._isTimelineMode;
}
```

**WARNUNG**: `_isTimelineMode` existiert aus einem zwingenden Grund. Wenn `getGroupLineHeight()`, `getDisplayRows()` oder `initializeGroupIndices()` das Signal `timelineMode()` lesen würden statt den Plain-Bool, koppeln sie sich reaktiv an das Signal. Da diese Methoden innerhalb von Angular-Effects aufgerufen werden (via `setMetrics()` → `refreshSignal`), entsteht eine Signal-Chain die den Browser einfriert.

```typescript
getDisplayRows(neededRows: number): number {
  return this._isTimelineMode ? 1 : neededRows;  // NICHT timelineMode()!
}
```

## Toggle-Logik (CRITICAL)

Der View-Mode-Wechsel erfolgt **imperativ** in `toggleViewMode()`, NICHT reaktiv im Effect:

```typescript
public toggleViewMode(): void {
  const newMode = this.viewMode() === 'table' ? 'timeline' : 'table';
  this.settings.setTimelineMode(newMode === 'timeline');
  this.scheduleService.setMetrics();   // Grid-Struktur sofort neu aufbauen
  this.viewMode.set(newMode);          // DANACH Signal setzen → Template wechselt
}
```

**WARNUNG**: `setMetrics()` darf NICHT innerhalb eines `effect()` mit `allowSignalWrites` aufgerufen werden. `setMetrics` setzt `refreshSignal` → triggert andere Effects → Signal-Write-Chain → Freeze.

Der `viewModeEffect` im `ngOnInit` macht nur:
- `setTimelineMode()` (cellHeight aktualisieren)
- `isRead.update()` (Refresh triggern)

Er ruft NICHT `setMetrics()` auf.

## Grid-Layout im Timeline-Mode

- `initializeGroupIndices()` → `getDisplayRows(client.displayRows)` → **1 Row pro Client**
- `rows` = Anzahl Clients (nicht clients × displayRows)
- `cellHeight` = `TABLE_CELL_HEIGHT × TIMELINE_CELL_HEIGHT_MULTIPLIER` = 50 × 6 = 300px
- `getGroupLineHeight(neededRows)` → `cellHeight × 1` (neededRows wird ignoriert) → **alle Clients gleich hoch**

## Row-Header Rendering

`TimelineCreateRowHeaderService.createCell(row, width)`:

1. Ruft `super.createCell(row, width - TIMELINE_RULER_WIDTH)` → Base-Canvas mit Client-Info + Info-Spots.
2. Erzeugt `composedCanvas` mit voller `width` via `DrawHelper.createHiDPICanvas`.
3. Zeichnet Base-Canvas links (bzw. rechts bei RTL).
4. Füllt Ruler-Bereich mit `gridColors.backGroundColor`.
5. Zeichnet `TimeRulerRenderService.drawTimeRuler` (Standard-Padding 30min).
6. Zeichnet Ruler-Borders (oben + Innenkante).
7. Ersetzt `baseCell.img` mit composedCanvas.

Konstanten: `TIMELINE_RULER_WIDTH = 55`, `TIMELINE_RULER_BORDER_WIDTH = 1`.

## Cell Rendering

`TimelineCreateCellService.createCell(row, col)`:

1. Ruft `super.createCell(row, col)` → Background-Canvas.
2. Prüft `isFirstGroupRow(row)` → nur die erste Row der Client-Gruppe bekommt Blöcke.
3. Holt Entries via `scheduleData.getWorkScheduleForCell(row, col)` und filtert auf Work/WorkChange/Break/Expenses.
4. Nutzt `timeToMinutes()` aus `time-format.helper.ts` für Zeit-Parsing.
5. Zeichnet Blöcke mit `DrawHelper.fillRectangle` + `Gradient3DBorderStyleEnum.Raised`.

## drawGrid Loop — correctedRow Fix

In `BaseDrawRowHeaderService.drawGrid`:
```typescript
const correctedRow = this.addCells(tmpRow, row);
if (!isDefined(correctedRow)) {
  break;
}
```
`isDefined<T>` liegt in `shared/helpers/type-guard.helper.ts` und schützt explizit vor der Falle `!correctedRow` (weil Row 0 falsy ist — der Loop bricht sonst nach dem ersten Client ab). Der Helper ist projektweit verfügbar und wird überall dort eingesetzt, wo nullable Numbers geprüft werden müssen.

## currentSurface — Signal + `withSurface` Helper

`currentSurface` ist ein `computed` Signal:
```typescript
private currentSurface = computed<ActiveSurface | undefined>(() =>
  this.viewMode() === 'table' ? this.scheduleSurface() : this.timelineSurface(),
);
```
`scheduleSurface` und `timelineSurface` sind signalbasierte `viewChild()`-Queries (Angular 21). Beim View-Mode-Wechsel ist die alte Surface destroyed und die neue noch nicht gemountet → das Signal liefert `undefined`, bis Angular den View-Query auflöst.

Statt manueller `if (!this.currentSurface) return`-Guards wird ein `withSurface`-Helper verwendet:
```typescript
private withSurface(action: (surface: ActiveSurface) => void): void {
  const surface = this.currentSurface();
  if (surface) {
    action(surface);
  }
}
```
Alle Effects (Refresh, PeriodHours, ColorReset, etc.) rufen `this.withSurface(s => s.Refresh(...))` auf — der Guard ist an einer Stelle zentralisiert. Der Hovered-Cell-Effect ist explizit auf `scheduleSurface` (Table-Mode) beschränkt, weil der Tooltip-Service API-Methoden der Timeline-Surface nicht kennt.

## NG0919 — Zirkularitäts-Vermeidung

Timeline-Components dürfen weder `GridTemplateEventsDirective`, `GridScheduleEventsService`, `GridFillHandleDragService` noch `CellInputEventsDirective` verwenden — alle diese injizieren `GridSurfaceTemplateComponent` und reaktivieren den preexistierenden Circular, wenn ein zweiter Einstieg dazukommt. Stattdessen: eigene schlanke `TimelineGridEventsDirective` ohne Component-Inject.

## Symptome zum Erkennen

- **Browser friert ein ohne Error**: Signal-Chain. Prüfe ob `timelineMode()` Signal (statt `_isTimelineMode` Bool) in einer Draw-Methode gelesen wird, oder ob `setMetrics()` innerhalb eines Effects aufgerufen wird.
- **Nur 1 Client gezeichnet, Loop hängt bei row=1**: `!correctedRow` statt `=== undefined`.
- **`NG0201` bei TimelineCreateCellService**: `inject(ScheduleDataService)` statt `inject(BaseDataService)`.
- **`destroyToolTip` TypeError**: `currentSurface` undefined → Guard fehlt.
- **`isTimelineMode = false` obwohl `setTimelineMode(true)` gerufen**: Zwei verschiedene `BaseSettingsService`-Instanzen (Section + Home). Section darf KEINEN eigenen Provider haben.
- **Row-Header komplett leer**: Canvas-ID mismatch. Timeline-Row-Header MUSS `id="scheduleRowCanvas"` verwenden (gleiche ID wie Table), weil `BaseDrawRowHeaderService.createCanvas()` diese ID hart sucht.
- **Ruler-Skala passt nicht zu Block-Positionen**: unterschiedliche Padding-Werte. Row-Header nutzt Standard-Padding (30min via `drawTimeRuler` default), Cell-Service muss identische Berechnung verwenden.

## Referenz-Dateien

- `settings.service.ts` — `timelineMode`, `_isTimelineMode`, `setTimelineMode()`, `computeCellHeight()`, `getDisplayRows()`, `getGroupLineHeight()`
- `schedule-section.component.ts` — `viewMode`, `toggleViewMode()`, `currentSurface`, `scheduleService` getter, `wireHoveredCellEffect` guard
- `schedule-data.service.ts` — `initializeGroupIndices()` mit `getDisplayRows()`
- `create-row-header.service.ts` — `calculateRowProperties()` mit `getDisplayRows()`
- `draw-row-header.service.ts` — `correctedRow === undefined` Fix
- `time-ruler-render.service.ts` — `drawTimeRuler()` mit optionalem `paddingMinutesOverride`

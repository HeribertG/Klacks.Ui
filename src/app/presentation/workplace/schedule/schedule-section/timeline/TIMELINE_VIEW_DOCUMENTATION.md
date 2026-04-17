# Schedule Timeline View — Architektur, Implementierung und Lessons Learned

Datum: 2026-04-17 (aktualisiert)

Zweite Visualisierung des Einsatzplans neben der Tabellenansicht. Zeigt je Client genau eine Zeile in 6-facher Zellenhöhe (300px bei Zoom=1), einen vertikalen 24h-Ruler im Row-Header und rendert **Work / WorkChange / Break** pro Tag als Rechteck-Blöcke auf einem 00:00–24:00 Zeitstrahl. Nur **Work** bekommt einen 3D-Raised-Border (Depth 2); WorkChange (Briefing-Blau `rgb(149,185,208)`) und Break (Holiday-Gelb) sind flach gefüllt. Expenses, ScheduleNote und ScheduleCommand werden nicht dargestellt. Der Zellen-Hintergrund ist in einen Cache gelegt und hat 1h-Stripes (gerade Stunden leicht dunkler) plus einen dunklen Column-Separator rechts. Die Cell-Texte der Table-Variante werden explizit unterdrückt.

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

`TimelineCreateCellService` baut den Hintergrund-Canvas **komplett selbst** auf (ohne `super.getCellCanvas()`) und liefert ihn via `override getCellCanvas(weekDay, lastRow, isOverlay)` aus einem eigenen Cache (`stripedCellCache[20]`, 5 Wochentage × lastRow × overlay). `buildTimelineCellCanvas` erzeugt ein frisches HiDPI-Canvas via `DrawHelper.createHiDPICanvas` und zeichnet in logical Koordinaten:

1. Full fill mit `getTimelineBaseColor(weekDay, isOverlay)` (Workday / Saturday / Sunday / Holiday / OfficiallyHoliday; Overlay → `GetDarkColor(..., 30)`).
2. `drawHourStripes` — 1h-Streifen der geraden Stunden in `GetDarkColor(baseColor, 12)`. Y-Rechnung nutzt **dieselbe `cachedRange`** wie die Block-Rendering-Logik (30min padding top/bottom, 1500 Minuten Total), sodass Streifen-Grenzen exakt unter den Ruler-Markern sitzen.
3. `drawCellOutline` — 0.5px Stroke-Rectangle in `borderColor` (dünne Zellenumrandung).
4. `drawRowSeparator` (nur wenn `isLast`) — Linie in `boundaryBorderColor` bei `Y=cellHeight` logical. **NICHT** bei `Y=cellHeight / pixelRatio()` wie im `BaseCreateCellService.fillEmptyCell`; die Base-Variante setzt die Linie auf HiDPI (`dpr≥2`) in die Mitte der Zelle — in Timeline mit 1 Row/Client fällt das als horizontale Linie bei 12:00 Ruler-Höhe quer durch jede Zelle sofort auf.
5. `drawColumnSeparator` — 1px Füllung rechts in `GetDarkColor(borderColor, 80)` für klar sichtbare Tages-Spalten.

`createCell(row, col)` nutzt dann `super.createCell()` (das holt den gecachten Canvas und legt ihn via `drawImage` auf ein `tempCanvas`) und zeichnet nur noch die Work/WorkChange/Break-Blöcke darüber. Filter in `isTimelineEntry`: Work, WorkChange, Break — **nicht** Expenses. Block-Farben: Work → `controlBackGroundColor`, WorkChange → `rgb(149,185,208)` (Briefing aus TimeRuler), Break → `backGroundColorHolyday`. Nur Work zeichnet zusätzlich den 3D-Border (`Gradient3DBorderStyleEnum.Raised`, Depth 2); der `h`-Parameter von `DrawHelper.drawBorder` ist absolute Y (nicht Höhe) — immer `yStart + blockHeight` übergeben.

`drawCellTexts` ist als No-Op overridden, sonst würde `super.createCell()` den Table-Style-Cell-Text („AB-MF / 8h / 14:00-22:00") oben in die Zelle rendern.

## HiDPI — drawImage + dpr-Detection

Der Base-Pfad `BaseCreateCellService.drawImage` ruft `ctx.drawImage(img, 0, 0)` **ohne** destination-size. Auf HiDPI-Displays (`dpr ≥ 2`) hat das Source-Canvas logical×dpr physical pixels; der Default-Dest-Modus interpretiert diese Zahl als logical Destination-Grösse und zeichnet den gecachten Canvas um Faktor dpr zu gross. Der Ruler wird dagegen im Row-Header mit expliziter `drawImage(..., logicalWidth, logicalHeight)` gerendert — daher driftet die Cell-Seite auf HiDPI vom Ruler weg (Streifen ~6-12px verschoben).

Fix im `TimelineCreateCellService`:
```typescript
override drawImage(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement): void {
  const dpr = DrawHelper.pixelRatio();
  ctx.drawImage(img, 0, 0, img.width / dpr, img.height / dpr);
}
```

**Pixel-Ratio-Detection** in Timeline-Surface und Timeline-Row-Header analog zum Tabular `GridSurfaceTemplateComponent.checkPixelRatio()`: ein `pixelRatio`-Feld wird in `ngOnInit` mit `DrawHelper.pixelRatio()` gesetzt; der ResizeObserver (Surface) bzw. `onResize` (Row-Header) vergleicht vor jedem Refresh mit dem aktuellen Wert. Bei Unterschied: `createCanvas() + rebuild() + redraw()`. `rebuild()` wiederum ruft `createCellService.reset()` / `createRowHeader.reset()`, die den Cell-Cache bzw. die `backgroundCollection` leeren. **Wichtig:** `BaseCreateRowHeaderService.reset()` wurde erweitert, damit `backgroundCollection.clear()` bei jedem Rebuild ausgeführt wird — sonst werden dpr-alte Canvases nach einem DPI-Wechsel weiterverwendet.

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
- **Nur 1 Client gezeichnet, Loop hängt bei row=1**: `!correctedRow` statt `isDefined(correctedRow)` im Row-Loop — Row 0 ist falsy.
- **`NG0201` bei TimelineCreateCellService**: Das `useExisting`-Alias in `ScheduleHomeComponent.providers` fehlt; `inject(ScheduleDataService)` fällt durch.
- **`destroyToolTip` TypeError**: Surface kurz nach View-Switch `undefined` — `withSurface()` fehlt oder Effect setzt nicht korrekt auf das aktive Surface auf.
- **Surface komplett dunkel / dunkelblau, Header sichtbar**: Host-Element der Surface-Component ohne `display: block; width/height: 100%`. Canvas rendert mit Grösse 0, `--gridContainerBackground` scheint durch. Fix im `schedule-section.component.scss`: beide Surfaces (`app-grid-surface-template, app-grid-surface-timeline-template`) auf Block mit voller Grösse setzen.
- **`isTimelineMode = false` obwohl `setTimelineMode(true)` gerufen**: Zwei verschiedene `BaseSettingsService`-Instanzen (Section + Home). Section darf KEINEN eigenen Provider haben.
- **Row-Header komplett leer**: Canvas-ID mismatch. Timeline-Row-Header MUSS `id="scheduleRowCanvas"` verwenden (gleiche ID wie Table), weil `BaseDrawRowHeaderService.createCanvas()` diese ID hart sucht.
- **Ruler-Skala passt nicht zu Block-Positionen**: unterschiedliche Padding-Werte. Row-Header nutzt Standard-Padding (30min via `drawTimeRuler` default), Cell-Service muss identische Berechnung verwenden.
- **Streifen / Blöcke ~dpr×versetzt gegenüber Ruler auf HiDPI**: `BaseCreateCellService.drawImage` ruft `ctx.drawImage(img, 0, 0)` ohne dest-size — Cached Canvas wird um `dpr` zu gross gerendert. Fix: `override drawImage` mit expliziter Dest-Grösse `img.width / dpr, img.height / dpr`.
- **Horizontale Linie quer durch jede Client-Row bei 12:00**: `BaseCreateCellService.fillEmptyCell` rechnet `h = height / DrawHelper.pixelRatio()` für den lastRow-Boundary — auf dpr=2 landet das in der Mitte. Fix: Timeline-Cell-Canvas komplett selbst aufbauen (eigener `buildTimelineCellCanvas`), Linie explizit bei `Y = cellHeight` logical zeichnen.
- **Streifen / Row-Separator bleiben nach Monitor-/Zoom-Wechsel falsch**: PixelRatio-Wechsel nicht detektiert. Sowohl Timeline-Surface als auch Timeline-Row-Header brauchen `private pixelRatio`-Feld + `checkPixelRatio()` im Resize-Callback, das bei Änderung `createCanvas + rebuild + redraw` triggert. Zusätzlich muss `BaseCreateRowHeaderService.reset()` die `backgroundCollection` leeren, sonst hält der Row-Header alte dpr-Canvases.

## Referenz-Dateien

- `timeline/services/timeline-create-cell.service.ts` — `buildTimelineCellCanvas`, `drawHourStripes`, `drawRowSeparator`, `drawColumnSeparator`, `override drawImage` (HiDPI-1:1), `override getCellCanvas` (eigener Cache), `override drawCellTexts` (No-Op), Block-Rendering
- `timeline/grid-surface-timeline-template/grid-surface-timeline-template.component.ts` — `private pixelRatio`, `checkPixelRatio()` im ResizeObserver
- `timeline/schedule-timeline-row-header/schedule-timeline-row-header.component.ts` — `private pixelRatio`, `checkPixelRatio()` im `onResize`
- `schedule-section/services/create-row-header.service.ts` — `reset()` mit `backgroundCollection.clear()` für pixelRatio-Invalidierung
- `settings.service.ts` — `timelineMode`, `_isTimelineMode`, `setTimelineMode()`, `computeCellHeight()`, `getDisplayRows()`, `getGroupLineHeight()`
- `schedule-section.component.ts` — `viewMode`, `toggleViewMode()`, `currentSurface` (computed), `withSurface()` Helper, `wireHoveredCellEffect` auf Table-Mode beschränkt
- `schedule-section.component.scss` — `app-grid-surface-template, app-grid-surface-timeline-template { display: block; width: 100%; height: 100%; }`
- `schedule-home.component.ts` — `providers: [{ provide: BaseDataService, useClass: ScheduleDataService }, { provide: ScheduleDataService, useExisting: BaseDataService }]`
- `schedule-data.service.ts` — `initializeGroupIndices()` mit `getDisplayRows()`
- `create-row-header.service.ts` — `calculateRowProperties()` mit `getDisplayRows()`
- `draw-row-header.service.ts` — `!isDefined(correctedRow)` statt `!correctedRow`
- `shared/helpers/type-guard.helper.ts` — `isDefined<T>()` Type-Guard
- `time-ruler-render.service.ts` — `drawTimeRuler()` mit optionalem `paddingMinutesOverride`

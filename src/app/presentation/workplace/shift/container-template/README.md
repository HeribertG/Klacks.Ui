# Shift Template & Container Template

Modul zur Verwaltung und Visualisierung von Schichtvorlagen mit zeitbasierter Darstellung, sowie Container-Template-Verwaltung mit Drag & Drop und visueller Shift-Zuweisung.

## Übersicht

Das Modul bietet zwei Hauptfunktionen:
1. **Shift Template** - Erstellung und Bearbeitung von Schichtvorlagen für Wochentage
2. **Container Template** - Visuelle Planung und Zuweisung von Shifts zu Container-Vorlagen

Beide nutzen die visuelle Zeitachse (Time Ruler) zur präzisen Darstellung von Zeitbereichen.

## Komponenten

### ContainerTemplateComponent (NEU)

Hauptkomponente für die Zuweisung von Shifts zu Container-Vorlagen.

**Pfad:** `src/app/presentation/workplace/shift/container-template/`

**Features:**
- Wochentagsauswahl (Monday bis Sunday) basierend auf Container-Konfiguration
- Drag & Drop Zuweisung von verfügbaren Shifts
- Visuelle Darstellung zugewiesener Shifts im Time Ruler
- Shift-Selektion mit Hervorhebung
- Dynamische Zeitbereichsanpassung

**State Management:**
- Verwendet Angular Signals (nicht Observables) via `ContainerTemplateShiftService`
- `selectedTasksSignal()` - Zugewiesene Shifts
- `selectedShiftSignal()` - Aktuell selektierter Shift

**Drag & Drop Integration:**
```typescript
// Angular CDK Drag & Drop
<tr cdkDrag (click)="onShiftRowClick(shift)">
```
- Available Tasks → Selected Tasks via `transferArrayItem()`
- Reordering via `moveItemInArray()`

**Table Sorting (NEU):**
- Client-Side Sortierung der Available Tasks (Zone 3)
- Sortierbare Spalten: Name, Abkürzung, Zeit, Kunde
- Two-Way Sorting (asc ↔ desc)
- Keine Backend-Integration erforderlich

**Search Integration (NEU):**
- **Client-seitige Filterung** der Available Tasks (Zone 3)
- Suchfeld sichtbar und aktiv
- Verwendet `ContainerTemplateSearchStrategy` für Search-Pattern
- Signal-basierte Kommunikation via `SearchStateService.containerTemplateSearch`
- Automatische Aktualisierung bei Sucheingabe ohne Backend-Call
- Filterung nach: Name, Abkürzung, Kunde (case-insensitive)
- EntityName: `SHIFT_CONTAINER_TEMPLATE`
- **Service-Methode:** `DataManagementContainerService.filterAvailableTasksBySearch()`

**isDirty Detection & Reset (NEU):**
- **Dual-Check System** für vollständige Change Detection:
  - `hasTemplateChanges`: Vergleicht `editTemplates` mit `editTemplatesDummy` (gespeicherte Tasks)
  - `hasUnsavedTasks`: Prüft auf neue Tasks mit nur `tmpId` (noch nie gespeichert)
- **tmpId System** für neue Tasks:
  - Verwendet `newGuid()` für eindeutige temporäre IDs
  - Alle CRUD-Operationen unterstützen `id || tmpId` Fallback
  - Verhindert Massenlöschung von neuen Tasks
- **Position Tracking**:
  - Task-Reihenfolge wird in `editTemplates` gespeichert
  - `updateTaskOrderInTemplates()` synchronisiert Position nach Drag & Drop
  - Keine automatische Sortierung beim Reset - Benutzer-Reihenfolge wird beibehalten
- **Reset Behavior**:
  - `editTemplates` wird auf `editTemplatesDummy` zurückgesetzt
  - `weekdayContainerTemplateItemsSignal` wird aus Backup wiederhergestellt
  - Available Tasks werden vom Backend neu geladen
  - Original-Reihenfolge wird korrekt wiederhergestellt
- **Delete Task Flow**:
  - Task wird aus `editTemplates` entfernt via `removeTaskItemFromTemplates()`
  - Task wird aus `weekdayContainerTemplateItemsSignal` entfernt
  - Task wird zurück zu Available Tasks hinzugefügt via `addShiftToAvailableTasks()`
  - isDirty wird sofort aktualisiert

**Available Tasks Backend-Filter:**

Die Available Tasks werden durch den `ContainerAvailableTasksService` im Backend gefiltert. Folgende Einschränkungen gelten:

1. **Sporadische Shifts** (`IsSporadic == true`)
   - Werden **NICHT** angezeigt
   - Filter: `.Where(s => !s.IsSporadic)`

2. **Zeitfenster-Filter** - Unterscheidung zwischen Normal und TimeRange Shifts:

   **Wichtig:** Der Filter erkennt, ob das **Zeitfenster** über Mitternacht geht (`fromTime > untilTime`, z.B. 22:00-06:00).

   **Normale Shifts** (`IsTimeRange == false`):
   - Shifts, die selbst Mitternacht überschreiten, werden **immer ausgeschlossen**
   - Filter für normales Zeitfenster: `StartShift >= fromTime && EndShift <= untilTime && StartShift < EndShift`
   - Filter für Mitternachts-Zeitfenster: `(StartShift >= fromTime || EndShift <= untilTime) && StartShift < EndShift`

   Beispiele:

   *Zeitfenster 08:00-12:00 (normal):*
     - ✅ Shift 09:00-11:00 (komplett innerhalb)
     - ✅ Shift 08:00-12:00 (genau am Rand)
     - ❌ Shift 07:00-09:00 (StartShift vor fromTime)
     - ❌ Shift 11:00-13:00 (EndShift nach untilTime)
     - ❌ Shift 23:00-07:00 (überschreitet Mitternacht)

   *Zeitfenster 22:00-06:00 (über Mitternacht):*
     - ✅ Shift 23:00-23:30 (im späten Abend)
     - ✅ Shift 02:00-05:00 (im frühen Morgen)
     - ❌ Shift 23:00-01:00 (überschreitet selbst Mitternacht)
     - ❌ Shift 10:00-14:00 (außerhalb des Zeitfensters)

   **TimeRange Shifts** (`IsTimeRange == true`):
   - Dürfen mit dem Zeitfenster **überlappen**
   - Filter für normales Zeitfenster: `StartShift < untilTime && EndShift > fromTime`
   - Filter für Mitternachts-Zeitfenster: `StartShift < untilTime || EndShift > fromTime`

   Beispiele:

   *Zeitfenster 08:00-12:00 (normal):*
     - ✅ Shift 07:00-09:00 (überlappt am Anfang)
     - ✅ Shift 11:00-13:00 (überlappt am Ende)
     - ✅ Shift 09:00-11:00 (komplett innerhalb)

   *Zeitfenster 22:00-06:00 (über Mitternacht):*
     - ✅ Shift 20:00-23:00 (überlappt am Anfang)
     - ✅ Shift 04:00-08:00 (überlappt am Ende)
     - ✅ Shift 23:00-05:00 (überlappt beide Teile)
     - ❌ Shift 10:00-14:00 (keine Überlappung)

3. **Weitere Basis-Filter:**
   - Nur Tasks: `ShiftType == IsTask` (keine Container)
   - Status: `Status >= OriginalShift` (Status 2 oder 3)
   - Bereits verwendete Shifts werden ausgeschlossen
   - Gruppen-Filter (Shifts aus denselben Gruppen wie der Container)
   - Wochentags-Filter (IsMonday, IsTuesday, etc.)

**Backend-Service:** `/mnt/c/SourceCode/Klacks.Api/Domain/Services/ContainerTemplates/ContainerAvailableTasksService.cs`

### ShiftTemplateComponent

Hauptkomponente für die Schichtvorlagen-Verwaltung.

**Pfad:** `src/app/presentation/workplace/shift/shift-template/`

**Verantwortlichkeiten:**
- Verwaltung von Schichtzeiten (Von/Bis)
- Automatische Berechnung der Schichtdauer
- Auswahl des Wochentags für die Vorlage
- Integration des Time Ruler für visuelle Darstellung

**Properties:**
- `timeFrom: OwnTime` - Schichtbeginn (Default: 06:00)
- `timeTo: OwnTime` - Schichtende (Default: 18:00)
- `duration: OwnTime` - Automatisch berechnete Dauer (readonly)
- `selectedWeekday: string | null` - Ausgewählter Wochentag
- `weekdays` - Array mit Wochentagen (Mo-So, Feiertag, +Feiertag)

**Event Handlers:**
- `onTimeFromChange(time: OwnTime)` - Reagiert auf Änderungen der Startzeit
- `onTimeToChange(time: OwnTime)` - Reagiert auf Änderungen der Endzeit

**Wichtig:** Die Event Handler erstellen neue `OwnTime` Instanzen, um Angular's Change Detection zu triggern:
```typescript
this.timeFrom = OwnTime.forTime(time.hours, time.minutes);
```

### TimeRulerComponent

Visualisiert Zeitbereiche als Lineal mit adaptiver Skalierung.

**Pfad:** `src/app/presentation/shared/time-ruler/`

**Features:**
- HiDPI Canvas Rendering für scharfe Darstellung auf Retina/4K Displays
- Adaptive Zeitmarkierungen basierend auf verfügbarer Höhe
- Automatisches Padding (30 Minuten oben/unten)
- Rote Begrenzungslinien bei gewählten Zeiten
- Unterstützung für Mitternachtsüberschreitung (z.B. 23:00 - 07:00)
- Responsive Resize-Handling

**Container Template Erweiterungen (NEU):**
- Shift-Boxen-Darstellung mit 3D-Border-Effekt
- Shift-Selektion mit transparentem Overlay (opacity 0.2)
- Z-Ordering: Selektierte Shifts werden zuletzt (oberst) gezeichnet
- Rectangle Single Source of Truth für kongruente Darstellung
- Dynamische Zeitbereichsberechnung basierend auf Shift-Zeiten
- Angular Signals Integration für reaktive Updates

**Inputs:**
- `@Input() fromTime: OwnTime` - Startzeit
- `@Input() untilTime: OwnTime` - Endzeit

**Rendering-Architektur:**
- Verwendet 3 Canvas-Layer (main, sub1, sub2)
- `DrawHelper.createHiDPICanvas()` für pixelRatio-Unterstützung
- `DrawImageHelper.drawCanvasLogical()` für Canvas-Komposition

**Canvas-Layout:**
- subCanvas1 (width - 80px): Begrenzungslinien
- subCanvas2 (80px): Zeitskala mit Markierungen
- mainCanvas: Zusammengesetztes Ergebnis

## TimeRangeService

Zentraler Service für alle Zeitberechnungen.

**Pfad:** `src/app/presentation/shared/time-ruler/services/time-range.service.ts`

### Methoden

#### `toMinutes(time: OwnTime): number`
Konvertiert OwnTime zu Minuten seit Mitternacht.

```typescript
toMinutes(OwnTime.forTime('14', '30')) // => 870
```

#### `calculateDuration(from: OwnTime, until: OwnTime): OwnTime`
Berechnet die Dauer zwischen zwei Zeitpunkten.

**Features:**
- Automatische Behandlung von Mitternachtsüberschreitung
- Wenn `until <= from`, wird automatisch +24h hinzugefügt

```typescript
calculateDuration(
  OwnTime.forTime('23', '00'),
  OwnTime.forTime('07', '00')
) // => OwnTime { hours: '08', minutes: '00' }
```

#### `calculateDisplayRange(from: OwnTime, until: OwnTime, paddingMinutes: number)`
Berechnet den erweiterten Anzeigebereich mit Padding.

**Rückgabewerte:**
- `originalFromMinutes` - Ursprüngliche Startzeit in Minuten
- `originalUntilMinutes` - Ursprüngliche Endzeit in Minuten (ggf. +24h)
- `displayFromMinutes` - Startzeit mit Padding
- `displayUntilMinutes` - Endzeit mit Padding
- `totalMinutes` - Gesamtlänge des Anzeigebereichs

```typescript
calculateDisplayRange(
  OwnTime.forTime('06', '00'),
  OwnTime.forTime('18', '00'),
  30
) // => {
  //   originalFromMinutes: 360,
  //   originalUntilMinutes: 1080,
  //   displayFromMinutes: 330,  // -30 Minuten
  //   displayUntilMinutes: 1110, // +30 Minuten
  //   totalMinutes: 780
  // }
```

#### `calculateOptimalIncrement(pixelsPerMinute: number)`
Berechnet den optimalen Zeitinkrement basierend auf verfügbarer Höhe.

**Adaptive Skalierung:**
- Sehr groß: 1 Minute
- Groß: 15 Minuten (Viertelstunden)
- Mittel: 30 Minuten (Halbstunden)
- Klein: 1, 2, 3, 4, 6, 12 oder 24 Stunden

**Rückgabewerte:**
- `increment` - Zeitinkrement in Minuten
- `showHalfHourLabels` - Ob Halbstunden-Labels angezeigt werden sollen

**Algorithmus:**
```typescript
// Mindestens 25 Pixel pro Label für Lesbarkeit
const minPixelsPerLabel = 25;

// Testet Inkremente: 1min, 15min, 30min, 1h, 2h, 3h, 4h, 6h, 12h, 24h
// Wählt das kleinste Inkrement, das >= minPixelsPerLabel ist
```

#### `formatTime(totalMinutes: number): string`
Formatiert Minuten als Zeit-String (HH:MM).

```typescript
formatTime(870) // => "14:30"
formatTime(1500) // => "01:00" (normalisiert auf 0-23h)
```

#### `isCrossingMidnight(from: OwnTime, until: OwnTime): boolean`
Prüft ob eine Zeitspanne Mitternacht überschreitet.

```typescript
isCrossingMidnight(
  OwnTime.forTime('23', '00'),
  OwnTime.forTime('07', '00')
) // => true
```

#### `normalizeHours(hours: number): number`
Normalisiert Stunden auf den Bereich 0-23.

```typescript
normalizeHours(25) // => 1
normalizeHours(-2) // => 22
```

## Container Template - Technische Details

### Rectangle Single Source of Truth

Um perfekte Kongruenz zwischen den drei Zeichenoperationen (Background, Selection, Border) zu gewährleisten, wird ein einziges `Rectangle`-Objekt verwendet:

```typescript
// Einzige Source of Truth für Box-Dimensionen
const rect = new Rectangle(
  marginLeftRight,
  startY,
  boxWidth + 4,
  boxHeight - 1
);

// Background Fill - verwendet rect
DrawHelper.fillRectangle(ctx, backgroundColor, rect);

// Selection Overlay - verwendet dasselbe rect
if (isSelected) {
  ctx.save();
  ctx.globalAlpha = 0.2;
  DrawHelper.fillRectangle(ctx, focusBorderColor, rect);
  ctx.restore();
}

// Border - verwendet Basis-Dimensionen (ohne +4/-1)
DrawHelper.drawBorder(ctx, marginLeftRight, startY, boxWidth, boxHeight, ...);
```

**Wichtig:**
- `rect` verwendet `boxWidth + 4` und `boxHeight - 1` für Fill-Operationen
- `drawBorder` verwendet `boxWidth` und `boxHeight` ohne Offsets
- Dies kompensiert für den 3D-Border-Effekt (`deep=4`), der nach innen gezeichnet wird

### Z-Ordering für Selektion

Selektierte Shifts werden immer oberst dargestellt durch strategisches Rendering:

```typescript
// 1. Alle nicht-selektierten Shifts zeichnen
this.shifts.forEach((shift) => {
  if (shift === this.selectedShift) return; // Skip!
  this.drawSingleShiftBox(ctx, shift, ..., false);
});

// 2. Selektierten Shift zuletzt (oberst) zeichnen
if (this.selectedShift) {
  this.drawSingleShiftBox(ctx, this.selectedShift, ..., true);
}
```

### Angular Signals Integration

State Management erfolgt ausschließlich über Signals (nicht Observables):

```typescript
// ContainerTemplateShiftService
public selectedTasksSignal: WritableSignal<IShift[]> = signal([]);
public selectedShiftSignal: WritableSignal<IShift | null> = signal(null);

// TimeRulerComponent - Effect für reaktive Updates
constructor() {
  effect(() => {
    this.shifts = this.shiftService.selectedTasksSignal();
    this.selectedShift = this.shiftService.selectedShiftSignal();
    if (this.inboxCanvasRef) {
      this.setupCanvas(); // Auto-Redraw bei Änderungen
    }
  }, { injector: this.injector });
}
```

**Vorteile:**
- Einfachere Syntax als Observables
- Automatische Cleanup (kein `ngOnDestroy` für Subscriptions)
- Bessere Performance durch feinere Change Detection

### Shift-Selektion Visualisierung

```typescript
if (isSelected) {
  ctx.save();
  ctx.globalAlpha = 0.2; // 20% Transparenz
  DrawHelper.fillRectangle(ctx, this.gridColorService.focusBorderColor, rect);
  ctx.restore(); // Alpha zurücksetzen
}
```

- Nutzt `focusBorderColor` aus Grid-Color-Service
- 20% Transparenz für subtile Hervorhebung
- Wird VOR Border und Text gezeichnet (Reihenfolge: Background → Selection → Border → Text)

## Besondere Features

### Mitternachtsüberschreitung

Schichten die über Mitternacht gehen (z.B. 23:00 - 07:00) werden korrekt behandelt:
- Automatische +24h Addition bei Berechnungen
- Korrekte Dauer-Berechnung
- Visuelle Darstellung funktioniert über Mitternacht hinweg

### Adaptive Zeitmarkierungen

Der Time Ruler passt sich automatisch an die verfügbare Höhe an:

| Höhe | Markierungen | Beispiel |
|------|--------------|----------|
| Sehr groß (>2px/min) | Jede Minute | 08:00, 08:01, 08:02... |
| Groß (>12px/15min) | Viertelstunden | 08:00, 08:15, 08:30... |
| Mittel (>15px/30min) | Halbstunden | 08:00, 08:30, 09:00... |
| Klein | 2-Stunden-Intervalle | 08:00, 10:00, 12:00... |
| Sehr klein | 3-6-Stunden-Intervalle | 06:00, 12:00, 18:00... |

### Change Detection

Die Komponente verwendet Objektreferenz-Vergleich für Change Detection. Deshalb ist es wichtig, bei Änderungen neue `OwnTime` Instanzen zu erstellen:

**Richtig:**
```typescript
this.timeFrom = OwnTime.forTime(time.hours, time.minutes); // Neue Instanz
```

**Falsch:**
```typescript
this.timeFrom.hours = time.hours; // Mutation - triggert keine Change Detection
```

### HiDPI Rendering

Alle Canvas-Elemente nutzen `DrawHelper.createHiDPICanvas()` für:
- Automatische devicePixelRatio-Erkennung
- Scharfe Darstellung auf Retina/4K Displays
- Korrekte Skalierung bei verschiedenen Zoom-Stufen

## Verwendung

```typescript
<app-shift-template></app-shift-template>
```

### Zeitbereich programmatisch setzen

```typescript
export class ParentComponent {
  timeFrom = OwnTime.forTime('09', '00');
  timeTo = OwnTime.forTime('17', '00');
}
```

```html
<app-time-ruler
  [fromTime]="timeFrom"
  [untilTime]="timeTo">
</app-time-ruler>
```

## Layout

Das Modul verwendet `angular-split` für ein 3-Zonen Layout:

```
┌─────────────────────────────────────┐
│ Header (Zeitauswahl, Wochentage)    │
├──────────────┬──────────────────────┤
│              │ Zone 2               │
│  Time Ruler  │ (Obere rechte Seite) │
│  (Links)     ├──────────────────────┤
│              │ Zone 3               │
│              │ (Untere rechte Seite)│
└──────────────┴──────────────────────┘
```

- Zone 1 (Links, 30%): Time Ruler
- Zone 2 (Rechts oben, 50%): Zukünftiger Inhalt
- Zone 3 (Rechts unten, 50%): Zukünftiger Inhalt

## Technische Details

### Dependencies

- `@angular/core` - Component Lifecycle
- `angular-split` - Resizable Panels
- `DrawHelper` - HiDPI Canvas Support
- `DrawImageHelper` - Canvas Composition
- `TimeRangeService` - Zeit-Berechnungen
- `OwnTime` (Domain Model) - Zeit-Repräsentation

### Performance

- ResizeObserver für effizientes Resize-Handling
- Canvas-Rendering nur bei tatsächlichen Änderungen
- Optimierte Change Detection mit String-Vergleichen
- Keine unnötigen Redraws durch Immutability

### Browser Compatibility

- Canvas API (alle modernen Browser)
- ResizeObserver (polyfill ggf. nötig für ältere Browser)
- devicePixelRatio Support (automatisches Fallback auf 1)

## Wartung & Erweiterung

### Neue Zeitberechnungen hinzufügen

Alle Zeitlogik sollte im `TimeRangeService` implementiert werden:

```typescript
// time-range.service.ts
calculateCustom(from: OwnTime, until: OwnTime): CustomResult {
  const fromMinutes = this.toMinutes(from);
  const untilMinutes = this.toMinutes(until);
  // Implementierung...
}
```

### Time Ruler Padding anpassen

```typescript
// time-ruler.component.ts
private paddingMinutes = 30; // Ändern auf gewünschten Wert
```

### Zeitmarkierungen anpassen

Die Logik für Linien und Labels befindet sich in:
- `time-ruler.component.ts:117-186` - `drawTimeRuler()`
- `time-range.service.ts:78-108` - `calculateOptimalIncrement()`

### Canvas-Größen anpassen

```typescript
// time-ruler.component.ts:85-91
const subCanvas1Width = width - 80;  // Linke Fläche
const ctx2 = DrawHelper.createHiDPICanvas(subCanvas2, 80, height); // Rechte Fläche (80px)
```

## Architektur-Entscheidungen

### Warum ist TimeRangeService nicht in der Application Layer?

Der Service befindet sich in `presentation/shared/time-ruler/services/` statt in `application/services/`.

**Begründung:** Der Service ist eng mit der TimeRuler-Komponente gekoppelt und enthält UI-spezifische Berechnungen (z.B. `calculateOptimalIncrement` für Canvas-Rendering). Obwohl dies gegen Clean Architecture verstößt, verbessert es die Kohäsion und Wartbarkeit des Moduls.

### Warum drei Canvas-Layer?

**Separation of Concerns:**
- subCanvas1: Begrenzungslinien (ändern sich bei Zeitauswahl)
- subCanvas2: Zeitskala (ändert sich bei Zeitauswahl und Resize)
- mainCanvas: Komposition (keine direkte Zeichenlogik)

Dies ermöglicht selektives Neuzeichnen und bessere Performance.

## Troubleshooting

### Time Ruler aktualisiert nicht bei Zeitänderung

**Ursache:** Objektmutation statt neue Referenz

**Lösung:** Neue `OwnTime` Instanz erstellen:
```typescript
this.timeFrom = OwnTime.forTime(newHours, newMinutes);
```

### Verschwommene Darstellung auf Retina-Displays

**Ursache:** HiDPI nicht aktiviert

**Lösung:** `DrawHelper.createHiDPICanvas()` verwenden statt direkter Canvas-Konfiguration

### Zeitmarkierungen fehlen bei kleiner Höhe

**Ursache:** Startpunkt nicht auf Intervall gerundet

**Lösung:** Bereits implementiert in `time-ruler.component.ts:141-143`

### Falsche Dauer bei Mitternachtsüberschreitung

**Ursache:** Fehlende +24h Behandlung

**Lösung:** `TimeRangeService.calculateDuration()` verwenden - behandelt automatisch

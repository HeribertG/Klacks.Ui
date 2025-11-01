# Shift Template

Modul zur Verwaltung und Visualisierung von Schichtvorlagen mit zeitbasierter Darstellung.

## Übersicht

Das Shift Template Modul ermöglicht die Erstellung und Bearbeitung von Schichtvorlagen für verschiedene Wochentage. Es bietet eine visuelle Zeitachse (Time Ruler) zur präzisen Darstellung von Zeitbereichen.

## Komponenten

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

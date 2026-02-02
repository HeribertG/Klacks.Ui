# Time-Ruler Drag-and-Drop

## Übersicht

Der `time-ruler` Component ermöglicht vertikales Drag-and-Drop von Shifts mit automatischer Überlappungsvermeidung und visueller Warnung bei Konflikten.

**Pfad:** `src/app/presentation/shared/time-ruler/`

## TimeRangeService (Zentral!)

**WICHTIG:** Alle Zeit-Berechnungen laufen über `TimeRangeService`:

```typescript
// RICHTIG
const startMinutes = this.timeRangeService.getShiftStartMinutes(shift);
const endMinutes = this.timeRangeService.getShiftEndMinutes(shift);

// FALSCH - Duplizierte Logik
const timeString = shift.timeRangeStartShift || shift.startShift;
const time = this.parseTimeString(timeString);
```

### Wichtige Methoden

```typescript
getShiftStartMinutes(shift: IShift): number
// TimeRange/Sporadic: nutzt timeRangeStartShift
// Normale Shifts: nutzt startShift

getShiftEndMinutes(shift: IShift): number
// Mit Mitternachts-Überlauf (End < Start -> End + 24h)

parseTimeString(timeString: string): { hours: number; minutes: number } | null
formatTime(totalMinutes: number): string
```

## Drag-and-Drop Flow

### Phase 1: MouseDown

```typescript
onMouseDown(event: MouseEvent): void {
  // Nur Shifts mit isTimeRange === true sind draggable
  if (shift.isTimeRange) {
    this.dragDropService.startDrag(y, shift, shiftRect);
  }
}
```

### Phase 2: MouseMove

1. Berechne neue Position mit Minute-Snapping
2. Automatische Überlappungsauflösung
3. Update `shift.timeRangeStartShift` / `timeRangeEndShift`
4. Redraw mit Shadow Canvas Pattern

### Phase 3: MouseUp

1. Drag beenden
2. Shifts nach Zeit sortieren
3. Cache komplett neu rendern
4. Signal aktualisieren -> Tabelle sortiert sich

## Überlappungsauflösung (Kaskadisch)

```typescript
resolveOverlaps(startMinutes, endMinutes, allShifts) {
  if (!hasOverlap(startMinutes, endMinutes, otherShifts)) {
    return { startMinutes, endMinutes };
  }
  // Suche freie Position OBERHALB
  const snapAbove = findSnapPositionAbove(...);
  // Suche freie Position UNTERHALB
  const snapBelow = findSnapPositionBelow(...);
  // Wähle Position mit kürzester Distanz zur Maus
  return distanceAbove < distanceBelow ? snapAbove : snapBelow;
}
```

## Shift-Typen

### Time-Range Shifts (isTimeRange === true)

- Draggable im Time-Ruler
- Zeit kann verändert werden
- Wird nach `timeRangeStartShift` sortiert
- Blaue Boundary-Lines zeigen Time-Range

### Normale Shifts (isTimeRange === false)

- NICHT draggable
- Zeit bleibt fix
- Nur Visualisierung
- Keine Boundary-Lines

## Kollisionserkennung (Visuelle Warnung)

```typescript
private checkShiftOverlap(currentShift: IShift, startMinutes: number, endMinutes: number): boolean {
  // Nur der SPÄTERE (obere) Shift wird rot markiert
  if (startMinutes >= otherStart) {
    return true; // -> gridColorService.warningColor
  }
}
```

## Shadow Canvas Pattern

1. `renderCanvas` (Shadow): Cache mit allen Shifts
2. `inboxCanvas` (Main): Sichtbares Canvas
3. `rulerCanvas`: Zeit-Skala

**Während Drag:**
1. Backup = renderCanvas kopieren
2. renderCanvas neu zeichnen OHNE draggedShift
3. renderCanvas -> inboxCanvas kopieren
4. draggedShift direkt auf inboxCanvas zeichnen
5. renderCanvas aus Backup wiederherstellen

## HiDPI/Retina Support

```typescript
// RICHTIG
const ctx = DrawHelper.createHiDPICanvas(canvas, width, height);
DrawImageHelper.drawCanvasLogical(ctx, sourceCanvas, x, y, w, h);

// FALSCH
canvas.width = width;
ctx.drawImage(sourceCanvas, x, y);
```

## Konstanten

- `snapToMinutes: 1` - Snap auf einzelne Minuten
- `RULER_WIDTH: 70` - Breite des Zeit-Rulers
- `SHIFT_BOX_MARGIN_LEFT_RIGHT: 8`
- `BOUNDARY_LINE_WIDTH: 2`

## Services

- `time-ruler-drag-drop.service.ts` - Drag-and-Drop Logik
- `time-range.service.ts` - Zentrale Zeit-Berechnungen
- `container-template-shift.service.ts` - Signal-Management
- `shift-arrangement.service.ts` - Shift-Anordnung

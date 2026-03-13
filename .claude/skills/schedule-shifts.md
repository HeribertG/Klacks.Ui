---
name: schedule-shifts
description: Verwende wenn an Shift-Status-Flow, TimeRange-Shifts, Grid-Selection oder Shift Drag&Drop gearbeitet wird
---

# Shift-System

## Status-Flow

```
0 (OriginalOrder) -> 1 (SealedOrder) -> 2 (OriginalShift) -> 3 (SplitShift)
     [Entwurf]         [Versiegelt]       [Backend-Kopie]      [Geschnitten]
```

**Nur** OriginalShift (2) und SplitShift (3) können verplant werden!

## Wichtige Felder für TimeRange-Shifts

- `isTimeRange: true` - draggable im Time-Ruler
- `timeRangeStartShift` / `timeRangeEndShift` - Zeitfenster
- `startShift` / `endShift` - Original-Zeiten

## Nested Set Tree (für Cuts)

- `lft`, `rgt` - Nested Set Werte
- `parent_id` - Eltern-Cut
- `root_id` - Wurzel-Cut

## Grid Selection Mode

```typescript
export enum GridSelectionModeEnum {
  Cell = 1,        // Standard: nur Zelle selektierbar
  Row = 2,         // Ganze Zeile wird markiert
  RowActiveOnly = 3  // Zeile nur markiert wenn Zelle aktiv
}
```

### RowActiveOnly Modus (Shift-Section)

- Jede Zelle kann selektiert werden
- Zeilen-Highlight nur wenn selektierte Zelle Inhalt hat
- Multiselect ist deaktiviert

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

## Drag & Drop von Shifts

### Ablauf

1. **Mousedown** auf gefüllte Shift-Zelle - Zelle wird selektiert
2. **Nach Verzögerung** (DRAG_DELAY_MS) - Drag startet
3. **Mouseup vor Verzögerung** - Nur Selektion, kein Drag

```typescript
private tryPrepareShiftDrag(event: MouseEvent): void {
  if (this.gridSurface.nameId !== 'shift') return;
  if (!this.gridData.isCellActive(pos.row, pos.column)) return;

  this.dragDelayTimer = setTimeout(() => {
    this.shiftDragService.startDrag(event, dragData);
  }, this.DRAG_DELAY_MS);
}
```

## Shift-Typ Icons (Context Menu)

| Bedingung | Icon | Komponente |
|-----------|------|------------|
| `shiftType === 1` | Container (Box) | `IconBoxContainerComponent` |
| `isSporadic` | Fragezeichen-Uhr | `IconUnknownTimeComponent` |
| `isTimeRange` | Pie-Uhr | `IconTimeWindowComponent` |
| Default | Viertel-Uhr | `IconShiftSegmentComponent` |

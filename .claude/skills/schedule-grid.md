---
name: schedule-grid
description: Verwende wenn am Schedule-Grid, Cell-Editing, Copy/Paste, Fill Handle oder Context Menu gearbeitet wird
---

# Grid Cell Editing & Interaktion

## Komponenten

| Datei | Beschreibung |
|-------|--------------|
| `grid-surface-template.component.ts` | Basis-Grid mit editierbarem Input-Overlay |
| `cell-input-events.directive.ts` | Keyboard/Mouse Events für Cell-Input |
| `grid-template-events.directive.ts` | Canvas Events für Grid-Navigation |

## Input-Overlay Verhalten

- Erscheint wenn: Zelle selektiert UND `settings.editable = true` UND `isCellEditable(row, col) = true`
- Bewegt sich mit Scroll und Zoom
- Font-Größe folgt `GridFontsService.mainFontSizeZoom`

## Keyboard-Navigation

| Taste | Verhalten |
|-------|-----------|
| Enter, Tab | Immer speichern + navigieren |
| ArrowUp/Down, Home, End | Immer speichern + navigieren |
| ArrowRight | Navigieren nur wenn Cursor am Ende |
| ArrowLeft, Backspace | Navigieren nur wenn Cursor am Anfang |
| Escape | Abbrechen (Originalwert wiederherstellen) |

## isCellEditable Override

```typescript
public override isCellEditable(row: number, col: number): boolean {
  if (this.isColumnSealed(col)) return false;
  return this.isCellActive(row, col);
}
```

## Cell Value Change Event

```typescript
onCellValueChange(event: CellValueChangeEvent): void {
  // event = { row, column, value }
  // Match abbreviation gegen shiftSchedules
  // Bei Match: addWorkScheduleEntry aufrufen
}
```

## Refresh ohne Scroll-Reset

```typescript
this.scheduleSurface.Refresh(false);  // resetScroll = false
```

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

### Gefüllte Zelle - Rechtsklick

| Menüpunkt | Aktion |
|-----------|--------|
| Kopieren (Ctr+C) | Kopiert Shift in Zwischenablage |
| Ausschneiden (Ctr+X) | Kopiert und löscht |
| Einfügen (Ctr-V) | Fügt kopierten Shift ein |
| Löschen (Delete) | Löscht den Work-Eintrag |
| In Dienst zeigen | Scrollt zur Shift-Section |

## MenuItem Erweiterungen

```typescript
interface IMenuItem {
  // ... bestehende Properties
  svgIcon: string | undefined;  // Inline SVG für Icon
  subText: string | undefined;  // Sekundärtext (kleiner, rechts)
}
```

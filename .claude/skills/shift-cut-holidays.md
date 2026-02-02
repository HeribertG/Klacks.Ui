# Shift Cut - Holidays Feature

## Übersicht

Das Shift-Cut-Feature wurde erweitert um einen separaten Button zum Trennen von Diensten nach Feiertagen. Zuvor waren Feiertage und Wochentage im selben Modal gemischt.

## Datenobjekte

### Wochentage (separates Objekt)

```typescript
weekdays = {
  isMonday: false,
  isTuesday: false,
  isWednesday: false,
  isThursday: false,
  isFriday: false,
  isSaturday: false,
  isSunday: false,
};
```

### Feiertage (separates Objekt)

```typescript
holidays = {
  isHoliday: false,
  isWeekdayAndHoliday: false,
};
```

## Input Properties

```typescript
@Input() isCutHolidaysEnabled = true;
@Input() isHolidayEnabledForCut = true;
@Input() isWeekdayAndHolidayEnabledForCut = true;
```

## Validierungslogik

### Wochentage-Button Enable-Logik

**Regel:** Button nur enabled wenn mindestens 2 Wochentage gesetzt sind.

```typescript
private analyzeCutByWeekdays(shift: Shift): void {
  let weekdayCount = 0;
  if (shift.isMonday) weekdayCount++;
  if (shift.isTuesday) weekdayCount++;
  // ... alle Wochentage

  if (weekdayCount >= 2) {
    this.isCutWeekdaysEnabled = true;
  }
}
```

### Feiertage-Button Enable-Logik

**Regel:** Button enabled wenn:
- Mindestens 2 Holiday-Optionen gesetzt sind UND
- Kein Duplicate erzeugt würde

```typescript
private analyzeCutByHolidays(shift: Shift): void {
  let holidayCount = 0;
  if (shift.isHoliday) holidayCount++;
  if (shift.isWeekdayAndHoliday) holidayCount++;

  if (holidayCount >= 2) {
    const wouldCreateDuplicate = this.wouldHolidayCutCreateDuplicate(shift);

    if (!wouldCreateDuplicate) {
      this.isCutHolidaysEnabled = true;
      // ...
    }
  }
}
```

### Modal-Validierung

**Regel:** Save-Button nur enabled wenn **genau 1 Checkbox** ausgewählt ist.

```typescript
isHolidayCutValid(): boolean {
  const selectedCount =
    (this.holidays.isHoliday ? 1 : 0) +
    (this.holidays.isWeekdayAndHoliday ? 1 : 0);
  return selectedCount === 1;
}
```

## Duplicate-Prevention

Vor dem Enablen des Buttons wird geprüft, ob das Trennen eine Dublette erzeugen würde.

```typescript
private wouldHolidayCutCreateDuplicate(selectedShift: Shift): boolean {
  for (const existingShift of this.dataManagementShiftCutService.cutShifts) {
    if (existingShift.id === selectedShift.id) {
      continue;
    }

    if (
      selectedShift.isWeekdayAndHoliday &&
      compareComplexObjects(selectedShift, existingShift, [
        'isWeekdayAndHoliday',
        'id',
        'parentId',
        'name',
        'description',
        'abbreviation',
        'lft',
        'rgt',
      ])
    ) {
      return true;
    }

    // ... ähnlich für isHoliday
  }

  return false;
}
```

**Excluded Properties (dürfen unterschiedlich sein):**
- `isWeekdayAndHoliday` / `isHoliday` - Die Property, die getrennt werden soll
- `id` - Jeder Shift hat eine unique ID
- `parentId` - Child-Shifts haben unterschiedliche Parents
- `name`, `description`, `abbreviation` - Können bei Child-Shifts angepasst sein
- `lft`, `rgt` - Nested Set Model Werte sind immer unterschiedlich

## Personal/Aufgaben Validation

**Regel:**
- Minimum: 1 (mindestens 1 abtrennen)
- Maximum: Gesamtanzahl - 1 (mindestens 1 muss bleiben)

```typescript
private analyzeCutByStaff(shift: Shift): void {
  if (shift.sumEmployees && shift.sumEmployees > 1) {
    this.minStaffCount = 1;
    this.maxStaffCount = shift.sumEmployees - 1;
  }
}
```

## Conditional Rendering

Checkboxen werden nur angezeigt, wenn sie im ausgewählten Shift vorhanden sind:

```html
<div class="form-group" *ngIf="isMondayEnabled">
  <input type="checkbox" [(ngModel)]="weekdays.isMonday" />
  {{ "monday" | translate }}
</div>

<div class="form-group" *ngIf="isHolidayEnabledForCut">
  <input type="checkbox" [(ngModel)]="holidays.isHoliday" />
  {{ "holiday" | translate }}
</div>
```

## Pattern Consistency

Das Holiday-Feature folgt dem gleichen Pattern wie existierende Cut-Features:

1. **Modal Template:** `#cutHolidaysModal`
2. **ViewChild Referenz:** `@ViewChild('cutHolidaysModal')`
3. **Button Handler:** `onCutHolidays()`
4. **Perform Method:** `performCutByHolidays()`
5. **Helper Methods:** `updateOriginalShiftHolidays()`, `updateCopiedShiftHolidays()`
6. **Analyze Method:** `analyzeCutByHolidays()`

## Betroffene Dateien

```
/src/app/presentation/workplace/shift/cut-shift/cut-shift-list/cut-shift-list.component.html
/src/app/presentation/workplace/shift/cut-shift/cut-shift-list/cut-shift-list.component.ts
/src/assets/i18n/de.json
/src/assets/i18n/en.json
/src/assets/i18n/fr.json
/src/assets/i18n/it.json
```

## Übersetzungen

| Sprache | Key | Wert |
|---------|-----|------|
| DE | `shift.cut-shift.buttons.cut-holidays` | "Nach Feiertagen trennen" |
| EN | `shift.cut-shift.buttons.cut-holidays` | "Cut Holidays" |
| FR | `shift.cut-shift.buttons.cut-holidays` | "Couper par jours fériés" |
| IT | `shift.cut-shift.buttons.cut-holidays` | "Taglia per giorni festivi" |

## Wichtige Lessons Learned

### Nested Set Model Properties

Bei Vergleichen müssen `lft` und `rgt` IMMER ausgeschlossen werden, da diese bei Parent/Child-Beziehungen zwingend unterschiedlich sind.

### Excluded-Properties Logik

Die Property, die in der Condition geprüft wird, muss auch excluded werden:

```typescript
// RICHTIG:
if (selectedShift.isWeekdayAndHoliday) {
  compareComplexObjects(..., ['isWeekdayAndHoliday', ...])
}

// FALSCH:
if (selectedShift.isWeekdayAndHoliday) {
  compareComplexObjects(..., ['isHoliday', ...])  // Vertauscht!
}
```

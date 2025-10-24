# Shift Cut - Holidays Feature Implementation

**Datum:** 2025-10-24
**Feature:** 6. Cut-Button "Nach Feiertagen trennen"

---

## Übersicht

Das Shift-Cut-Feature wurde erweitert um einen separaten Button zum Trennen von Diensten nach Feiertagen. Zuvor waren Feiertage und Wochentage im selben Modal gemischt, was zu einem Design-Fehler führte.

---

## Implementierte Änderungen

### 1. Neue Komponenten

#### HTML Template (`cut-shift-list.component.html`)

**Neues Modal: `cutHolidaysModal` (Zeilen 218-269)**
```html
<!-- Cut Holidays Modal -->
<ng-template #cutHolidaysModal let-modal role="dialog" class="modal-window">
  <div class="modal-header">
    <div class="container-header-modal modal-title">
      {{ "shift.cut-shift.buttons.cut-holidays" | translate }}
    </div>
  </div>
  <div class="modal-body first-modal">
    <div class="form-group" *ngIf="isHolidayEnabledForCut">
      <input type="checkbox" [(ngModel)]="holidays.isHoliday" />
      {{ "holiday" | translate }}
    </div>
    <div class="form-group" *ngIf="isWeekdayOrHolidayEnabledForCut">
      <input type="checkbox" [(ngModel)]="holidays.isWeekdayOrHoliday" />
      {{ "weekday-or-holiday" | translate }}
    </div>
  </div>
</ng-template>
```

**Neuer Button (Zeilen 384-391)**
```html
<button
  type="button"
  class="btn btn-sm btn-primary"
  (click)="onCutHolidays()"
  [disabled]="!isCutHolidaysEnabled"
>
  {{ "shift.cut-shift.buttons.cut-holidays" | translate }}
</button>
```

#### TypeScript Komponente (`cut-shift-list.component.ts`)

**Neue Objekte (Zeilen 81-94)**
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

holidays = {
  isHoliday: false,
  isWeekdayOrHoliday: false,
};
```

**Neue Input Properties (Zeilen 106, 116-117)**
```typescript
@Input() isCutHolidaysEnabled = true;
@Input() isHolidayEnabledForCut = true;
@Input() isWeekdayOrHolidayEnabledForCut = true;
```

**Neue Methoden**
- `onCutHolidays()` (Zeilen 263-279) - Öffnet das Holiday-Modal
- `performCutByHolidays()` (Zeilen 690-712) - Führt das Trennen aus
- `updateOriginalShiftHolidays()` (Zeilen 714-718) - Aktualisiert Original-Shift
- `updateCopiedShiftHolidays()` (Zeilen 720-723) - Aktualisiert kopierten Shift
- `analyzeCutByHolidays()` (Zeilen 486-511) - Analysiert ob Trennung möglich ist mit Duplicate-Check
- `wouldHolidayCutCreateDuplicate()` (Zeilen 506-546) - Prüft ob Cut eine Dublette erzeugen würde
- `isHolidayCutValid()` (Zeilen 738-743) - Validiert Modal-Eingabe (genau 1 Checkbox ausgewählt)

---

### 2. UI/UX Verbesserungen

#### Conditional Rendering mit `*ngIf`

**Problem:** Checkboxen wurden vorher nur disabled, aber blieben sichtbar.

**Lösung:** Checkboxen werden nur angezeigt, wenn sie im ausgewählten Shift vorhanden sind.

**Beispiel Wochentage-Modal:**
```html
<div class="form-group" *ngIf="isMondayEnabled">
  <input type="checkbox" [(ngModel)]="weekdays.isMonday" />
  {{ "monday" | translate }}
</div>
```

**Beispiel Feiertage-Modal:**
```html
<div class="form-group" *ngIf="isHolidayEnabledForCut">
  <input type="checkbox" [(ngModel)]="holidays.isHoliday" />
  {{ "holiday" | translate }}
</div>
```

**Vorteil:** Wenn ein Shift Donnerstag nicht hat, ist die Checkbox komplett unsichtbar (nicht nur disabled).

---

### 3. Validierungslogik

#### Wochentage-Button Enable-Logik (`analyzeCutByWeekdays()`)

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

**Beispiele:**
- Shift mit nur Montag → Button disabled ❌ (nichts zum Trennen)
- Shift mit Montag + Dienstag → Button enabled ✓

#### Feiertage-Button Enable-Logik (`analyzeCutByHolidays()`)

**Regel:** Button enabled wenn:
- Mindestens 2 Holiday-Optionen gesetzt sind UND
- Kein Duplicate erzeugt würde (geprüft mit `wouldHolidayCutCreateDuplicate()`)

```typescript
private analyzeCutByHolidays(shift: Shift): void {
  let holidayCount = 0;
  if (shift.isHoliday) holidayCount++;
  if (shift.isWeekdayOrHoliday) holidayCount++;

  if (holidayCount >= 2) {
    const wouldCreateDuplicate = this.wouldHolidayCutCreateDuplicate(shift);

    if (!wouldCreateDuplicate) {
      this.isCutHolidaysEnabled = true;
      this.holidays.isHoliday = false;
      this.holidays.isWeekdayOrHoliday = false;
      this.isHolidayEnabledForCut = shift.isHoliday;
      this.isWeekdayOrHolidayEnabledForCut = shift.isWeekdayOrHoliday;
    }
  }
}
```

**Beispiele:**
- Shift mit isHoliday=true + isWeekdayOrHoliday=true → holidayCount=2 → Prüfe Duplicates
- Shift mit nur isWeekdayOrHoliday=true → holidayCount=1 → Button disabled ❌

#### Duplicate-Prevention (`wouldHolidayCutCreateDuplicate()`)

**Problem:** Nach dem Trennen könnte ein Shift entstehen, der identisch zu einem existierenden Shift ist.

**Lösung:** Vor dem Enablen des Buttons wird geprüft, ob das Trennen eine Dublette erzeugen würde.

```typescript
private wouldHolidayCutCreateDuplicate(selectedShift: Shift): boolean {
  for (const existingShift of this.dataManagementShiftCutService.cutShifts) {
    if (existingShift.id === selectedShift.id) {
      continue;
    }

    if (
      selectedShift.isWeekdayOrHoliday &&
      compareComplexObjects(selectedShift, existingShift, [
        'isWeekdayOrHoliday',
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

    if (
      selectedShift.isHoliday &&
      compareComplexObjects(selectedShift, existingShift, [
        'isHoliday',
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
  }

  return false;
}
```

**Logik:**
- Geht durch alle existierenden Shifts in `cutShifts`
- Verwendet `compareComplexObjects` mit Excluded-Properties-Liste
- **Check 1:** Vergleicht alle Properties außer `isWeekdayOrHoliday` (+ Metadaten)
  - Wenn `true` → Shifts sind identisch außer `isWeekdayOrHoliday` → Würde Dublette erzeugen
- **Check 2:** Vergleicht alle Properties außer `isHoliday` (+ Metadaten)
  - Wenn `true` → Shifts sind identisch außer `isHoliday` → Würde Dublette erzeugen

**Excluded Properties (dürfen unterschiedlich sein):**
- `isWeekdayOrHoliday` / `isHoliday` - Die Property, die getrennt werden soll
- `id` - Jeder Shift hat eine unique ID
- `parentId` - Child-Shifts haben unterschiedliche Parents
- `name`, `description`, `abbreviation` - Können bei Child-Shifts angepasst sein
- `lft`, `rgt` - Nested Set Model Werte sind immer unterschiedlich bei Parent/Child

**Beispiel:**
```
Shift A: Mo-Fr, 07:00-15:00, 2 MA, isHoliday=true, isWeekdayOrHoliday=true
Shift B: Mo-Fr, 07:00-15:00, 2 MA, isHoliday=true, isWeekdayOrHoliday=false (existiert bereits)

→ Wenn man Shift A nach isWeekdayOrHoliday trennt:
  - Original A: isWeekdayOrHoliday=false
  - Kopie A: isWeekdayOrHoliday=true
  - Original A wäre identisch zu Shift B → Dublette!
  - Button bleibt disabled ✓
```

#### Modal-Validierung (`isHolidayCutValid()`)

**Regel:** Save-Button nur enabled wenn **genau 1 Checkbox** ausgewählt ist.

```typescript
isHolidayCutValid(): boolean {
  const selectedCount =
    (this.holidays.isHoliday ? 1 : 0) +
    (this.holidays.isWeekdayOrHoliday ? 1 : 0);
  return selectedCount === 1;
}
```

**In Modal:**
```html
<button
  type="button"
  class="btn btn-primary"
  (click)="modal.close()"
  [disabled]="!isHolidayCutValid()"
>
  {{ "save" | translate }}
</button>
```

**Beispiele:**
- Keine Checkbox ausgewählt → Save disabled ❌
- Beide Checkboxen ausgewählt → Save disabled ❌
- Genau 1 Checkbox ausgewählt → Save enabled ✓

#### Personal/Aufgaben Validation (`analyzeCutByStaff()`, `analyzeCutByTask()`)

**Regel:**
- Minimum: 1 (mindestens 1 abtrennen)
- Maximum: Gesamtanzahl - 1 (mindestens 1 muss bleiben)
- Save-Button disabled wenn Eingabe außerhalb des Bereichs

```typescript
private analyzeCutByStaff(shift: Shift): void {
  if (shift.sumEmployees && shift.sumEmployees > 1) {
    this.minStaffCount = 1;
    this.maxStaffCount = shift.sumEmployees - 1;
  }
}
```

**Beispiel Shift mit 5 Mitarbeitern:**
- Min: 1, Max: 4
- Kann nicht alle 5 abtrennen (sonst wäre Original leer)

**Save-Button Validation:**
```html
<button
  [disabled]="!staffCount || staffCount < minStaffCount || staffCount > maxStaffCount"
>
  {{ "save" | translate }}
</button>
```

**Save-Button disabled wenn:**
- ❌ Eingabe ist leer/null
- ❌ Eingabe < Minimum
- ❌ Eingabe > Maximum

---

### 4. Übersetzungen

#### Neue Translation Keys in allen i18n Dateien:

**`de.json` (Zeile 728):**
```json
"shift.cut-shift.buttons.cut-holidays": "Nach Feiertagen trennen"
```

**`en.json` (Zeile 743):**
```json
"shift.cut-shift.buttons.cut-holidays": "Cut Holidays"
```

**`fr.json` (Zeile 733):**
```json
"shift.cut-shift.buttons.cut-holidays": "Couper par jours fériés"
```

**`it.json` (Zeile 733):**
```json
"shift.cut-shift.buttons.cut-holidays": "Taglia per giorni festivi"
```

---

## Architektur-Entscheidungen

### Separation of Concerns

**Vorher:** Wochentage und Feiertage waren im selben Modal gemischt
```typescript
weekdays = {
  isMonday: false,
  // ...
  isHoliday: false,          // ❌ Gehört nicht zu Wochentagen
  isWeekdayOrHoliday: false, // ❌ Gehört nicht zu Wochentagen
};
```

**Nachher:** Klare Trennung
```typescript
weekdays = {
  isMonday: false,
  // ... nur Wochentage
};

holidays = {
  isHoliday: false,
  isWeekdayOrHoliday: false,
};
```

### Pattern Consistency

Das neue Holiday-Feature folgt dem gleichen Pattern wie die existierenden Cut-Features:

1. **Modal Template:** `#cutHolidaysModal`
2. **ViewChild Referenz:** `@ViewChild('cutHolidaysModal')`
3. **Button Handler:** `onCutHolidays()`
4. **Perform Method:** `performCutByHolidays()`
5. **Helper Methods:** `updateOriginalShiftHolidays()`, `updateCopiedShiftHolidays()`
6. **Analyze Method:** `analyzeCutByHolidays()`

---

## Betroffene Dateien

### Modified Files:
1. `/src/app/presentation/workplace/shift/cut-shift/cut-shift-list/cut-shift-list.component.html`
2. `/src/app/presentation/workplace/shift/cut-shift/cut-shift-list/cut-shift-list.component.ts`
3. `/src/assets/i18n/de.json`
4. `/src/assets/i18n/en.json`
5. `/src/assets/i18n/fr.json`
6. `/src/assets/i18n/it.json`

### Key Changes:
- **HTML:** ~115 Zeilen geändert (neues Modal, Button, *ngIf für conditional rendering)
- **TypeScript:** ~150 Zeilen geändert (neue Methoden, Objekte, Properties)
- **i18n:** 4 neue Translation Keys

---

## Testing

### Manuelle Test-Szenarien:

#### 1. Wochentage-Trennung
- [ ] Shift mit 2+ Wochentagen auswählen → Button enabled
- [ ] Shift mit nur 1 Wochentag auswählen → Button disabled
- [ ] Modal öffnen → Nur vorhandene Wochentage sichtbar
- [ ] Wochentag abtrennen → Original verliert Wochentag, Kopie erhält ihn

#### 2. Feiertage-Trennung
- [ ] Shift mit isHoliday=true + isWeekdayOrHoliday=true → Button enabled (holidayCount=2)
- [ ] Shift mit nur isWeekdayOrHoliday=true → Button disabled (holidayCount=1)
- [ ] Shift mit identischem existierendem Child → Button disabled (Duplicate-Prevention)
- [ ] Modal öffnen → Nur vorhandene Holiday-Optionen sichtbar
- [ ] Modal: Keine Checkbox ausgewählt → Save disabled
- [ ] Modal: Beide Checkboxen ausgewählt → Save disabled
- [ ] Modal: Genau 1 Checkbox ausgewählt → Save enabled
- [ ] Feiertag abtrennen → Original verliert Feiertag, Kopie erhält ihn

#### 3. Personal-Trennung
- [ ] Shift mit 5 MA auswählen → Min: 1, Max: 4
- [ ] Eingabe 0 → Save disabled
- [ ] Eingabe 5 → Save disabled
- [ ] Eingabe 3 → Save enabled, trennt 3 MA ab, 2 bleiben

#### 4. Aufgaben-Trennung
- [ ] Shift mit 10 Aufgaben auswählen → Min: 1, Max: 9
- [ ] Eingabe 0 → Save disabled
- [ ] Eingabe 10 → Save disabled
- [ ] Eingabe 5 → Save enabled, trennt 5 Aufgaben ab, 5 bleiben

#### 5. Multi-Language
- [ ] DE: "Nach Feiertagen trennen"
- [ ] EN: "Cut Holidays"
- [ ] FR: "Couper par jours fériés"
- [ ] IT: "Taglia per giorni festivi"

---

## Build Status

✅ Build erfolgreich: `npx ng build --configuration development`
- Exit Code: 0
- Build Time: ~59 seconds (durchschnittlich)
- Output: `/dist/klacks.ui`

**Mehrere Builds während Implementierung:**
1. Initiales Holiday-Feature: 79.008s
2. Duplicate-Prevention mit Debug-Logging: 59.714s
3. Debug-Logging entfernt: 58.518s
4. `lft/rgt` hinzugefügt: 59.126s
5. Finale Version: 59.770s

---

## Lessons Learned / Debug-Erfahrungen

### Problem 1: Falsche Excluded-Properties in `compareComplexObjects`

**Initial-Implementierung:**
```typescript
compareComplexObjects(selectedShift, existingShift, [
  'isWeekdayOrHoliday',
  'id',
  'parentId',
  'name',
  'description',
  'abbreviation',
  // ❌ lft und rgt fehlten!
])
```

**Problem:**
- `lft` und `rgt` (Nested Set Model) wurden verglichen
- Diese sind bei Parent/Child-Shifts immer unterschiedlich
- `compareComplexObjects` gab immer `false` zurück
- Duplicate-Prevention funktionierte nicht

**Lösung:**
```typescript
compareComplexObjects(selectedShift, existingShift, [
  'isWeekdayOrHoliday',
  'id',
  'parentId',
  'name',
  'description',
  'abbreviation',
  'lft',  // ✅ Hinzugefügt
  'rgt',  // ✅ Hinzugefügt
])
```

**Erkenntnis:** Bei Nested Set Model Implementierungen müssen `lft` und `rgt` IMMER von Vergleichen ausgeschlossen werden, da diese bei Parent/Child-Beziehungen zwingend unterschiedlich sind.

### Problem 2: Vertauschte Excluded-Properties

**Initial-Implementierung:**
```typescript
if (selectedShift.isWeekdayOrHoliday) {
  compareComplexObjects(selectedShift, existingShift, [
    'isHoliday',  // ❌ FALSCH! Sollte 'isWeekdayOrHoliday' sein
    // ...
  ])
}

if (selectedShift.isHoliday) {
  compareComplexObjects(selectedShift, existingShift, [
    'isWeekdayOrHoliday',  // ❌ FALSCH! Sollte 'isHoliday' sein
    // ...
  ])
}
```

**Problem:** Die ausgeschlossene Property war vertauscht - die Condition und die Excluded-Property müssen matchen.

**Lösung:** Die Property, die in der Condition geprüft wird, muss auch excluded werden:
```typescript
if (selectedShift.isWeekdayOrHoliday) {
  compareComplexObjects(selectedShift, existingShift, [
    'isWeekdayOrHoliday',  // ✅ Korrekt
    // ...
  ])
}

if (selectedShift.isHoliday) {
  compareComplexObjects(selectedShift, existingShift, [
    'isHoliday',  // ✅ Korrekt
    // ...
  ])
}
```

### Problem 3: Missverständnis über Excluded-Liste

**Initiale Annahme:** Die Excluded-Liste sollte NUR die zu trennende Property enthalten.

**User-Korrektur:** "id, name, description, abbreviation dürfen nicht vergleichen werden, diese können und dürfen anders sein"

**Erkenntnis:**
- Die Excluded-Liste enthält ALLE Properties, die unterschiedlich sein dürfen
- Das sind sowohl die zu trennende Property (z.B. `isWeekdayOrHoliday`)
- Als auch Metadaten-Properties (`id`, `parentId`, `name`, etc.) die bei Child-Shifts anders sind
- Und Nested-Set-Properties (`lft`, `rgt`) die bei allen Parent/Child-Beziehungen unterschiedlich sind

**Finale Excluded-Liste:**
```typescript
[
  'isWeekdayOrHoliday',  // Die zu trennende Property
  'id',                  // Unique ID
  'parentId',            // Parent-Beziehung
  'name',                // Kann bei Cuts angepasst werden
  'description',         // Kann bei Cuts angepasst werden
  'abbreviation',        // Kann bei Cuts angepasst werden
  'lft',                 // Nested Set Model (immer unterschiedlich)
  'rgt',                 // Nested Set Model (immer unterschiedlich)
]
```

---

## Bekannte Einschränkungen

Keine bekannten Einschränkungen.

---

## Zukünftige Verbesserungen

Potenzielle Erweiterungen:
1. Backend-Integration für Feiertage-Trennung prüfen
2. Unit Tests für neue Methoden hinzufügen
3. E2E Tests für User-Flows erstellen
4. Duplicate-Prevention auch für Weekday-Cuts implementieren

---

## Autoren

- Claude Code (Implementierung)
- Heribert Gasparoli (Review & Testing)

---

## Versionshinweise

Diese Dokumentation beschreibt die Änderungen vom 24. Oktober 2025.

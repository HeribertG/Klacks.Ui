# Schedule Architektur

## Komponenten-Hierarchie

```
ScheduleHeaderComponent
  - Monat/Jahr-Auswahl
  - Kalender-Selektor für Feiertage
  - Zoom-Slider
        |
        +--- ScheduleSectionComponent (Beschäftigungen)
        |         |
        |         +--- ScheduleDataService
        |                 - startDate
        |                 - columns
        |                 - getWeekday()
        |                 - holidayInfo()
        |
        +--- ShiftSectionComponent (Dienste)
                  |
                  +--- ShiftDataService
                          - startDate
                          - columns
                          - getWeekday()
                          - holidayInfo()
```

## Beschäftigungen vs Dienste

| Kriterium | Beschäftigungen | Dienste |
|-----------|----------------|---------|
| Bezahlt von | Firma | Kunde |
| Typ | Interne Tätigkeit / Abwesenheit | Kundenbestellung |
| Hat Kundenbezug | Nein | Ja (Kunde bestellt) |
| Beispiel | Urlaub, Krankheit, Schulung | Pflegedienst, Betreuung |

## Absenzen (= Beschäftigungen)

Alle Beschäftigungen werden als Absenzen definiert:
- Urlaub, Krankheit, Mutterschaft
- Weiterbildung, Gesperrte Tage
- Unbezahlter Urlaub

**Wichtige Flags:**
- `Undeletable = true` - Kann NICHT gelöscht werden (Urlaub, Krankheit, Unfall)
- `HideInGantt = true` - Wird NICHT im Gantt-Kalender angezeigt

## Horizontale Scroll-Synchronisierung

```
ScheduleContainerComponent
    |
    +--- ScheduleSectionComponent
    |      H-Scrollbar.valueChange -> hScrollPositionChange.emit(value)
    |                      |
    |         hScrollPosition = value (direktes Binding)
    |                      |
    +--- ShiftSectionComponent
           @Input() hScrollPosition -> scrollService.horizontalScrollPosition
```

**Jede Section hat eigenen ScrollService:**
- `schedule-section`: eigener ScrollService (providers)
- `shift-section`: eigener ScrollService (providers)

## Monatsberechnung

| Komponente | Monats-Basis | Beispiel Dezember |
|------------|--------------|-------------------|
| JavaScript `Date` | 0-basiert | 11 |
| `WorkFilter.currentMonth` | 1-basiert | 12 |
| `getDaysInMonth()` | 0-basiert | 11 |
| `monthsName[]` Array | 0-basiert | Index 11 |

**Korrekte Verwendung:**
```typescript
public override initializeDateAndColumns(): void {
  const currentMonth = this.dataManagementSchedule.workFilter.currentMonth;  // 1-basiert!

  // Date braucht 0-basiert -> -1
  this.startDate = new Date(currentYear, currentMonth - 1, 1);

  // getDaysInMonth braucht 0-basiert -> -1
  this.columns = getDaysInMonth(currentYear, currentMonth - 1) +
                 dayVisibleBeforeMonth + dayVisibleAfterMonth;
}
```

## Feiertags-Integration

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

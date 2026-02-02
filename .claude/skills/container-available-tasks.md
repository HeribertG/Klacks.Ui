# Container Available Tasks Filter

## Service

`ContainerAvailableTasksService` filtert verfügbare Shifts für Container Templates.

**Backend:** `Klacks.Api/Domain/Services/ContainerTemplates/ContainerAvailableTasksService.cs`

## Basis-Filter (Immer aktiv)

```csharp
.Where(s => s.ShiftType == ShiftType.IsTask)      // Nur Tasks
.Where(s => s.Status >= ShiftStatus.OriginalShift) // Status >= 2
.Where(s => !s.IsSporadic)                         // Keine sporadischen
.Where(s => !usedShiftIds.Contains(s.Id))          // Nicht bereits verwendet
```

## Zeitfenster-Filter

### Normale Shifts (IsTimeRange = false)

Müssen **komplett innerhalb** des Zeitfensters liegen.
Shifts die Mitternacht überschreiten werden **immer ausgeschlossen**.

**Ohne Mitternachtsüberschreitung:**
```csharp
StartShift >= fromTime && EndShift <= untilTime && StartShift < EndShift
```

**Mit Mitternachtsüberschreitung (z.B. 22:00-06:00):**
```csharp
(StartShift >= fromTime || EndShift <= untilTime) && StartShift < EndShift
```

### TimeRange Shifts (IsTimeRange = true)

Dürfen mit dem Zeitfenster **überlappen**.

**Ohne Mitternachtsüberschreitung:**
```csharp
StartShift < untilTime && EndShift > fromTime
```

**Mit Mitternachtsüberschreitung:**
```csharp
StartShift < untilTime || EndShift > fromTime
```

## Beispiele: Zeitfenster 08:00-12:00

### Normale Shifts

| Shift | Start | End | Verfügbar? |
|-------|-------|-----|------------|
| A | 09:00 | 11:00 | Ja |
| B | 08:00 | 12:00 | Ja (Rand) |
| C | 07:00 | 09:00 | Nein (Start < fromTime) |
| D | 23:00 | 07:00 | Nein (überschreitet Mitternacht) |

### TimeRange Shifts

| Shift | Start | End | Verfügbar? |
|-------|-------|-----|------------|
| A | 07:00 | 09:00 | Ja (Überlappung) |
| B | 11:00 | 13:00 | Ja (Überlappung) |
| C | 05:00 | 07:00 | Nein (keine Überlappung) |

## Gruppen-Filter

Tasks müssen in mindestens einer gemeinsamen Gruppe mit dem Container sein.

```csharp
if (shiftsInSameGroups.Count > 1) {
    query = query.Where(s => shiftsInSameGroups.Contains(s.Id));
}
// Bei <= 1: Kein Gruppen-Filter (Fallback)
```

## Wochentags-Filter

```csharp
weekday switch {
    0 => query.Where(s => s.IsSunday),
    1 => query.Where(s => s.IsMonday),
    // ...
    6 => query.Where(s => s.IsSaturday),
}
```

## Such-Filter (Optional)

Durchsucht: `Name`, `Abbreviation`, `Description` (case-insensitive)

## Feiertags-Filter (Optional)

```csharp
if (isHoliday.HasValue)
    query = query.Where(s => s.IsHoliday == isHoliday.Value);

if (isWeekdayAndHoliday.HasValue)
    query = query.Where(s => s.IsWeekdayAndHoliday == isWeekdayAndHoliday.Value);
```

## Sortierung

```csharp
.OrderBy(s => s.StartShift)
.ThenBy(s => s.Client!.Name)
```

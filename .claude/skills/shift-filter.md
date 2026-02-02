# Shift Status Filter

## Enums

```csharp
public enum ShiftStatus {
    OriginalOrder = 0,   // Ursprüngliche Bestellung
    SealedOrder = 1,     // Versiegelte Bestellung
    OriginalShift = 2,   // Ursprünglicher Dienst
    SplitShift = 3       // Geteilter Dienst
}

public enum ShiftType {
    IsTask = 0,       // Normaler Dienst
    IsContainer = 1   // Container-Dienst
}

public enum ShiftFilterType {
    Original = 0,   // Bestellungen anzeigen
    Shift = 1,      // Planbare Dienste
    Container = 2,  // Container
    Absence = 3     // Abwesenheiten
}
```

## Filter-Logik

### Original-Filter (Bestellungen)

**Ohne isSealedOrder:**
```csharp
query.Where(shift => shift.ShiftType == ShiftType.IsTask
                  && shift.Status == ShiftStatus.OriginalOrder)
```

**Mit isSealedOrder = true:**
```csharp
query.Where(shift => shift.Status == ShiftStatus.SealedOrder)
// Zeigt ALLE mit Status=SealedOrder (Tasks + Container)
```

### Shift-Filter (Planbare Dienste)

```csharp
query.Where(shift => shift.Status >= ShiftStatus.OriginalShift
                  && shift.ShiftType == ShiftType.IsTask)
// isSealedOrder hat KEINE Auswirkung
```

### Container-Filter

```csharp
query.Where(shift => shift.Status == ShiftStatus.OriginalShift
                  && shift.ShiftType == ShiftType.IsContainer)
// isSealedOrder hat KEINE Auswirkung
```

## Zusammenfassung isSealedOrder

| FilterType | isSealedOrder=false | isSealedOrder=true |
|------------|---------------------|-------------------|
| Original | Status=0 UND ShiftType=0 | NUR Status=1 |
| Shift | Status>=2 UND ShiftType=0 | Keine Änderung |
| Container | Status=2 UND ShiftType=1 | Keine Änderung |

## Group & Visibility Filtering

### Filter-Logik

```
selectedGroupId vorhanden?
├── JA -> Filter nach Gruppe + Untergruppen
└── NEIN
     ├── User ist Admin? -> Alle Shifts
     └── Non-Admin mit GroupVisibility
          ├── Hat Einträge -> Filter nach sichtbaren Gruppen
          └── Leer -> Alle Shifts
```

### Gruppen-Hierarchie

Wenn Gruppe A ausgewählt:
- Shifts in A, B (Kind), C (Enkel) werden angezeigt
- Shifts ohne Gruppe werden immer angezeigt

### SQL (Rekursives CTE)

```sql
WITH RECURSIVE group_hierarchy AS (
    SELECT g.id FROM "group" g
    WHERE g.id = selected_group_id
    UNION ALL
    SELECT g.id FROM "group" g
    INNER JOIN group_hierarchy gh ON g.parent = gh.id
)
```

## Dateien

**Service:** `ShiftStatusFilterService.cs`
**Tests:** `ShiftStatusFilterServiceTests.cs`

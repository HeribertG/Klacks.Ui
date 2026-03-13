---
name: schedule-client-filter
description: Verwende wenn am ClientFilter-Component, Sortierung oder Entity-Typ-Filterung im Schedule gearbeitet wird
---

# Client Filter

## Shared Component

Der `ClientFilterComponent` ist eine wiederverwendbare Komponente für Filter-Dropdowns:

```
src/app/presentation/shared/client-filter/
+-- client-filter.component.ts
+-- client-filter.component.html
+-- client-filter.component.scss
+-- client-filter.interface.ts
```

## Verwendung

| Ansicht | Service | Filter-Objekt |
|---------|---------|---------------|
| Schedule | `DataManagementScheduleService` | `workFilter` |
| Absence-Gantt | `DataManagementBreakPlaceholderService` | `breakFilter` |

## IClientTypeFilter Interface

```typescript
export interface IClientTypeFilter {
  orderBy: string;           // 'name' | 'group' | 'hours'
  sortOrder: string;         // 'asc' | 'desc'
  showEmployees: boolean;    // Mitarbeiter anzeigen
  showExtern: boolean;       // Externe anzeigen
  hoursSortOrder: string | undefined;  // Sekundäre Sortierung nach Stunden
}
```

## Filter-Optionen

| Option | Beschreibung |
|--------|--------------|
| **Nachname** | Sortierung nach Client-Nachname |
| **Gruppenzugehörigkeit** | Sortierung nach Gruppenname |
| **Vertraglich garantierte Stunden** | Sortierung nach `Contract.GuaranteedHoursPerMonth` |
| **Mitarbeiter** | Checkbox - EntityTypeEnum.Employee (0) |
| **Externe** | Checkbox - EntityTypeEnum.ExternEmp (1) |

## Sortierung

- **Primäre Sortierung:** `orderBy` + `sortOrder`
- **Sekundäre Sortierung:** `hoursSortOrder` (unabhängig, als ThenBy)

```csharp
// Backend: WorkRepository.cs
query = ApplyOrderBy(query, filter, refDate);

if (!string.IsNullOrEmpty(filter.HoursSortOrder)) {
    query = filter.HoursSortOrder == "asc"
        ? query.ThenBy(...)
        : query.ThenByDescending(...);
}
```

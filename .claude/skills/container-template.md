# Container Template

## Konzept

Container-Shifts (`ShiftType = IsContainer`) können mehrere ContainerTemplates haben. Jedes Template definiert:
- **Wochentag** (0=Sonntag bis 6=Samstag)
- **Zeitfenster** (FromTime, UntilTime)
- **Feiertag-Regelung** (IsWeekdayAndHoliday, IsHoliday)
- **Task-Shifts** (ContainerTemplateItems)

## Datenmodell

```typescript
interface IContainerTemplate {
  id: string;
  containerId: string;
  fromTime: string;       // "HH:mm:ss"
  untilTime: string;      // "HH:mm:ss"
  weekday: number;        // 0-6
  isWeekdayAndHoliday: boolean;
  isHoliday: boolean;
  items: IContainerTemplateItem[];
}

interface IContainerTemplateItem {
  id?: string;
  tmpId?: string;         // Für neue Items vor Save
  containerTemplateId: string;
  shiftId: string;
  shift?: IShift;
}
```

## Wochentag-Mapping

| Weekday | Tag |
|---------|-----|
| 0 | Sonntag |
| 1 | Montag |
| 2 | Dienstag |
| 3 | Mittwoch |
| 4 | Donnerstag |
| 5 | Freitag |
| 6 | Samstag |

## Feiertag-Kombinationen

| IsWeekdayAndHoliday | IsHoliday | Bedeutung |
|---------------------|-----------|-----------|
| false | false | Nur an regulären Wochentagen |
| true | false | An Wochentagen UND Feiertagen |
| false | true | Nur an Feiertagen |

## API Endpunkte

**Basis:** `/api/v1/user-backend/containers`

| Method | Route | Beschreibung |
|--------|-------|--------------|
| GET | `/templates` | Alle Templates |
| GET | `/templates/{id}` | Template by ID |
| POST | `/templates` | Create |
| PUT | `/templates` | Update |
| DELETE | `/templates/{id}` | Delete |
| GET | `/available-tasks` | Verfügbare Tasks |

## Available Tasks Query Parameter

| Parameter | Typ | Required | Beschreibung |
|-----------|-----|----------|--------------|
| `containerId` | Guid | Ja | Container-Shift ID |
| `weekday` | int | Ja | Wochentag (0-6) |
| `fromTime` | string | Ja | "HH:mm:ss" |
| `untilTime` | string | Ja | "HH:mm:ss" |
| `searchString` | string | Nein | Suchtext |
| `excludeContainerId` | Guid | Nein | Beim Bearbeiten |

## Frontend Services

```
DataManagementContainerService
├── loadTemplates()
├── loadTasksForWeekday()
├── filterAvailableTasksBySearch()
├── updateTaskOrderInTemplates()
├── areObjectsDirty()
└── resetData()

ContainerTemplateShiftService (Signals)
├── weekdayContainerTemplateItemsSignal
├── allLoadedShiftsSignal
└── selectedContainerTemplateItems (computed, sorted)
```

## Automatische Sortierung (Zone 2)

Zone 2 sortiert immer automatisch nach Zeit:
- **TimeRange-Shifts** (`isTimeRange = true`): nach `timeRangeStartShift`
- **Fix-Shifts** (`isTimeRange = false`): nach `startShift`

## tmpId System

Neue Items erhalten eine temporäre ID bis zum Speichern:

```typescript
const newItem: IContainerTemplateItem = {
  tmpId: newGuid(),  // Temporär
  shiftId: shift.id,
  // ...
};
```

Track-By in Templates: `track shift.id || shift.tmpId`

## Dateien

**Frontend:**
- `container-template.component.ts`
- `data-management.container.service.ts`
- `container-template-shift.service.ts`
- `data-container-template.service.ts`

**Backend:**
- `ContainersController.cs`
- `ContainerTemplateRepository.cs`
- `ContainerAvailableTasksService.cs`

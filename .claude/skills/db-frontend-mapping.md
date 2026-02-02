# DB → Frontend Mapping

## Architektur

```
PostgreSQL → Klacks.Api → REST API → Klacks.Ui
(Tables)    (Domain/Models)  (JSON)    (domain/models)
            (Persistence)             (infrastructure/api)
```

## Entity-Mapping

### Stammdaten

| DB Tabelle | BE Entity | Controller | FE Service | FE Model |
|------------|-----------|------------|------------|----------|
| `client` | `Client.cs` | `ClientsController` | `data-client.service.ts` | `client-class.ts` |
| `address` | `Address.cs` | `AddressesController` | `data-client.service.ts` | `address-attribute-member-class.ts` |
| `membership` | `Membership.cs` | `MembershipsController` | `data-client.service.ts` | `client-class.ts` |
| `client_contract` | `ClientContract.cs` | `ContractsController` | `data-contract.service.ts` | `contract-class.ts` |

### Gruppen

| DB Tabelle | BE Entity | Controller | FE Service | FE Model |
|------------|-----------|------------|------------|----------|
| `group` | `Group.cs` | `GroupsController` | `data-group.service.ts` | `group-class.ts` |
| `group_item` | `GroupItem.cs` | `GroupItemsController` | `data-group-item.service.ts` | `client-group-item-class.ts` |
| `group_visibility` | `GroupVisibility.cs` | `GroupVisibilitiesController` | `data-group-visibility.service.ts` | `group-class.ts` |

### Schichten

| DB Tabelle | BE Entity | Controller | FE Service | FE Model |
|------------|-----------|------------|------------|----------|
| `shift` | `Shift.cs` | `ShiftsController` | `data-shift.service.ts` | `shift-class.ts` |
| `container_template` | `ContainerTemplate.cs` | `ContainersController` | `data-container-template.service.ts` | `container-template-class.ts` |

### Arbeitsplanung

| DB Tabelle | BE Entity | Controller | FE Service | FE Model |
|------------|-----------|------------|------------|----------|
| `work` | `Work.cs` | `WorksController` | `data-schedule.service.ts` | `schedule-class.ts` |
| `work_change` | `WorkChange.cs` | `WorksController` | `data-schedule.service.ts` | `schedule-class.ts` |
| `expenses` | `Expenses.cs` | `ExpensesController` | `data-schedule.service.ts` | `schedule-class.ts` |

### Abwesenheiten

| DB Tabelle | BE Entity | Controller | FE Service | FE Model |
|------------|-----------|------------|------------|----------|
| `absence` | `Absence.cs` | `AbsencesController` | `data-absence.service.ts` | `absence-class.ts` |
| `break` | `Break.cs` | `BreaksController` | - | - |

### Kalender

| DB Tabelle | BE Entity | Controller | FE Service | FE Model |
|------------|-----------|------------|------------|----------|
| `calendar_rule` | `CalendarRule.cs` | `CalendarRulesController` | `data-calendar-rule.service.ts` | `calendar-rule-class.ts` |
| `calendar_selection` | `CalendarSelection.cs` | `CalendarSelectionsController` | `data-calendar-selection.service.ts` | `calendar-selection-class.ts` |

### Einstellungen

| DB Tabelle | BE Entity | Controller | FE Service | FE Model |
|------------|-----------|------------|------------|----------|
| `settings` | `Settings.cs` | `GeneralSettingsController` | `data-settings-various.service.ts` | `settings-various-class.ts` |
| `branch` | `Branch.cs` | `BranchController` | `data-branch.service.ts` | `general-class.ts` |
| `contract` | `Contract.cs` | `ContractsController` | `data-contract.service.ts` | `contract-class.ts` |

## Keyless Entities (SQL Functions)

| BE Entity | SQL Function | Verwendung |
|-----------|--------------|------------|
| `ScheduleCell.cs` | `get_work_schedule()` | WorkSchedule-Abfragen |
| `ClientScheduleDetail.cs` | `get_break_schedule()` | Break/Absence Gantt |

## API-Routen

- UserBackend: `api/backend/{controller}`
- Assistant: `api/assistant/{controller}`

## SignalR Hub

| Hub | Pfad | Verwendung |
|-----|------|------------|
| `WorkNotificationHub` | `/api/backend/workNotifications` | Work/Schedule Änderungen |

FE Service: `signalr.service.ts`

## Datenfluss-Beispiel

```
1. FE: data-client.service.ts → GET api/backend/Clients/{id}
2. BE: ClientsController.Get(id) → GetQueryHandler → ClientRepository
3. DB: SELECT * FROM client WHERE id = ...
4. BE: Client → ClientResource (DTO) → JSON
5. FE: JSON → IClient → client-class.ts
```

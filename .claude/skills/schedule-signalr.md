# Schedule SignalR & Stored Procedures

## SignalR Hubs

| Hub | Endpoint | Zweck |
|-----|----------|-------|
| WorkHub | `/hubs/work` | Work CRUD Benachrichtigungen |
| ShiftStatsHub | `/hubs/shiftstats` | Schicht-Statistiken (engaged count) |
| PeriodHoursHub | `/hubs/periodhours` | Monatsstunden pro Client |

## SignalR Events

| Hub | Event | Trigger |
|-----|-------|---------|
| WorkHub | `WorkCreated` | Work POST |
| WorkHub | `WorkUpdated` | Work PUT |
| WorkHub | `WorkDeleted` | Work DELETE |
| ShiftStatsHub | `ShiftStatsUpdated` | Work CRUD |
| PeriodHoursHub | `PeriodHoursUpdated` | Work/Break/WorkChange CRUD |

## ConnectionId Flow

```typescript
// Frontend Interceptor
headers['X-SignalR-ConnectionId'] = this.signalRService.connectionId;
```

```csharp
// Backend
var connectionId = _httpContextAccessor.HttpContext?.Request
    .Headers["X-SignalR-ConnectionId"].FirstOrDefault();

// Event an alle AUSSER Sender
await _hubContext.Clients.AllExcept(connectionId).WorkCreated(notification);
```

## Stored Procedures

### get_work_schedule()

Liefert Schedule-Einträge (Work, WorkChange, Expenses, Break).

```sql
get_work_schedule(
    start_date DATE,
    end_date DATE,
    visible_group_ids UUID[],
    current_language TEXT,
    fallback_order TEXT[]
)
```

**Entry Types:**
| Type | Name |
|------|------|
| 0 | Work |
| 1 | WorkChange |
| 2 | Expenses |
| 3 | Break |

### get_shift_schedule()

Liefert Shifts pro Tag mit engaged-Count.

```sql
get_shift_schedule(
    start_date DATE,
    end_date DATE,
    holiday_dates DATE[],
    visible_group_ids UUID[],
    show_ungrouped_shifts BOOLEAN
)
```

### get_shift_schedule_partial()

Für Partial Refresh nach Work CRUD.

```sql
get_shift_schedule_partial(
    shift_date_pairs shift_date_pair[]
)
```

## ScheduleCell Model

```typescript
interface IScheduleCell {
  id: string;
  entryType: number;        // 0-3
  sourceId: string;         // Work oder Break ID
  clientId: string;
  entryDate: string;
  startTime?: string;
  endTime?: string;
  changeTime?: number;
  workChangeType?: number;  // 0-3
  description?: string;
  shiftId: string;
  entryName?: string;       // Shift-Name oder Absence-Name
  replaceClientId?: string;
  isReplacementEntry: boolean;
}
```

## WorkChange Types

| Type | Name | Beschreibung |
|------|------|--------------|
| 0 | CorrectionEnd | Zeitkorrektur am Ende |
| 1 | CorrectionStart | Zeitkorrektur am Start |
| 2 | ReplacementStart | Ersetzung am Start |
| 3 | ReplacementEnd | Ersetzung am Ende |

## Frontend Services

```
DataWorkScheduleService (API)
    ↓
WorkScheduleLoaderService (Caching, SignalR)
    ↓
DataManagementScheduleService (State)
    ↓
ScheduleDataService (Grid Rendering)
```

## CRUD mit SignalR

```
POST /Works
    + X-SignalR-ConnectionId Header
    + periodStart/periodEnd im Body

Response enthält:
    + Work-Daten
    + PeriodHours (neu berechnet)

SignalR Events (an alle außer Sender):
    + WorkCreated
    + ShiftStatsUpdated
    + PeriodHoursUpdated
```

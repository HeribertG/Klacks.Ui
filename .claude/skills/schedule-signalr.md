---
name: schedule-signalr
description: Verwende wenn an SignalR-Hubs, Echtzeit-Benachrichtigungen oder Schedule-WebSocket-Events gearbeitet wird
---

# Schedule SignalR & Stored Procedures

## SignalR Hubs

| Hub | Interface | Endpoint | Zweck |
|-----|-----------|----------|-------|
| WorkNotificationHub | IScheduleClient | `/hubs/work-notifications` | Work/Schedule Änderungen |
| EmailNotificationHub | IEmailClient | `/hubs/email-notifications` | E-Mail Benachrichtigungen |
| AssistantNotificationHub | IAssistantClient | `/hubs/assistant-notifications` | LLM Assistant Events |

## SignalR Events

### WorkNotificationHub (IScheduleClient) - 9 Events

| Event | Trigger |
|-------|---------|
| `WorkCreated` | Work POST |
| `WorkUpdated` | Work PUT |
| `WorkDeleted` | Work DELETE |
| `ScheduleUpdated` | Schedule-weite Änderungen |
| `ShiftStatsUpdated` | Work CRUD (engaged count) |
| `PeriodHoursUpdated` | Work/Break/WorkChange CRUD |
| `PeriodHoursRecalculated` | Bulk Recalculation |
| `ScheduleChangeTracked` | Change Tracking Event |
| `CollisionsDetected` | Kollisions-Erkennung |

### EmailNotificationHub (IEmailClient) - 2 Events

| Event | Trigger |
|-------|---------|
| `NewEmailsReceived` | Neue E-Mails eingegangen |
| `EmailReadStateChanged` | E-Mail gelesen/ungelesen |

### AssistantNotificationHub (IAssistantClient) - 2 Events

| Event | Trigger |
|-------|---------|
| `ProactiveMessage` | LLM sendet proaktive Nachricht |
| `OnboardingPrompt` | Onboarding-Hinweis |

## Group-Naming

- Schedule-Gruppen: `schedule_{startDate}_{endDate}`
- Client-Gruppen: `client_{clientId}`

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

### get_schedule_entries()

Liefert Schedule-Einträge (Work, WorkChange, Expenses, Break).

```sql
get_schedule_entries(
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

### get_client_availability_for_schedule()

Liefert Client-Verfügbarkeit für den Schedule-Zeitraum.

## IScheduleCell Model (22 Felder)

```typescript
interface IScheduleCell {
  id: string;
  entryType: number;           // 0-3
  sourceId: string;            // Work oder Break ID
  clientId: string;
  entryDate: string;
  startTime?: string;
  endTime?: string;
  changeTime?: number;
  surcharges?: number;
  workChangeType?: number;     // 0-3
  description?: string;
  information?: string;
  amount?: number;
  toInvoice?: boolean;
  taxable?: boolean;
  entryId?: string;
  entryName?: string;          // Shift-Name oder Absence-Name
  abbreviation?: string;
  replaceClientId?: string;
  isReplacementEntry: boolean;
  lockLevel?: number;
  isGroupRestricted?: boolean;
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

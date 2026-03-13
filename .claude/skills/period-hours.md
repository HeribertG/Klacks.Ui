---
name: period-hours
description: Verwende wenn an PeriodHours-Caching, Stunden-Berechnung pro Client/Periode oder PaymentInterval gearbeitet wird
---

# Period Hours (Client-Stunden)

## Konzept

`ClientPeriodHours` speichert berechnete Stunden pro Client und Periode für schnelle Abfrage im Schedule.

## Datenmodell (Backend Entity)

```csharp
public class ClientPeriodHours : BaseEntity
{
    public Guid ClientId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal Hours { get; set; }
    public decimal Surcharges { get; set; }
    public PaymentInterval PaymentInterval { get; set; } // Default: Monthly
    public Guid? IndividualPeriodId { get; set; }
    public DateTime CalculatedAt { get; set; }

    public virtual Client? Client { get; set; }
    public virtual IndividualPeriod? IndividualPeriod { get; set; }
}
```

## EF Core Konfiguration

```csharp
// Unique Index über (ClientId, StartDate, EndDate)
modelBuilder.Entity<ClientPeriodHours>()
    .HasIndex(p => new { p.ClientId, p.StartDate, p.EndDate })
    .IsUnique();

// Query Filter: Nur Clients die nicht gelöscht sind
modelBuilder.Entity<ClientPeriodHours>()
    .HasQueryFilter(p => !p.Client!.IsDeleted);
```

## PaymentInterval

| Interval | Start | Ende |
|----------|-------|------|
| Weekly (0) | Montag | Sonntag |
| Biweekly (1) | Montag Woche 1 | Sonntag Woche 2 |
| Monthly (2) | 1. des Monats | Letzter Tag |
| Individual (3) | IndividualPeriod.FromDate | IndividualPeriod.UntilDate |

## API Response (DTO)

Kein Frontend-TypeScript-Model vorhanden. Daten kommen direkt als API-DTO:

```typescript
// PeriodHoursResource (im WorkScheduleResponse)
interface PeriodHoursResource {
  hours: number;
  surcharges: number;
  guaranteedHours: number;
}

interface WorkScheduleResponse {
  entries: IScheduleCell[];
  clients: IClient[];
  periodHours: {
    [clientId: string]: PeriodHoursResource;
  };
  totalClientCount: number;
}
```

## SignalR Events

| Hub | Event | Trigger |
|-----|-------|---------|
| WorkNotificationHub | `PeriodHoursUpdated` | Work/Break/WorkChange CRUD |
| WorkNotificationHub | `PeriodHoursRecalculated` | Bulk Recalculation |

## Frontend: ConnectionId Header

```typescript
// HTTP Interceptor
headers['X-SignalR-ConnectionId'] = this.signalRService.connectionId;
```

Backend schließt den Sender vom SignalR-Event aus.

## Berechnung

1. **Cache vorhanden**: Lese aus `ClientPeriodHours`
2. **Kein Cache**: Berechne aus `Work` + `WorkChange`

```csharp
Hours = SUM(Work.WorkTime)
Surcharges = SUM(Work.Surcharges) + SUM(WorkChange.ChangeTime WHERE ToInvoice)
```

## CRUD Flow

```
User erstellt Work
    ↓
POST /Works (+ X-SignalR-ConnectionId Header)
    ↓
WorkRepository.Add()
    ↓
PeriodHoursService.RecalculateAndNotifyAsync()
    ↓
SignalR: PeriodHoursUpdated (außer Sender)
    ↓
HTTP Response mit neuem PeriodHours
```

## Row Header Anzeige

```typescript
// ScheduleDataService
getRowHeaderSlot1Text() → GuaranteedHours (170h)
getRowHeaderSlot2Text() → ActualHours (168h)
getRowHeaderSlot3Text() → Surcharges (+5h)
```

## Cache Invalidierung

Bei Work/Break/WorkChange CRUD werden ALLE Cache-Einträge des Clients gelöscht:

```csharp
var otherCacheEntries = await _context.ClientPeriodHours
    .Where(p => p.ClientId == clientId
        && (p.StartDate != startDate || p.EndDate != endDate))
    .ToListAsync();
_context.ClientPeriodHours.RemoveRange(otherCacheEntries);
```

## Services

**Backend:**
- `IPeriodHoursService`
- `PeriodHoursBackgroundService` (Bulk)

**Frontend:**
- `WorkScheduleLoaderService`
- `ScheduleDataService`

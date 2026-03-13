---
name: schedule-period-hours
description: Verwende wenn an der PeriodHours-Anzeige im Schedule Row-Header oder PaymentInterval-Logik gearbeitet wird
---

# Client Period Hours (Periodenbasierte Stundenplanung)

## Konzept

`ClientPeriodHours` speichert die aggregierten Stunden eines Clients pro Planungsperiode. Die Periodenart wird durch `PaymentInterval` bestimmt:

```
PaymentInterval (Enum)
+----------------+---------------------------------------------------+
| Weekly (0)     | Wöchentliche Planung                              |
| Biweekly (1)   | 2-wöchentliche Planung                            |
| Monthly (2)    | Monatliche Planung (Default)                      |
| Individual (3) | Benutzerdefiniert -> IndividualPeriodId            |
+----------------+---------------------------------------------------+
```

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

## Anwendungsfall

Jeder Client, der verplant wird, erhält `n` ClientPeriodHours-Einträge:

| PaymentInterval | Beispiel | StartDate | EndDate |
|-----------------|----------|-----------|---------|
| **Monthly** | Januar 2026 | 2026-01-01 | 2026-01-31 |
| **Weekly** | KW 5/2026 | 2026-01-27 | 2026-02-02 |
| **Biweekly** | KW 2-3/2026 | 2026-01-06 | 2026-01-19 |
| **Individual** | "Sommersaison" | IndividualPeriod.FromDate | IndividualPeriod.UntilDate |

## IndividualPeriod (Benutzerdefinierte Perioden)

### Tabelle: `individual_period`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primärschlüssel |
| `name` | string | Name der Periode (z.B. "Sommersaison 2026") |

### Tabelle: `period` (Zeitabschnitte)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primärschlüssel |
| `individual_period_id` | UUID | FK zu IndividualPeriod |
| `from_date` | DateOnly | Startdatum des Zeitraums |
| `until_date` | DateOnly? | Enddatum (optional, null = unbegrenzt) |
| `full_hours` | decimal | Soll-Stunden für diesen Zeitraum |

### Beispiel: Sommersaison

```
IndividualPeriod: { name: "Sommersaison 2026" }
+-- Period: { from: 01.06.2026, until: 30.06.2026, fullHours: 180 }
+-- Period: { from: 01.07.2026, until: 31.07.2026, fullHours: 200 }
+-- Period: { from: 01.08.2026, until: 31.08.2026, fullHours: 180 }
```

## API Response

`POST /api/backend/Works/Schedule` liefert zusätzlich:

```json
{
  "entries": [],
  "clients": [],
  "periodHours": {
    "<clientId>": {
      "hours": 120.5,
      "surcharges": 8.0,
      "guaranteedHours": 160.0
    }
  }
}
```

## Berechnung

1. Falls `ClientPeriodHours` Eintrag für die aktuelle Periode existiert -> diesen verwenden
2. Sonst -> Summe aus `work.work_time` für den Zeitraum berechnen
3. `guaranteedHours` kommt aus aktivem `client_contract`

## Frontend Row-Header

| Slot | Inhalt | Format |
|------|--------|--------|
| Slot1 | Soll-Stunden (`guaranteedHours`) | HH:mm (z.B. `170:00`) |
| Slot2 | Geleistete Stunden (`hours`) | HH:mm (z.B. `168:30`) |
| Slot3 | Zuschläge (`surcharges`) | HH:mm (z.B. `05:15`) |

Die Formatierung verwendet `hoursToHHMM()` aus `time-format.helper.ts`.

# Client Period Hours (Periodenbasierte Stundenplanung)

## Konzept

`ClientPeriodHours` speichert die aggregierten Stunden eines Clients pro Planungsperiode. Die Periodenart wird durch `PaymentInterval` bestimmt:

```
PaymentInterval (Enum)
+----------------+---------------------------------------------------+
| Weekly (0)     | Wöchentliche Planung -> Year + WeekNumber (1-53)  |
| Biweekly (1)   | 2-wöchentliche Planung -> Year + WeekNumber       |
| Monthly (2)    | Monatliche Planung -> Year + Month (1-12)         |
| Individual (3) | Benutzerdefiniert -> IndividualPeriodId           |
+----------------+---------------------------------------------------+
```

## Anwendungsfall

Jeder Client, der verplant wird, erhält `n` ClientPeriodHours-Einträge:

| PaymentInterval | Beispiel | Verwendete Felder |
|-----------------|----------|-------------------|
| **Monthly** | Januar 2026 | `Year=2026`, `Month=1` |
| **Weekly** | KW 5/2026 | `Year=2026`, `WeekNumber=5` |
| **Biweekly** | KW 2,4,6.../2026 | `Year=2026`, `WeekNumber=2` |
| **Individual** | "Sommersaison" | `IndividualPeriodId=<guid>` |

## Tabelle: `client_period_hours`

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primärschlüssel |
| `client_id` | UUID | FK zu Client |
| `year` | int | Jahr |
| `month` | int? | Monat (1-12), nur bei Monthly |
| `week_number` | int? | Kalenderwoche (1-53), nur bei Weekly/Biweekly |
| `individual_period_id` | UUID? | FK zu IndividualPeriod, nur bei Individual |
| `hours` | decimal | Summe der Arbeitsstunden |
| `surcharges` | decimal | Zuschlagsstunden (Nacht/Feiertag) |
| `payment_interval` | int | 0=Weekly, 1=Biweekly, 2=Monthly, 3=Individual |

## Filtered Unique Indexes

```sql
-- Monthly: Eindeutig pro Client + Jahr + Monat
CREATE UNIQUE INDEX ix_client_period_hours_monthly
ON client_period_hours (client_id, year, month)
WHERE payment_interval = 2;

-- Weekly/Biweekly: Eindeutig pro Client + Jahr + Woche
CREATE UNIQUE INDEX ix_client_period_hours_weekly
ON client_period_hours (client_id, year, week_number)
WHERE payment_interval IN (0, 1);

-- Individual: Eindeutig pro Client + IndividualPeriod
CREATE UNIQUE INDEX ix_client_period_hours_individual
ON client_period_hours (client_id, individual_period_id)
WHERE payment_interval = 3;
```

## EF Core Konfiguration

```csharp
// DataBaseContext.cs
modelBuilder.Entity<ClientPeriodHours>()
    .HasIndex(p => new { p.ClientId, p.Year, p.Month })
    .HasFilter("payment_interval = 2")
    .IsUnique();

modelBuilder.Entity<ClientPeriodHours>()
    .HasIndex(p => new { p.ClientId, p.Year, p.WeekNumber })
    .HasFilter("payment_interval IN (0, 1)")
    .IsUnique();

modelBuilder.Entity<ClientPeriodHours>()
    .HasIndex(p => new { p.ClientId, p.IndividualPeriodId })
    .HasFilter("payment_interval = 3")
    .IsUnique();

// Query Filter: Nur Clients die nicht gelöscht sind
modelBuilder.Entity<ClientPeriodHours>()
    .HasQueryFilter(p => !p.Client!.IsDeleted);
```

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
  "entries": [...],
  "clients": [...],
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

1. Falls `client_period_hours` Eintrag für die aktuelle Periode existiert -> diesen verwenden
2. Sonst -> Summe aus `work.work_time` für den Zeitraum berechnen
3. `guaranteedHours` kommt aus aktivem `client_contract`

## Frontend Row-Header

| Slot | Inhalt | Format |
|------|--------|--------|
| Slot1 | Soll-Stunden (`guaranteedHours`) | HH:mm (z.B. `170:00`) |
| Slot2 | Geleistete Stunden (`hours`) | HH:mm (z.B. `168:30`) |
| Slot3 | Zuschläge (`surcharges`) | HH:mm (z.B. `05:15`) |

Die Formatierung verwendet `hoursToHHMM()` aus `time-format.helper.ts`.

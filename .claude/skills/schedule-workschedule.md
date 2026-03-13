---
name: schedule-workschedule
description: Verwende wenn an WorkSchedule, WorkChange-Mitternachtsregel oder Schedule-Refresh-Flow gearbeitet wird
---

# WorkSchedule Implementation

## Elementare Regel: WorkChange bei Mitternachtsschichten

**WICHTIG:** Bei WorkChanges (Korrektur/Ablösung) für Schichten über Mitternacht gilt:

| WorkChange.StartTime | entry_date |
|---------------------|------------|
| **VOR Mitternacht** (z.B. 22:45) | `Work.CurrentDate` |
| **NACH Mitternacht** (z.B. 02:15) | `Work.CurrentDate + 1 Tag` |

**Beispiel:** CN167 Schicht 22:00 - 06:00 am 15. Januar
- ABL (22:45 - 02:15): StartTime 22:45 ist VOR Mitternacht -> entry_date = 15. Januar
- Korrektur (02:00 - 06:00): StartTime 02:00 ist NACH Mitternacht -> entry_date = 16. Januar

**SQL-Logik in Stored Procedure:**
```sql
CASE
    WHEN s.end_shift < s.start_shift AND wc.start_time < s.start_shift
    THEN (w."current_date" + INTERVAL '1 day')::DATE
    ELSE w."current_date"::DATE
END AS entry_date
```

## Stored Procedure

Die SP `get_schedule_entries` kombiniert vier Entitäten:
- **EntryType 0**: Work (Arbeitseinsätze)
- **EntryType 1**: WorkChange (Zeitkorrekturen, Vertretungen)
- **EntryType 2**: Expenses (Spesen)
- **EntryType 3**: Break (Abwesenheiten: Urlaub, Krankheit, etc.)

```sql
SELECT * FROM get_schedule_entries(
    '2026-01-01'::DATE,   -- start_date
    '2026-01-31'::DATE,   -- end_date
    ARRAY[]::UUID[]       -- visible_group_ids (optional)
)
```

## Rückgabe-Felder

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Eindeutige ID des Eintrags |
| entry_type | INTEGER | 0=Work, 1=WorkChange, 2=Expenses, 3=Break |
| source_id | UUID | Referenz zum Quell-Eintrag (Work oder Break) |
| client_id | UUID | Mitarbeiter-ID |
| entry_date | DATE | Datum des Eintrags |
| start_time | TIME | Startzeit |
| end_time | TIME | Endzeit |
| change_time | NUMERIC | Zeitänderung in Minuten |
| work_change_type | INTEGER | Art der Änderung (0-3) |
| description | TEXT | Beschreibung |
| amount | NUMERIC | Betrag (Expenses) |
| shift_id | UUID | Schicht-ID (bei Break: Absence-ID) |
| entry_name | TEXT | Name (Shift-Name oder lokalisierter Absence-Name) |
| abbreviation | TEXT | Abkürzung (bei Break: lokalisiert) |

## Backend Dateien

```
Infrastructure/Persistence/StoredProcedures/GetScheduleEntries.sql
Domain/Models/Schedules/WorkScheduleEntry.cs
Domain/Interfaces/IWorkScheduleService.cs
Domain/Services/WorkSchedule/WorkScheduleService.cs
Application/Queries/WorkSchedule/GetWorkScheduleQuery.cs
Application/Handlers/WorkSchedule/GetWorkScheduleQueryHandler.cs
Presentation/DTOs/Schedules/WorkScheduleResource.cs
Presentation/DTOs/Schedules/WorkScheduleResponse.cs
```

## Frontend Model

```typescript
export interface IScheduleCell {
  id: string;
  entryType: number;
  sourceId: string;           // Referenz auf Work oder Break
  clientId: string;
  entryDate: Date;
  startTime: string;
  endTime: string;
  changeTime: number | null;
  workChangeType: number | null;
  description: string | null;
  amount: number | null;
  shiftId: string;            // Bei Break: AbsenceId
  entryName: string | null;   // Shift-Name oder lokalisierter Absence-Name
  abbreviation: string | null;
  toInvoice: boolean | null;
  taxable: boolean | null;
  replaceClientId: string | null;
  isReplacementEntry: boolean;
}

export enum WorkScheduleEntryType {
  Work = 0,
  WorkChange = 1,
  Expenses = 2,
  Break = 3,
}
```

## WorkChange Dialoge (Korrektur & Ablösung)

### Response-Struktur

- Korrektur: 1 `WorkChangeClientResult` im Array
- Ablösung: 2 `WorkChangeClientResult` im Array (Original-Client + Ersatz-Client)

### UI-Refresh nach WorkChange

Dialoge müssen `scheduleEntryCrud.triggerScheduleRefresh()` aufrufen:
- NICHT `workScheduleLoader.isRead.set()` (falsches Signal!)
- `triggerScheduleRefresh()` setzt `scheduleRefreshed` Signal
- `DataManagementScheduleService` Effect reagiert darauf und setzt `isRead`

### Schedule-Update nach Create

```typescript
for (const clientResult of response.clientResults) {
  if (clientResult.periodHours) {
    this.workScheduleLoader.periodHours.set(clientResult.clientId, clientResult.periodHours);
  }
  if (clientResult.scheduleEntries) {
    this.workScheduleLoader.replaceClientEntriesForDays(clientResult.clientId, startDate, endDate, clientResult.scheduleEntries);
  }
}
this.workScheduleLoader.updateClientNeededRows();
this.scheduleEntryCrud.triggerScheduleRefresh();
```

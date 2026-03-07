# Clean Architecture Reviewer Memory

## Projektstruktur (Frontend)
- `domain/models/` - Interfaces, Enums, Model-Klassen (kein Framework)
- `domain/services/` - Domain-Logik; Feature-Unterordner z.B. `settings/`, `schedule/`, `automation/`, `client-availability/`
- `infrastructure/` - API-Services (`data-{entity}.service.ts`)
- `presentation/` - Components, Pages
- `shared/` - Shared Components, Pipes

## Bekannte Verstösse / Muster (Automation-Feature)

### Verletzungen in automation/
- **Multi-Export in Modell-Dateien**: `scheduling.models.ts` und `rule.model.ts` exportieren je mehrere Interfaces/Klassen/Enums/Konstanten statt ein Export pro Datei (Projekt-Policy: ein Export pro Datei)
- **Interface + Klasse in derselben Datei**: `schedule-agent.model.ts` enthält Interface `IScheduleAgent` + Klasse `ScheduleAgent` + Interface `IAgentDecision` → 3 Exports, verletzt Policy
- **Interface in Service-Datei**: `IAgentFactoryConfig` in `agent-factory.service.ts`, `IConductorOptions`, `IAssignmentResult`, `IConductorResult` in `conductor.service.ts`, etc.
- **SRP-Verstoss**: `conductor.service.ts` enthält Worker-Management, Greedy-Scheduling, evolutionäres Scheduling und Result-Conversion in einer Klasse
- **`console.log/error` in Produktion**: `macro-rules-evaluator.service.ts` Z.64, `conductor.service.ts` Z.348
- **Dead Code**: `applySchedule()` in `conductor.service.ts` ist Stub-Implementierung
- **`evolution-core.ts` als God-File**: ~700 Zeilen

### Positive Muster in automation/
- Gute Layer-Trennung: Keine Imports aus infrastructure/ oder presentation/
- `inject()` Pattern konsequent verwendet
- `InjectionToken` für `SCRIPT_COMPILER` - gutes DI-Muster
- Worker-Pattern für CPU-intensive Arbeit sinnvoll

## Bekannte Verstösse / Muster (client-availability-Feature)

### Verletzungen in client-availability/
- **Multi-Export in Modell-Datei**: `client-availability-class.ts` exportiert `IClientAvailability` UND `IClientAvailabilityBulkRequest` → verletzt "ein Export pro Datei"-Policy
- **Interface in Service-Datei**: `CellTemplate` in `availability-cell-rendering.service.ts` Z.9 (privat, nicht exportiert); `DateHourRange` in `availability-calculation.service.ts` Z.16 (exportiert)
- **`console.error` in Produktion**: `availability-canvas-manager.service.ts` Z.126, Z.140, Z.155
- **`@Input()` statt `input()`**: `client-availability-header.component.ts` Z.53
- **Magic String Farbe**: `draw-availability-grid.service.ts` Z.149 `ctx.strokeStyle = 'grey'`
- **Magic Numbers Checkmark**: `checkbox-drawing.service.ts` Z.53-55 Koordinaten als Literale
- **Kommentar in Produktion**: `render-availability-grid.service.ts` Z.193
- **Domain-Service importiert direkt Infrastructure**: `data-management-client-availability.service.ts` Z.10 importiert `DataClientAvailabilityService` direkt ohne Interface-Abstraktion
- **`WEEKDAY_KEYS` Magic Strings**: `availability-calculation.service.ts` Z.14 hardcoded deutsche Wochentag-Keys

### Positive Muster in client-availability/
- Canvas-Template-Caching in `AvailabilityCellRenderingService` - gutes Performance-Muster (20 vorgefertigte Templates)
- Inkrementelles Scroll-Rendering in `DrawAvailabilityGridService.moveGrid()` - gutes Performance-Muster
- `debounceTime` + Dirty-Tracking für Auto-Save - korrekt implementiert
- `InjectionToken` für `ROW_HEADER_SETTINGS`/`ROW_HEADER_DATA` - gutes DI-Muster
- Adapter-Pattern `AvailabilityRowHeaderDataAdapter` für shared Row-Header - sauber
- `takeUntilDestroyed` korrekt genutzt
- `inject()` Pattern konsequent

## Allgemeine Projekt-Konventionen
- Dateinamen: kebab-case
- Service-Naming: `{feature}.service.ts` oder `data-{entity}.service.ts`
- Konstanten: `{name}.constants.ts`
- Tests: `// Arrange`, `// Act`, `// Assert` Kommentare verwenden
- **Ein Export pro Datei** (konsequent durchhalten) - häufig verletzt
- Copyright-Header ZWINGEND erste Zeile jeder .ts-Datei

## Wiederkehrende Verstösse (feature-übergreifend)
1. Multi-Export in einer Datei (verletzt "ein Export pro Datei"-Policy) - häufig bei Modell-Dateien
2. Interface in Service-Datei statt eigener Datei
3. `console.error/log` in Produktionscode (auch in catch-Blöcken)
4. `@Input()` statt `input()` (modernes Angular Signal-API nicht überall genutzt)
5. Magic Strings / Magic Numbers (Farben, Koordinaten, String-Keys)
6. Domain-Services ohne Interface-Abstraktion gegenüber Infrastructure-Services

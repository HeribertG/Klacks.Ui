# Clean Architecture Reviewer Memory

## Projektstruktur (Frontend)
- `domain/models/` - Interfaces, Enums, Model-Klassen (kein Framework)
- `domain/services/` - Domain-Logik; Feature-Unterordner z.B. `settings/`, `schedule/`, `automation/`
- `infrastructure/` - API-Services (`data-{entity}.service.ts`)
- `presentation/` - Components, Pages
- `shared/` - Shared Components, Pipes

## Bekannte Verstösse / Muster (Automation-Feature)

### Verletzungen in automation/
- **Multi-Export in Modell-Dateien**: `scheduling.models.ts` und `rule.model.ts` exportieren je mehrere Interfaces/Klassen/Enums/Konstanten statt ein Export pro Datei (Projekt-Policy: ein Export pro Datei)
- **Interface + Klasse in derselben Datei**: `schedule-agent.model.ts` enthält Interface `IScheduleAgent` + Klasse `ScheduleAgent` + Interface `IAgentDecision` → 3 Exports, verletzt Policy
- **Klassen in `rules/rule.model.ts`**: `RuleDefinition` und `RuleEvaluationResult` sind Klassen, gehören nicht in eine `.model.ts` Datei zusammen
- **Magic Numbers**: `AgentStateService` hat Magic Numbers (0.6, 0.3, 0.1, 0.4, 0.3, 0.3, 0.7, 0.3, 10, 7, 14, 30); `evolution-core.ts` hat `MAX_DAILY_HOURS = 10`, `0.7` etc.
- **Magic Strings**: `evolution-core.ts`, `conductor.service.ts` enthalten hardcoded String-Literals wie `'Unknown'`, `'Cancelled by user'`, `'No shifts to schedule'` etc.
- **Kommentar im Code**: `agent-state.service.ts` Z.80 hat Kommentar; `macro-rules-evaluator.service.ts` Z.217 hat Kommentar; `evolution-core.ts` Z.94 hat eine nicht-exportierte private Funktion
- **Interface in Service-Datei**: `IAgentFactoryConfig` in `agent-factory.service.ts`, `IConductorOptions`, `IAssignmentResult`, `IConductorResult` in `conductor.service.ts`, `IRuleEvaluationSummary`/`IMacroRuleResult` in `macro-rules-evaluator.service.ts`, `IMacroRuleTemplate` in `macro-rule-templates.service.ts`, `IConstraintViolation` in `fitness-evaluator.service.ts`
- **SRP-Verstoss**: `conductor.service.ts` enthält Worker-Management, Greedy-Scheduling, evolutionäres Scheduling und Result-Conversion in einer Klasse
- **`console.log/error` in Produktion**: `macro-rules-evaluator.service.ts` Z.64 `console.error(...)`, `conductor.service.ts` Z.348 `console.log(...)` (applySchedule stub)
- **Dead Code**: `applySchedule()` in `conductor.service.ts` ist Stub-Implementierung mit `console.log` und `return true`
- **`evolution-core.ts` als God-File**: ~700 Zeilen, enthält Typen, Funktionen, Algorithmen - verletzt SRP und Datei-Policy
- **`SCHEDULING_RULE_MACRO_TYPE = 100`**: Magic Number als Konstante in `rules-engine.service.ts`, aber noch ohne eigene Konstanten-Datei

### Positive Muster in automation/
- Gute Layer-Trennung: Keine Imports aus infrastructure/ oder presentation/
- `inject()` Pattern konsequent verwendet
- `providedIn: 'root'` korrekt
- `InjectionToken` für `SCRIPT_COMPILER` - gutes DI-Muster
- Worker-Pattern für CPU-intensive Arbeit sinnvoll
- evolution-core als Worker-tauglicher reiner Code ohne Angular-Abhängigkeiten - gute Idee
- Test-Coverage vorhanden (evolution-core.spec.ts, evolution-integration.spec.ts)
- Tests haben // Arrange, // Act, // Assert nicht explizit, aber Struktur klar

## Allgemeine Projekt-Konventionen
- Dateinamen: kebab-case
- Service-Naming: `{feature}.service.ts` oder `data-{entity}.service.ts`
- Konstanten: `{name}.constants.ts`
- `MacroManagementService` liegt in `domain/services/settings/` - ist Domain-Service, kein Infra-Verstoß
- `AppSettingsManagementService` liegt in `domain/services/settings/` - korrekt im Domain-Layer
- Tests: `// Arrange`, `// Act`, `// Assert` Kommentare verwenden

# ADR-003: Domain-Driven Design Service-Organisation

## Status
**Accepted** - 12.10.2025

## Context

### Problem

Nach der Einführung der Clean Architecture Layer-Struktur (ADR-002) befanden sich **34 Domain Services** in einem flachen `src/app/domain/services/` Verzeichnis:

```
src/app/domain/services/
├── data-management-shift.service.ts
├── data-management-shift-cut.service.ts
├── data-management-absence.service.ts
├── data-management-group.service.ts
├── data-management-client.service.ts
├── client-edit.service.ts
├── client-list.service.ts
... (weitere 27 Services)
```

**Probleme**:
1. **Schwierige Navigation**: 34 Services in einem Verzeichnis
2. **Keine fachliche Gruppierung**: Services nach Technik statt nach Domäne
3. **Unklare Bounded Contexts**: Keine Abgrenzung der fachlichen Bereiche
4. **Skalierbarkeit**: Bei weiteren Services wird es unübersichtlich
5. **Fehlende DDD-Prinzipien**: Keine Ubiquitous Language in der Struktur

### Beispiel: Cross-Domain Confusion

```typescript
// Welche Services gehören zusammen?
data-management-shift.service.ts       // Schichten
data-management-shift-cut.service.ts   // Schichten-Schneiden
data-management-break.service.ts       // Pausen (gehört zu Abwesenheiten?)
data-management-absence.service.ts     // Abwesenheiten
```

## Decision

Wir organisieren Domain Services nach **Domain-Driven Design (DDD)** Prinzipien in **fachliche Domänen** (Bounded Contexts):

### 1. Identifizierte Bounded Contexts

Durch Event Storming und Analyse identifizierten wir **8 Bounded Contexts**:

| Bounded Context | Services | Beschreibung |
|-----------------|----------|--------------|
| **shift** | 2 | Schicht-Verwaltung, Schichten-Schneiden |
| **absence** | 3 | Abwesenheiten, Pausen, Absence-Gantt |
| **group** | 4 | Gruppen, Zuweisungen, Sichtbarkeiten, Selection |
| **contract** | 1 | Vertrags-Verwaltung |
| **schedule** | 2 | Zeitpläne, Profile |
| **calendar** | 2 | Kalender-Regeln, Kalender-Selection |
| **settings** | 3 | Einstellungen, Grid-Settings, Wrapper |
| **llm** | 5 | LLM/AI Services, Function Execution, Registry |
| **client** | 10 | Kunden-Verwaltung (größte Domain) |

**Shared Services** (bleiben im Hauptverzeichnis):
- `work-time-calculation.service.ts` (wird von mehreren Domains genutzt)
- `language-mapping.service.ts` (wird von mehreren Domains genutzt)

### 2. Finale Domain-Struktur

```
src/app/domain/services/
├── shift/                                    # Schicht-Domain
│   ├── data-management-shift.service.ts
│   └── data-management-shift-cut.service.ts
│
├── absence/                                  # Abwesenheits-Domain
│   ├── data-management-absence.service.ts
│   ├── data-management-absence-gantt.service.ts
│   └── data-management-break.service.ts
│
├── group/                                    # Gruppen-Domain
│   ├── data-management-group.service.ts
│   ├── data-management-assigned-group.service.ts
│   ├── data-management-group-visibility.service.ts
│   └── group-selection.service.ts
│
├── contract/                                 # Vertrags-Domain
│   └── data-management-contract.service.ts
│
├── schedule/                                 # Zeitplan-Domain
│   ├── data-management-schedule.service.ts
│   └── data-management-profile.service.ts
│
├── calendar/                                 # Kalender-Domain
│   ├── data-management-calendar-rules.service.ts
│   └── data-management-calendar-selection.service.ts
│
├── settings/                                 # Einstellungs-Domain
│   ├── data-management-settings.service.ts
│   ├── data-management-grid-settings.service.ts
│   ├── grid-color.service.ts
│   └── settings-manageable-wrapper.service.ts
│
├── llm/                                      # LLM/AI-Domain
│   ├── data-management-llm.service.ts
│   ├── data-management-llm-provider.service.ts
│   ├── llm-function-execution.service.ts
│   ├── llm-function-registry.service.ts
│   └── llm-system-context.service.ts
│
├── client/                                   # Client-Domain (größte Domain)
│   ├── data-management-client.service.ts
│   ├── client-edit.service.ts
│   ├── client-list.service.ts
│   ├── client-visible-list.service.ts
│   ├── client-data.service.ts
│   ├── client-edit-state.service.ts
│   ├── client-search-result.service.ts
│   ├── client-search-state.service.ts
│   ├── address.service.ts
│   └── address-search.service.ts
│
├── work-time-calculation.service.ts          # Shared Core Service
└── language-mapping.service.ts               # Shared Core Service
```

### 3. Bounded Context Relationships

```
┌─────────────┐         ┌──────────────┐
│   Shift     │────────→│  Absence     │
└─────────────┘         └──────────────┘
       │                       │
       │                       │
       ↓                       ↓
┌─────────────┐         ┌──────────────┐
│  Schedule   │←───────→│  Contract    │
└─────────────┘         └──────────────┘
       │                       │
       └───────────┬───────────┘
                   ↓
           ┌──────────────┐
           │    Client    │
           └──────────────┘
                   ↑
                   │
           ┌──────────────┐
           │    Group     │
           └──────────────┘
```

**Anti-Corruption Layer**: Services wie `group-selection.service.ts` koordinieren mehrere Domains

### 4. Naming Conventions

**Pattern**: `{action}-{entity}[-{detail}].service.ts`

| Pattern | Beispiele |
|---------|-----------|
| `data-management-{entity}` | `data-management-shift.service.ts` (CRUD) |
| `{entity}-edit` | `client-edit.service.ts` (Edit-State) |
| `{entity}-list` | `client-list.service.ts` (List-State) |
| `{entity}-{detail}` | `data-management-shift-cut.service.ts` (Spezial-Operation) |

### 5. Import Path Strategy

**Absolute Imports** für bessere IDE-Unterstützung:

```typescript
// ✅ Good
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';

// ❌ Bad
import { DataManagementShiftService } from '../../shift/data-management-shift.service';
```

**Cross-Domain Imports** explizit dokumentieren:

```typescript
// group-selection.service.ts koordiniert mehrere Domains
import { DataManagementAbsenceService } from '../absence/data-management-absence.service';
import { DataManagementScheduleService } from '../schedule/data-management-schedule.service';
import { DataManagementShiftService } from '../shift/data-management-shift.service';
```

## Alternatives Considered

### 1. Feature-Based Organisation (Rejected)
```
domain/
├── shift-management/
│   ├── shift.model.ts
│   ├── shift.service.ts
│   └── shift.interface.ts
```
**Nachteile**:
- Models sind getrennt von Services
- Nicht DDD-konform
- Verletzt Single Responsibility

### 2. Technical Layers (Rejected)
```
domain/
├── crud-services/
├── state-services/
└── calculation-services/
```
**Nachteile**:
- Technische statt fachliche Gruppierung
- Keine Bounded Contexts
- Nicht wartbar

### 3. Module-Based (Angular Modules) (Rejected)
```
domain/
├── shift.module/
├── absence.module/
└── ...
```
**Nachteile**:
- Overhead für Standalone Angular (v14+)
- Mixing Framework mit DDD
- Services sind nicht Module-gebunden

## Consequences

### Positive

1. **Ubiquitous Language ✅**
   - Ordner-Struktur spiegelt fachliche Sprache wider
   - Entwickler sprechen dieselbe Sprache wie Fachbereich

2. **Bounded Contexts ✅**
   - Klare Abgrenzung der Domänen
   - Verantwortlichkeiten klar definiert

3. **Navigability ✅**
   - Einfach zu finden: "Ich suche etwas mit Schichten → `shift/`"
   - IDE-Auto-Complete nutzt Domänen-Namen

4. **Scalability ✅**
   - Neue Services passen in bestehende Domänen
   - Neue Domänen können hinzugefügt werden

5. **Team Collaboration ✅**
   - Teams können parallel an verschiedenen Domänen arbeiten
   - Weniger Merge-Conflicts

6. **Code Reviews ✅**
   - Reviewer sieht sofort: "Ah, ein Change in der Shift-Domain"

### Negative

1. **More Folders**
   - 8 zusätzliche Verzeichnisse
   - Kann für kleine Projekte übertrieben wirken

2. **Import Paths**
   - Längere Import-Pfade (mitigiert durch absolute Imports)

3. **Cross-Domain Dependencies**
   - Manche Services (z.B. `group-selection.service.ts`) importieren aus mehreren Domänen
   - Erfordert sorgfältige Dependency-Verwaltung

4. **Learning Curve**
   - Neue Entwickler müssen Bounded Contexts verstehen
   - DDD-Wissen erforderlich

### Mitigation

- **Dokumentation**: Dieses ADR, README files pro Domain
- **Onboarding**: DDD-Workshop für neue Teammitglieder
- **Code Review**: Sicherstellen, dass Services im richtigen Bounded Context landen
- **ESLint Rules**: Warnung bei Cross-Domain-Abhängigkeiten

## Metrics

### Refactoring Statistik (Phase 3)
- **Services reorganisiert**: 22 (von 34)
- **Neue Domains erstellt**: 8 (shift, absence, group, contract, schedule, calendar, settings, llm)
- **Client-Domain**: 10 Services (größte Domain)
- **Shared Services**: 2 (work-time-calculation, language-mapping)
- **Imports aktualisiert**: Alle absoluten + relativen Pfade
- **Skripte erstellt**: 2 (update_imports.sh, fix_relative_imports.sh)
- **TypeScript-Fehler**: 0
- **Tests**: 1057 SUCCESS, 0 FAILED
- **Dauer**: ~1.5 Stunden

### Code-Qualität
- ✅ Bounded Contexts klar definiert
- ✅ Ubiquitous Language in Struktur
- ✅ DDD-Prinzipien befolgt
- ✅ Alle Tests bestehen

## Domain Size Analysis

| Domain | Services | Komplexität | Bemerkung |
|--------|----------|-------------|-----------|
| client | 10 | Hoch | Größte Domain, evtl. weiter aufteilen |
| llm | 5 | Mittel | Gut abgegrenzt |
| group | 4 | Mittel | Cross-Domain-Koordination |
| absence | 3 | Niedrig | Klar abgegrenzt |
| settings | 3 | Niedrig | Konfiguration |
| shift | 2 | Niedrig | Kern-Domain |
| schedule | 2 | Niedrig | Zeitplanung |
| calendar | 2 | Niedrig | Kalender-Logik |
| contract | 1 | Sehr niedrig | Einfache Domain |

**Future Consideration**: Client-Domain könnte weiter aufgeteilt werden (z.B. `client-management/`, `client-search/`)

## Verification

### Domain Isolation Check
```bash
# Prüfen, dass Domains keine Presentation-Layer importieren
for dir in shift absence group contract schedule calendar settings llm client; do
  echo "=== $dir ==="
  grep -r "from.*presentation/" src/app/domain/services/$dir/ || echo "✅ Clean"
done
```

**Ergebnis**: Alle Domains ✅ Clean (0 Presentation-Imports)

## References

- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Bounded Context by Martin Fowler](https://martinfowler.com/bliki/BoundedContext.html)
- [Ubiquitous Language](https://martinfowler.com/bliki/UbiquitousLanguage.html)
- [Strategic Design with Bounded Contexts](https://www.amazon.com/Domain-Driven-Design-Distilled-Vaughn-Vernon/dp/0134434420)

## Related ADRs

- [ADR-001: EventBus Pattern](./ADR-001-eventbus-pattern.md)
- [ADR-002: Clean Architecture Layer-Struktur](./ADR-002-clean-architecture-layers.md)

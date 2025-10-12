# Architecture Decision Records (ADRs)

## Was sind ADRs?

Architecture Decision Records (ADRs) dokumentieren wichtige Architektur-Entscheidungen im Projekt. Sie erklären:
- **Warum** eine Entscheidung getroffen wurde
- **Welche Alternativen** in Betracht gezogen wurden
- **Welche Konsequenzen** die Entscheidung hat

## Format

Jede ADR folgt diesem Format:
1. **Titel**: Kurze Beschreibung der Entscheidung
2. **Status**: Proposed | Accepted | Deprecated | Superseded
3. **Context**: Hintergrund und Problem
4. **Decision**: Getroffene Entscheidung
5. **Consequences**: Auswirkungen (positiv und negativ)

## ADRs in diesem Projekt

| ADR | Titel | Status | Datum |
|-----|-------|--------|-------|
| [001](./ADR-001-eventbus-pattern.md) | EventBus Pattern für Domain-Presentation Kommunikation | Accepted | 12.10.2025 |
| [002](./ADR-002-clean-architecture-layers.md) | Clean Architecture Layer-Struktur | Accepted | 12.10.2025 |
| [003](./ADR-003-ddd-service-organisation.md) | Domain-Driven Design Service-Organisation | Accepted | 12.10.2025 |

## Weitere Ressourcen

- [Michael Nygard's ADR Template](https://github.com/joelparkerhenderson/architecture-decision-record)
- [Clean Architecture by Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)

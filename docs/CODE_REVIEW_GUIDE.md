# Code Review Guide - Clean Architecture Refactoring

## Übersicht

Dieses Dokument dient als Leitfaden für das Code Review des Clean Architecture Refactorings (Phase 1-4).

**Review Status**: ⏳ Ready for Review
**Review Date**: 12.10.2025
**Reviewer**: TBD

---

## Review Checklist

### 1. Architecture Compliance ✅

#### Clean Architecture Dependency Rule
- [ ] Domain Layer hat KEINE Imports aus Presentation
- [ ] Domain Layer hat KEINE Imports aus Application
- [ ] Application Layer hat KEINE Imports aus Presentation
- [ ] Alle Dependencies zeigen nach innen (Presentation → Application → Domain ← Infrastructure)

**Verification Commands**:
```bash
# Domain darf NICHT von Presentation abhängen
grep -r "from.*presentation/" src/app/domain/
# Expected: 0 results

# Domain darf NICHT von Application abhängen
grep -r "from.*application/" src/app/domain/services/
# Expected: 0 results

# Application darf NICHT von Presentation abhängen
grep -r "from.*presentation/" src/app/application/
# Expected: 0 results
```

#### EventBus Pattern
- [ ] Alle Domain Services nutzen EventBus statt direkte Presentation-Aufrufe
- [ ] DomainEventHandler ist in app.config.ts initialisiert
- [ ] Alle Event-Typen sind in `domain/events/domain-events.ts` definiert
- [ ] Events haben type-safe Interfaces

**Check**:
```bash
# Domain Services sollten KEINE ToastShowService importieren
grep -r "ToastShowService" src/app/domain/
# Expected: 0 results

# Domain Services sollten KEINE NavigationService importieren
grep -r "NavigationService" src/app/domain/
# Expected: 0 results
```

### 2. Layer Structure ✅

#### Folder Organization
- [ ] `/src/app/domain/` - Business Logic (34 Services)
- [ ] `/src/app/application/` - Application Logic (10 Services)
- [ ] `/src/app/infrastructure/` - External Services (24 Services)
- [ ] `/src/app/presentation/` - UI Layer (18 Services)

#### Domain Services Organization (DDD)
- [ ] Services sind nach Bounded Contexts organisiert
- [ ] 8 Domains: shift, absence, group, contract, schedule, calendar, settings, llm, client
- [ ] Shared Services im Hauptverzeichnis (work-time-calculation, language-mapping)

### 3. Code Quality ✅

#### TypeScript Compilation
- [ ] 0 TypeScript Errors
- [ ] No implicit any
- [ ] Strict mode enabled

**Verification**:
```bash
npx tsc --noEmit
# Expected: No errors
```

#### Tests
- [ ] Alle Tests bestehen (1090 SUCCESS)
- [ ] EventBus hat Unit Tests
- [ ] EventBus hat Integration Tests
- [ ] DomainEventHandler hat Tests
- [ ] Keine skipped tests ohne Grund

**Verification**:
```bash
export CHROME_BIN=/usr/bin/chromium-browser && npm test
# Expected: 1090 SUCCESS, 0 FAILED
```

### 4. Implementation Details ✅

#### EventBus Service
- [ ] `EventBus.emit()` funktioniert type-safe
- [ ] `EventBus.on()` filtert Events korrekt
- [ ] `EventBus.onAny()` erhält alle Events
- [ ] Timestamp wird bei jedem Event gesetzt

**File**: `src/app/application/services/event-bus.service.ts`

#### DomainEventHandler
- [ ] Alle 5 Event-Typen haben Handler (ERROR, SUCCESS, WARNING, INFO, NAVIGATE)
- [ ] Handler rufen korrekte Presentation Services auf
- [ ] Handler sind im Constructor initialisiert

**File**: `src/app/presentation/handlers/domain-event.handler.ts`

#### Domain Services
- [ ] Nutzen `eventBus.emit()` für Toasts/Navigation
- [ ] Haben context-Parameter für Debugging
- [ ] Haben code-Parameter für Error-Gruppierung

**Example Check** (DataManagementShiftService):
```typescript
// Should emit events like this:
this.eventBus.emit(DomainEventType.ERROR, {
  message: 'Error message',
  code: 'ShiftError',
  context: 'DataManagementShiftService.methodName'
});
```

### 5. Service Migration ✅

#### Moved to Application Layer
- [ ] `ManageableServiceRegistry` (von Presentation → Application)
- [ ] `WorkplaceStateService` (von Presentation → Application)

**Reason**: Orchestration Logic, nicht Presentation

#### Moved to Domain Layer
- [ ] `GridColorService` (von Presentation → Domain/services/settings/)
- [ ] `ConstantKeys` (von Presentation → Domain/constants/)
- [ ] `IPaginationDataService` Interface (von Presentation → Domain/interfaces/)

**Reason**: Business Logic / Domain Contracts

### 6. Import Path Updates ✅

#### All Imports Updated
- [ ] Domain Services: ~14 Files updated
- [ ] Application Services: ~3 Files updated
- [ ] Presentation Components: ~10+ Files updated
- [ ] Test Files: ~3 Files updated

**Check for remaining old imports**:
```bash
# Check for old GridColorService import
grep -r "from.*presentation/shared/grid/services/grid-color" src/
# Expected: 0 results

# Check for old WorkplaceStateService import
grep -r "from.*presentation/workplace/core/workplace-state" src/
# Expected: 0 results
```

---

## Review Focus Areas

### Critical ⚠️

1. **Dependency Rule Violations**
   - Check: Domain MUSS unabhängig von Presentation sein
   - Tool: `grep -r "from.*presentation/" src/app/domain/`
   - Expected: 0 results

2. **EventBus Integration**
   - Check: Alle Domain Services nutzen EventBus
   - Check: Keine direkten Toast/Navigation-Aufrufe in Domain
   - Files: Alle `src/app/domain/services/*/*.service.ts`

3. **Test Coverage**
   - Check: Alle neuen EventBus-Features haben Tests
   - Check: Integration Tests funktionieren
   - Run: `npm test`

### Important ℹ️

4. **Service Classification**
   - Check: Services im richtigen Layer?
   - Question: Ist `GridColorService` wirklich Domain Logic?
   - Question: Ist `WorkplaceStateService` wirklich Application Logic?

5. **DDD Bounded Contexts**
   - Check: Services in korrekter Domain?
   - Check: Cross-Domain-Dependencies sinnvoll?
   - Example: `group-selection.service.ts` koordiniert mehrere Domains

6. **Naming Conventions**
   - Check: Konsistente Namens-Pattern?
   - Pattern: `data-management-{entity}.service.ts`
   - Pattern: `{entity}-edit.service.ts`

### Nice-to-Have 📝

7. **Documentation**
   - Check: ADRs sind vollständig und korrekt
   - Check: README files in Domain-Ordnern?
   - Check: Inline-Kommentare für komplexe Logik?

8. **Performance**
   - Check: EventBus Performance bei vielen Events?
   - Check: Test-Performance (Integration Tests mit setTimeout)?

9. **Code Style**
   - Check: Konsistenter Code-Style?
   - Check: ESLint Warnings?
   - Run: `npm run lint`

---

## Known Issues / Trade-offs

### 1. Integration Test Timing
**Issue**: Integration Tests nutzen `setTimeout()` für Async-Handling
**Trade-off**: Nicht ideal, aber funktioniert
**Improvement**: RxJS TestScheduler nutzen für deterministic testing

**File**: `src/app/application/services/event-bus.integration.spec.ts`

### 2. DomainEventHandler Constructor Logic
**Issue**: Handler-Setup im Constructor (nicht best practice)
**Trade-off**: Funktioniert für diesen Use Case
**Improvement**: Separate `init()` Methode verwenden

**File**: `src/app/presentation/handlers/domain-event.handler.ts`

### 3. Client Domain Size
**Issue**: Client-Domain hat 10 Services (größte Domain)
**Trade-off**: Noch manageable
**Improvement**: Evtl. weiter aufteilen in `client-management/` und `client-search/`

**Path**: `src/app/domain/services/client/`

### 4. EventBus Context Parameter
**Issue**: Context ist optional, aber für Debugging wichtig
**Trade-off**: Nicht alle Services nutzen context konsistent
**Improvement**: Context verpflichtend machen oder Linting Rule

---

## Review Questions

### Architecture Questions

1. **Ist die Layer-Zuordnung korrekt?**
   - Ist `GridColorService` wirklich Domain Logic oder eher Infrastructure?
   - Ist `ManageableServiceRegistry` wirklich Application oder eher Infrastructure?

2. **EventBus vs. Alternative Patterns?**
   - Hätten wir RxJS Subjects direkt nutzen können?
   - Wäre Callback-Pattern einfacher gewesen?
   - → Siehe ADR-001 für Begründung

3. **DDD Bounded Contexts vollständig?**
   - Fehlen Bounded Contexts?
   - Sind Cross-Domain-Dependencies problematisch?
   - Sollte `group-selection.service.ts` ein eigener Anti-Corruption Layer sein?

### Implementation Questions

4. **EventBus Performance?**
   - Wie performant ist EventBus bei vielen Events?
   - Brauchen wir Event-Batching?
   - Memory Leaks bei vielen Subscribern?

5. **Test Coverage ausreichend?**
   - Fehlen Tests für spezifische Edge Cases?
   - Integration Tests ausreichend?
   - E2E Tests notwendig?

6. **Fehlerbehandlung vollständig?**
   - Was passiert bei EventBus-Errors?
   - Sind alle Error-Cases abgedeckt?
   - Logging/Monitoring vorhanden?

---

## Approval Criteria

### Must Have ✅

- [ ] **0 TypeScript Compilation Errors**
- [ ] **0 Dependency Rule Violations** (Domain → Presentation)
- [ ] **All Tests Pass** (1090 SUCCESS)
- [ ] **ADRs Complete** (ADR-001, ADR-002, ADR-003)

### Should Have ✅

- [ ] **ESLint Clean** (oder bekannte Warnings dokumentiert)
- [ ] **Performance Acceptable** (keine Regression)
- [ ] **Code Review Checklist Complete**

### Nice to Have 📝

- [ ] **Inline Documentation** für komplexe Logik
- [ ] **README Files** in Domain-Ordnern
- [ ] **Performance Tests** für EventBus

---

## Sign-off

**Reviewer**: _____________________
**Date**: _____________________
**Status**: [ ] Approved  [ ] Approved with Changes  [ ] Rejected

**Comments**:
```
[Reviewer Notes]
```

---

## Next Steps After Review

1. **Address Feedback** - Fix kritische Issues
2. **Update Documentation** - Basierend auf Reviewer-Feedback
3. **Merge to Main** - Nach Approval
4. **Team Onboarding** - DDD/EventBus Workshop
5. **Monitor Production** - EventBus Performance tracking

---

## References

- [Clean Architecture Documentation](/mnt/c/SourceCode/CLEAN_ARCHITECTURE_REFACTORING.md)
- [ADR-001: EventBus Pattern](./adr/ADR-001-eventbus-pattern.md)
- [ADR-002: Clean Architecture Layers](./adr/ADR-002-clean-architecture-layers.md)
- [ADR-003: DDD Service Organisation](./adr/ADR-003-ddd-service-organisation.md)
- [EventBus Tests](../src/app/application/services/event-bus.service.spec.ts)
- [Integration Tests](../src/app/application/services/event-bus.integration.spec.ts)

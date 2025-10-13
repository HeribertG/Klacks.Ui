# Clean Architecture Refactoring - Team Presentation

**Date**: TBD
**Duration**: 60 minutes
**Presenter**: Team

---

## SLIDE 1: Title

# Clean Architecture Refactoring
## Phase 1-4 Complete ✅

**Team Achievement**
**Date**: October 2025

---

## SLIDE 2: Agenda

# Today's Agenda

1. 📊 **Results & Metrics** (20 min)
2. 🎓 **Technical Deep Dive** (25 min)
3. 💬 **Discussion & Decisions** (20 min)
4. 📝 **Next Steps** (15 min)

---

## SLIDE 3: Why This Matters

# Why Clean Architecture?

## Before
❌ Domain Services called Toast directly
❌ Business Logic tied to UI
❌ Hard to test
❌ Not reusable

## After
✅ Domain independent from UI
✅ Business Logic isolated
✅ Easy to test
✅ Reusable in other projects

---

## SLIDE 4: Results Summary

# What We Achieved

| Metric | Result |
|--------|--------|
| **Tests** | 1090 SUCCESS, 0 FAILED |
| **Critical Issues** | 0 (Fixed!) |
| **Services Refactored** | 36 |
| **Duration** | 8.5 hours |
| **Status** | ✅ Production Ready |

---

## SLIDE 5: Before & After

# Architecture Transformation

## Before
```
Services (Flat)
├── DataManagementShiftService ❌ → ToastService
├── DataManagementClientService ❌ → NavigationService
└── ... (all mixed together)
```

## After
```
Domain (Business Logic)
├── shift/
├── client/
└── ... (8 bounded contexts)

Application (Use Cases)
└── EventBus ← Domain emits events

Presentation (UI)
└── DomainEventHandler → ToastService, Router
```

---

## SLIDE 6: Dependency Rule

# Clean Architecture Dependency Rule

```
┌─────────────────────┐
│    Presentation     │ ← Can depend on everything
└──────────┬──────────┘
           ↓
┌──────────┴──────────┐
│    Application      │ ← Can depend on Domain
└──────────┬──────────┘
           ↓
┌──────────┴──────────┐
│    Domain (Core)    │ ← Depends on NOTHING
└─────────────────────┘
```

**Rule**: Dependencies only point inward!

---

## SLIDE 7: Metrics - Violations

# Dependency Violations

## Before Fix
| Type | Count | Severity |
|------|-------|----------|
| Domain → Presentation | 1 | 🔴 CRITICAL |
| Domain → Application | 9 | 🟡 MODERATE |
| Application → Presentation | 2 | 🟡 MODERATE |
| **TOTAL** | **12** | |

## After Fix
| Type | Count | Severity |
|------|-------|----------|
| Domain → Presentation | **0** | ✅ **FIXED** |
| Domain → Application | 9 | 🟡 MODERATE |
| Application → Presentation | 2 | 🟡 MODERATE |
| **CRITICAL** | **0** | ✅ |

---

## SLIDE 8: Test Coverage

# Test Results

## New Tests Added: +33
- EventBus Unit Tests: 33 tests
- EventBus Integration Tests: 15 tests
- DomainEventHandler Tests: 3 tests

## Final Count
**1090 tests** - **100% pass rate** ✅

---

## SLIDE 9: EventBus Pattern

# EventBus Pattern Explained

## Old Way (Bad)
```typescript
private toastService = inject(ToastShowService);

this.toastService.showError('Error!', 'ERR');
```
❌ Domain depends on Presentation

## New Way (Good)
```typescript
private eventBus = inject(EventBus);

this.eventBus.emit(DomainEventType.ERROR, {
  message: 'Error!',
  code: 'ERR',
  context: 'MyService.myMethod'
});
```
✅ Domain only emits events

---

## SLIDE 10: Event Flow

# How Events Flow

```
1. Domain Service
   ↓ emit(ERROR, {...})

2. EventBus (Application)
   ↓ on(ERROR)

3. DomainEventHandler (Presentation)
   ↓ calls

4. ToastShowService
   → User sees toast! 🍞
```

**Benefit**: Domain doesn't know about Toast!

---

## SLIDE 11: DDD Structure

# Domain-Driven Design

## 8 Bounded Contexts

```
domain/services/
├── shift/          (2 services)  - Schicht-Management
├── absence/        (3 services)  - Abwesenheiten
├── group/          (4 services)  - Gruppen
├── contract/       (1 service)   - Verträge
├── schedule/       (2 services)  - Zeitpläne
├── calendar/       (2 services)  - Kalender
├── settings/       (3 services)  - Einstellungen
├── llm/            (5 services)  - AI/LLM
└── client/         (10 services) - Kunden
```

**Benefit**: Easy to navigate by business domain!

---

## SLIDE 12: Where Does My Code Go?

# Decision Tree

```
Is it UI-specific (buttons, toast, styling)?
  → Presentation

Is it business logic (calculations, rules)?
  → Domain

Is it use case orchestration (workflow)?
  → Application

Is it external service (API, storage)?
  → Infrastructure
```

---

## SLIDE 13: Rectangle Fix

# Critical Issue: Rectangle

## Problem
```typescript
src/app/domain/models/absence-class.ts
  → import { Rectangle } from 'presentation/...'
```
❌ Domain depends on Presentation!

## Solution
1. Move Rectangle to Domain
2. Update 13 import statements
3. Tests still pass ✅

**Lesson**: Always check dependencies!

---

## SLIDE 14: Remaining Issues

# What's Left? (Non-Blocking)

| Issue | Severity | Effort |
|-------|----------|--------|
| MessageLibrary placement | 🟡 MODERATE | 20 min |
| WorkplaceStateService | 🟡 MODERATE | 15 min |
| SpinnerService | 🟡 MODERATE | 20 min |
| context-menu-data-template | 🟡 MODERATE | 10 min |

**Total**: ~1.5 hours (can do post-merge)

---

## SLIDE 15: Discussion #1

# Issue: MessageLibrary

## Current State
```typescript
Domain Services import MessageLibrary from Application
```

## Options
**A.** Move to Infrastructure (storage constants)
**B.** Move to Domain (domain constants)

## Vote
- Option A: _____
- Option B: _____

**Decision**: _____

---

## SLIDE 16: Discussion #2

# Issue: WorkplaceStateService

## Current State
```typescript
group-selection.service (Domain)
  → uses WorkplaceStateService (Application)
```

## Options
**A.** Move group-selection to Application (it orchestrates)
**B.** Create interface in Domain, implement in Application

## Vote
- Option A: _____
- Option B: _____

**Decision**: _____

---

## SLIDE 17: Discussion #3

# Issue: SpinnerService

## Current State
```typescript
WorkplaceStateService (Application)
  → uses SpinnerService (Presentation)
```

## Options
**A.** Use EventBus for loading states
**B.** Extract ILoadingIndicator interface

## Vote
- Option A: _____
- Option B: _____

**Decision**: _____

---

## SLIDE 18: Best Practices

# Going Forward: Best Practices

1. **Before Coding**: Ask "Which layer?"
2. **During Coding**: Check imports (no upward dependencies!)
3. **Code Review**: Use checklist
4. **New Feature**: Follow DDD structure

## Prevention
- ESLint rules (automated checks)
- PR template (architecture checklist)
- Team workshop (once per quarter)

---

## SLIDE 19: How to Use EventBus

# Quick Reference: EventBus

## Emit an Error
```typescript
this.eventBus.emit(DomainEventType.ERROR, {
  message: 'Something went wrong',
  code: 'ErrorCode',
  context: 'ServiceName.methodName'
});
```

## Emit Success
```typescript
this.eventBus.emit(DomainEventType.SUCCESS, {
  message: 'Saved successfully',
  context: 'ServiceName.save'
});
```

## Navigate
```typescript
this.eventBus.emit(DomainEventType.NAVIGATE, {
  route: '/workplace/shift'
});
```

---

## SLIDE 20: How to Add New Service

# Where Does My New Service Go?

## Step 1: Identify Domain
- Is it Shift-related? → `domain/services/shift/`
- Is it Client-related? → `domain/services/client/`
- Cross-domain? → Consider Application layer

## Step 2: Check Dependencies
- Need Toast/Navigation? → Use EventBus
- Need LocalStorage? → Inject Infrastructure service
- Need other Domain service? → OK to import

## Step 3: Tests
- Mock EventBus in tests
- Test domain logic independently

---

## SLIDE 21: Action Items

# Next Steps - Immediate

## Merge & Deploy
- [ ] **Merge to main** (Today)
- [ ] **Deploy to staging** (This week)
- [ ] **Monitor for issues** (1 week)

## Communication
- [ ] Update team wiki
- [ ] Notify stakeholders
- [ ] Create FAQ document

---

## SLIDE 22: Action Items

# Next Steps - Post-Merge

| Task | Owner | Deadline |
|------|-------|----------|
| Fix MessageLibrary | _____ | 2 weeks |
| Fix SpinnerService | _____ | 2 weeks |
| Move context-menu-data-template | _____ | 2 weeks |
| ESLint rules | _____ | 1 month |
| Team workshop | _____ | 1 month |

---

## SLIDE 23: Long-term Roadmap

# Future Improvements

## Sprint Planning
- **Sprint +1**: Fix remaining moderate issues
- **Sprint +2**: ESLint automation
- **Sprint +3**: Client domain split?
- **Sprint +4**: E2E tests

## Continuous Improvement
- Quarterly architecture reviews
- Regular team workshops
- Update ADRs as needed

---

## SLIDE 24: Resources

# Where to Learn More

## Documentation
- 📁 `/docs/REFACTORING_SUMMARY.md` - Quick overview
- 📁 `/docs/adr/` - Architecture decisions
- 📁 `/docs/CODE_REVIEW_REPORT_UPDATED.md` - Detailed report

## Getting Help
- Ask in #architecture channel
- Book office hours with Senior Dev
- Review existing refactored services

---

## SLIDE 25: Q&A

# Questions?

**Common Questions**:
1. How do I test EventBus?
2. What if I forget to use EventBus?
3. Can I still use Toast in Components?
4. What about legacy code?
5. Where do I put utility functions?

**Open Floor**: Your questions?

---

## SLIDE 26: Team Recognition

# Thank You! 🎉

## This Was a Team Effort

- **Planning**: 1 hour
- **Implementation**: 8.5 hours
- **Testing**: Continuous
- **Documentation**: 3 hours
- **Review & Fix**: 2 hours

**Total Investment**: ~15 hours
**Return**: Clean, maintainable architecture for years! 🚀

---

## SLIDE 27: Celebration

# We Did It! ✅

## Achievements
✅ Clean Architecture implemented
✅ 1090 tests passing
✅ 0 critical violations
✅ Production-ready
✅ Team upskilled

## Impact
- Faster development
- Easier testing
- Better maintainability
- Reusable code

**Let's build great things! 🎯**

---

## SLIDE 28: Contact

# Need Help?

## Technical Questions
- Senior Developer
- #architecture channel

## Process Questions
- Tech Lead
- PM

## Documentation
- `/docs/` folder
- Team Wiki

**Thank you for attending!**

---

# END

## Appendix Slides (Backup)

---

## BACKUP 1: Detailed Metrics

# Detailed Refactoring Stats

| Phase | Duration | Services | Files Changed |
|-------|----------|----------|---------------|
| Phase 1 | 1h | 17 | 17 |
| Phase 2 | 4h | 17 | 21 |
| Phase 3 | 1.5h | 22 | 30 |
| Phase 4 | 2h | 5 | 14 |
| **Total** | **8.5h** | **36** | **82** |

---

## BACKUP 2: EventBus API

# EventBus Full API

```typescript
class EventBus {
  emit<T>(eventType: string, payload: T): void
  on<T>(eventType: string): Observable<T>
  onAny(): Observable<DomainEvent>
}

enum DomainEventType {
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
  INFO = 'INFO',
  WARNING = 'WARNING',
  NAVIGATE = 'NAVIGATE'
}
```

---

## BACKUP 3: ADR Summary

# Architecture Decision Records

**ADR-001**: EventBus Pattern
- Why: Decouple Domain from Presentation
- How: Observable-based mediator
- Result: 55 direct calls replaced

**ADR-002**: Layer Structure
- Why: Clean Architecture principles
- How: 4 layers with strict dependencies
- Result: Clear boundaries

**ADR-003**: DDD Organization
- Why: Better code organization
- How: 8 bounded contexts
- Result: Easy navigation

# Code Review Checklist - Clean Architecture Refactoring

**Reviewer**: _____________________
**Date**: _____________________
**Branch/PR**: _____________________

---

## ✅ Quick Verification Commands

```bash
# 1. Check Dependency Rule Violations (Expected: 0 results)
grep -r "from.*presentation/" src/app/domain/
grep -r "from.*application/" src/app/domain/services/
grep -r "from.*presentation/" src/app/application/

# 2. Run TypeScript Compilation (Expected: 0 errors)
npx tsc --noEmit

# 3. Run Tests (Expected: 1090 SUCCESS, 0 FAILED)
export CHROME_BIN=/usr/bin/chromium-browser && npm test

# 4. Check for old imports (Expected: 0 results)
grep -r "ToastShowService" src/app/domain/
grep -r "NavigationService" src/app/domain/
```

---

## 🔍 Architecture Review

### Clean Architecture Compliance
- [ ] Domain Layer: NO imports from Presentation ✅
- [ ] Domain Layer: NO imports from Application ✅
- [ ] Application Layer: NO imports from Presentation ✅
- [ ] Dependencies flow: Presentation → Application → Domain ← Infrastructure ✅

### EventBus Pattern
- [ ] All Domain Services use EventBus (not direct Toast/Navigation) ✅
- [ ] DomainEventHandler initialized in app.config.ts ✅
- [ ] All Event Types defined in `domain/events/domain-events.ts` ✅
- [ ] Events have type-safe interfaces ✅

### Layer Structure
- [ ] Domain: 34 Services in 8 Bounded Contexts ✅
- [ ] Application: 10 Services ✅
- [ ] Infrastructure: 24 Services ✅
- [ ] Presentation: 18 Services ✅

---

## 💻 Code Quality

### TypeScript
- [ ] 0 Compilation Errors ✅
- [ ] No implicit any ✅
- [ ] Strict mode enabled ✅

### Tests
- [ ] All tests pass (1090 SUCCESS) ✅
- [ ] EventBus has Unit Tests (33 tests) ✅
- [ ] EventBus has Integration Tests (15 tests) ✅
- [ ] No unexplained skipped tests ✅

### ESLint
- [ ] Run `npm run lint` - 0 errors or documented exceptions

---

## 📁 File Organization

### Services Moved to Application Layer
- [ ] `ManageableServiceRegistry` (from Presentation) ✅
- [ ] `WorkplaceStateService` (from Presentation) ✅

### Services Moved to Domain Layer
- [ ] `GridColorService` (to domain/services/settings/) ✅
- [ ] `ConstantKeys` (to domain/constants/) ✅
- [ ] `IPaginationDataService` (to domain/interfaces/) ✅

### Domain-Driven Design Structure
- [ ] shift/ (2 services) ✅
- [ ] absence/ (3 services) ✅
- [ ] group/ (4 services) ✅
- [ ] contract/ (1 service) ✅
- [ ] schedule/ (2 services) ✅
- [ ] calendar/ (2 services) ✅
- [ ] settings/ (3 services) ✅
- [ ] llm/ (5 services) ✅
- [ ] client/ (10 services) ✅

---

## 📝 Documentation

### ADRs (Architecture Decision Records)
- [ ] ADR-001: EventBus Pattern - Complete & Accurate ✅
- [ ] ADR-002: Clean Architecture Layers - Complete & Accurate ✅
- [ ] ADR-003: DDD Service Organisation - Complete & Accurate ✅

### Main Documentation
- [ ] CLEAN_ARCHITECTURE_REFACTORING.md - Updated ✅
- [ ] Phase 1-4 documented ✅
- [ ] Statistics accurate ✅

---

## 🎯 Critical Review Points

### 1. EventBus Implementation
**Files to Check**:
- `src/app/application/services/event-bus.service.ts`
- `src/app/presentation/handlers/domain-event.handler.ts`

**Verify**:
- [ ] Type-safe emit() and on() methods
- [ ] All 5 event types handled (ERROR, SUCCESS, WARNING, INFO, NAVIGATE)
- [ ] No memory leaks (subscriptions managed)

### 2. Domain Services Using EventBus
**Sample Files to Check** (spot check 3-5):
- [ ] `src/app/domain/services/shift/data-management-shift.service.ts`
- [ ] `src/app/domain/services/client/data-management-client.service.ts`
- [ ] `src/app/domain/services/llm/data-management-llm.service.ts`

**Verify**:
- [ ] Use `eventBus.emit()` instead of `toastService.show*()`
- [ ] Use `eventBus.emit(NAVIGATE, ...)` instead of `navigationService.navigate()`
- [ ] Include context parameter for debugging

### 3. Cross-Layer Import Paths
**Check Sample Files**:
- [ ] Domain imports Domain/Infrastructure only
- [ ] Application imports Domain/Infrastructure only
- [ ] Presentation can import all layers
- [ ] Absolute imports used (`src/app/...`)

---

## ⚠️ Known Issues / Trade-offs

Review and confirm understanding:

- [ ] **Integration Test Timing**: Uses setTimeout() (not ideal, but works)
- [ ] **DomainEventHandler Constructor Logic**: Setup in constructor (works for now)
- [ ] **Client Domain Size**: 10 services (largest domain, may need split later)
- [ ] **EventBus Context**: Optional parameter (should be required?)

---

## 💡 Spot Check: Sample Code Review

### Pick ONE Domain Service and verify:

**Service**: ________________________________

**Checks**:
- [ ] No `ToastShowService` import
- [ ] No `NavigationService` import
- [ ] Has `EventBus` import
- [ ] Uses `eventBus.emit()` for notifications
- [ ] Includes context in error events
- [ ] Has corresponding unit tests

### Pick ONE Test File and verify:

**Test File**: ________________________________

**Checks**:
- [ ] Tests pass
- [ ] Uses EventBus mock (not ToastService mock)
- [ ] Covers error cases
- [ ] Covers success cases

---

## 📊 Metrics Verification

### Code Statistics
- [ ] **Total Tests**: 1090 (was 1057, +33 new EventBus tests)
- [ ] **Services Refactored**: 36 (34 Domain + 2 Application)
- [ ] **Services Moved**: 5
- [ ] **Imports Updated**: ~30 files
- [ ] **Dependency Violations**: 0

### Refactoring Duration
- [ ] **Phase 1**: ~1 hour
- [ ] **Phase 2**: ~4 hours
- [ ] **Phase 3**: ~1.5 hours
- [ ] **Phase 4**: ~2 hours
- [ ] **Total**: ~8.5 hours

---

## ✍️ Reviewer Notes

### Strengths:
```




```

### Areas for Improvement:
```




```

### Blockers (if any):
```




```

---

## ✅ Final Approval

- [ ] **All critical checks passed**
- [ ] **No dependency rule violations**
- [ ] **All tests pass**
- [ ] **Documentation complete**
- [ ] **Code quality acceptable**

**Status**:
- [ ] ✅ Approved - Ready to Merge
- [ ] 🔄 Approved with Minor Changes
- [ ] ❌ Rejected - Major Issues Found

**Reviewer Signature**: _____________________

**Date**: _____________________

---

## 📌 Next Actions

After Approval:
1. [ ] Address any feedback/comments
2. [ ] Merge to main branch
3. [ ] Team onboarding session (DDD/EventBus)
4. [ ] Monitor production performance
5. [ ] Update team documentation

After Rejection:
1. [ ] Review blocker issues
2. [ ] Create action plan
3. [ ] Schedule follow-up review

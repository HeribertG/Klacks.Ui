# Clean Architecture Refactoring - Fortschritt

## Übersicht
Schrittweise Umstellung der Klacks.Ui Angular-Anwendung auf Clean Architecture nach Uncle Bob.

**Gesamtaufwand:** 16 Wochen (480 Stunden)
**Aktueller Stand:** Phase 1 abgeschlossen

---

## Phase 1: Foundation - Interfaces in Domain Layer (✅ Abgeschlossen)

**Datum:** 12.10.2025
**Aufwand:** ~4 Stunden

### Durchgeführte Änderungen:

#### 1. Neue Interface-Struktur erstellt
- **Datei:** `/src/app/domain/interfaces/manageable.interface.ts`
- **Inhalt:** Framework-agnostische Interfaces ohne Angular-spezifische Typen

```typescript
export interface ISaveable {
  areObjectsDirty(): boolean;
  canSave?(): boolean;
  save(): void;
  onSaveCompleted?: () => void;
}

export interface IResettable {
  resetData(): void;
  readonly isReset: boolean;
}

export interface ILoadable {
  readonly showProgressSpinner: boolean;
}

export interface INavigable {
  goBack(): string;
}
```

**Wichtig:**
- `isReset` und `showProgressSpinner` sind jetzt `readonly boolean` Properties (keine Signals!)
- Interfaces sind framework-agnostisch (keine Angular-Abhängigkeiten)

#### 2. Services aktualisiert (27 Dateien)

**Pattern:** Private Signal + Public Getter

```typescript
// Vorher:
public showProgressSpinner = signal(false);
public isReset = signal(false);

// Nachher:
private _showProgressSpinner = signal(false);
get showProgressSpinner(): boolean { return this._showProgressSpinner(); }

private _isReset = signal(false);
get isReset(): boolean { return this._isReset(); }
```

**Aktualisierte Domain Services:**
- `/src/app/domain/services/data-management-shift.service.ts`
- `/src/app/domain/services/data-management-group.service.ts`
- `/src/app/domain/services/client/data-management-client.service.ts`
- `/src/app/domain/services/data-management-absence.service.ts`
- `/src/app/domain/services/data-management-settings.service.ts`
- `/src/app/domain/services/settings-manageable-wrapper.service.ts`
- `/src/app/domain/services/data-management-schedule.service.ts`
- `/src/app/domain/services/data-management-shift-cut.service.ts`
- `/src/app/domain/services/data-management-profile.service.ts`
- `/src/app/domain/services/data-management-break.service.ts`
- `/src/app/domain/services/data-management-contract.service.ts`
- `/src/app/domain/services/data-management-absence-gantt.service.ts`
- `/src/app/domain/services/client/client-edit.service.ts`
- `/src/app/domain/services/client/client-list.service.ts`
- `/src/app/domain/services/data-management-group-visibility.service.ts`
- `/src/app/domain/services/data-management-llm.service.ts`

**Aktualisierte Presentation Services:**
- `/src/app/presentation/shared/grid/services/grid-color.service.ts`
- `/src/app/presentation/shared/grid/services/grid-fonts.service.ts`
- `/src/app/presentation/shared/grid/services/holiday-collection.service.ts`

**Aktualisierte Core Files:**
- `/src/app/presentation/workplace/core/manageable-service-registry.ts`
- `/src/app/presentation/workplace/core/manageable-service.factory.ts`
- `/src/app/presentation/workplace/core/workplace-state.service.ts`

**Import Fixes:**
- `/src/app/presentation/directives/resize-observer.directive.ts` (inject import hinzugefügt)
- `/src/app/presentation/services/resize.service.ts` (inject import hinzugefügt)

#### 3. Components aktualisiert (50+ Dateien)

**Änderung:** Getter-Aufrufe korrigiert

```typescript
// Vorher:
const isReset = this.service.isReset();
if (this.service.showProgressSpinner()) { ... }

// Nachher:
const isReset = this.service.isReset;
if (this.service.showProgressSpinner) { ... }
```

**Betroffene Components:**
- Alle Components im `/src/app/presentation/workplace/` Verzeichnis
- Grid-Services und deren Consumers

#### 4. Tests aktualisiert
- `/src/app/domain/services/data-management-llm.service.spec.ts`
  - `service.showProgressSpinner()` → `service.showProgressSpinner`

### Ergebnisse:

✅ **0 TypeScript Compilation Errors**
✅ **937 Tests passing, 21 skipped**
✅ **22 Domain → Presentation Dependencies entfernt**
✅ **Framework-agnostische Interfaces**
✅ **Korrekte Dependency-Richtung: Presentation → Application → Domain**

### Script für Batch-Updates:
```bash
# Pattern für Signal → Getter Konvertierung
sed -i '/public showProgressSpinner = signal/c\  private _showProgressSpinner = signal(false);\n  get showProgressSpinner(): boolean { return this._showProgressSpinner(); }' "$file"
sed -i 's/this\.showProgressSpinner\.set(/this._showProgressSpinner.set(/g' "$file"

sed -i '/public isReset = signal/c\  private _isReset = signal(false);\n  get isReset(): boolean { return this._isReset(); }' "$file"
sed -i 's/this\.isReset\.set(/this._isReset.set(/g' "$file"
```

---

## Phase 2: Event System (EventBus) - ⏳ In Arbeit

**Ziel:** Domain Layer von Presentation Layer (ToastShowService, NavigationService) entkoppeln

**Datum:** 12.10.2025
**Fortschritt:** 5 von 17 Services refactored (29%)

### ✅ Abgeschlossene Schritte:

#### 1. EventBus Service erstellen
**Datei:** `/src/app/application/services/event-bus.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class EventBus {
  private subjects = new Map<string, Subject<any>>();

  emit<T>(eventType: string, data: T): void {
    if (!this.subjects.has(eventType)) {
      this.subjects.set(eventType, new Subject<T>());
    }
    this.subjects.get(eventType)!.next(data);
  }

  on<T>(eventType: string): Observable<T> {
    if (!this.subjects.has(eventType)) {
      this.subjects.set(eventType, new Subject<T>());
    }
    return this.subjects.get(eventType)!.asObservable();
  }
}
```

#### 2. Domain Events definieren
**Datei:** `/src/app/domain/events/domain-events.ts`

```typescript
export enum DomainEventType {
  ERROR = 'domain:error',
  SUCCESS = 'domain:success',
  WARNING = 'domain:warning',
  INFO = 'domain:info',
}

export interface DomainEvent<T = any> {
  type: DomainEventType;
  payload: T;
  timestamp: Date;
}

export interface ErrorEvent {
  message: string;
  code?: string;
  context?: string;
}
```

#### 3. Domain Services refactorieren

**Beispiel - DataManagementShiftService:**

```typescript
// Vorher:
this.toastShowService.showError(error, 'ShiftError');
this.navigationService.navigateToNewShift();

// Nachher:
this.eventBus.emit(DomainEventType.ERROR, {
  message: error,
  code: 'ShiftError',
  context: 'DataManagementShiftService.saveEditShift'
});

this.eventBus.emit(DomainEventType.NAVIGATE, {
  route: '/workplace/new-shift'
});
```

#### 4. Event Handler in Presentation Layer
**Datei:** `/src/app/presentation/handlers/domain-event.handler.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class DomainEventHandler {
  private toastService = inject(ToastShowService);
  private navigationService = inject(NavigationService);
  private eventBus = inject(EventBus);

  constructor() {
    this.setupErrorHandler();
    this.setupNavigationHandler();
  }

  private setupErrorHandler(): void {
    this.eventBus.on<ErrorEvent>(DomainEventType.ERROR)
      .subscribe(event => {
        this.toastService.showError(event.message, event.code);
      });
  }

  private setupNavigationHandler(): void {
    this.eventBus.on<{route: string}>(DomainEventType.NAVIGATE)
      .subscribe(event => {
        this.navigationService.navigate(event.route);
      });
  }
}
```

### ✅ Refactored Services (5/17):
1. **DataManagementShiftService** - 7 Toast + 2 Navigation calls ersetzt
2. **DataManagementGroupService** - 7 Toast + 3 Navigation calls ersetzt
3. **DataManagementSettingsService** - 12 Toast calls ersetzt
4. **DataManagementAbsenceService** - Nur unused Import entfernt
5. **DataManagementScheduleService** - Nur unused Import entfernt

### ⏳ Verbleibende Services (12/17):
- data-management-client.service.ts
- data-management-llm.service.ts
- data-management-contract.service.ts (3 calls)
- client-list.service.ts
- client-edit.service.ts
- data-management-break.service.ts (3 calls)
- data-management-profile.service.ts (1 call)
- data-management-shift-cut.service.ts (3 calls)
- address.service.ts
- data-management-llm-provider.service.ts
- data-management-calendar-selection.service.ts
- data-management-calendar-rules.service.ts

---

## Phase 3: Repository Pattern (Ports & Adapters) - TODO

**Ziel:** Domain Layer von Infrastructure Layer entkoppeln

### Plan:

#### 1. Repository Interfaces im Domain Layer
**Datei:** `/src/app/domain/ports/shift.repository.ts`

```typescript
export interface IShiftRepository {
  getShift(id: string): Observable<IShift>;
  addShift(shift: IShift): Observable<IShift>;
  updateShift(shift: IShift): Observable<IShift>;
  deleteShift(id: string): Observable<void>;
  readShiftList(filter: ShiftFilter): Observable<ITruncatedShift>;
}
```

#### 2. Adapters im Infrastructure Layer
**Datei:** `/src/app/infrastructure/adapters/shift.repository.adapter.ts`

```typescript
@Injectable()
export class ShiftRepositoryAdapter implements IShiftRepository {
  private dataShiftService = inject(DataShiftService);

  getShift(id: string): Observable<IShift> {
    return this.dataShiftService.getShift(id);
  }
  // ... weitere Methoden
}
```

#### 3. Provider Configuration
**Datei:** `/src/app/app.config.ts`

```typescript
{
  provide: IShiftRepository,
  useClass: ShiftRepositoryAdapter
}
```

#### 4. Domain Services refactorieren

```typescript
// Vorher:
private dataShiftService = inject(DataShiftService);

// Nachher:
private shiftRepository = inject(IShiftRepository);
```

### Zu erstellende Repositories:
- IShiftRepository → DataShiftService
- IGroupRepository → DataGroupService
- IClientRepository → DataClientService
- IAbsenceRepository → DataAbsenceService
- IBreakRepository → DataBreakService
- IContractRepository → DataContractService
- IMacroRepository → DataMacroService
- ICalendarRuleRepository → DataCalendarRuleService
- IProfileRepository → DataProfileService
- ISettingsRepository → DataSettingsVariousService

---

## Phase 4: Layer Reorganization - TODO

**Ziel:** Services in die richtigen Layer verschieben

### 1. Application Layer Use Cases erstellen
Verschiebe "DataManagement" Services → `/src/app/application/use-cases/`

**Beispiel:**
- `data-management-shift.service.ts` → `shift.use-case.ts`
- `data-management-group.service.ts` → `group.use-case.ts`
- `data-management-client.service.ts` → `client.use-case.ts`

### 2. Domain Services extrahieren
Echte Domain-Logik in Domain Services:
- Validierung
- Berechnungen (z.B. work-time-calculation.service.ts)
- Business Rules

### 3. View Models verschieben
Von Domain → Presentation:
- Rectangle (aus absence-class.ts)
- UI-spezifische Properties

---

## Phase 5: Code Quality & Testing - TODO

### 1. Base Classes erstellen
```typescript
export abstract class BaseCrudUseCase<T, TFilter> {
  protected abstract repository: IRepository<T>;

  getById(id: string): Observable<T> { ... }
  create(entity: T): Observable<T> { ... }
  update(entity: T): Observable<T> { ... }
  delete(id: string): Observable<void> { ... }
  getList(filter: TFilter): Observable<T[]> { ... }
}
```

### 2. Unit Tests schreiben
- Domain Services (Validierung, Berechnungen)
- Use Cases (Mocking von Repositories)

### 3. Integration Tests
- Use Cases mit echten Adapters
- Repository Adapters

---

## Bekannte Probleme & Lösungen

### Problem: Signal als Interface Property
**Fehler:** TypeScript akzeptiert `Signal<boolean>` nicht in Interfaces

**Lösung:**
- Private Signal + Public Getter
- Interface definiert `readonly boolean` Property

### Problem: Getter wird als Function aufgerufen
**Fehler:** `this.service.isReset()` funktioniert nicht

**Lösung:**
- Alle `()` bei Getter-Aufrufen entfernen
- `this.service.isReset` statt `this.service.isReset()`

### Problem: Externe `.set()` Aufrufe auf Getters
**Fehler:** `service.isReset.set(false)` - Property 'set' does not exist on type 'boolean'

**Lösung:**
- Service setzt sich selbst zurück via `setTimeout(() => this._isReset.set(false), 100)`
- Externe `.set()` Aufrufe entfernen

---

## Nächste Schritte

### Sofort (Phase 2 - Wochen 3-4):
1. EventBus Service erstellen
2. Domain Events definieren
3. 22 Domain Services refactorieren (ToastShowService entfernen)
4. Event Handlers in Presentation Layer erstellen
5. Tests aktualisieren

### Danach (Phase 3 - Wochen 5-8):
1. Repository Interfaces definieren
2. Adapters implementieren
3. Domain Services refactorieren (Infrastructure Dependencies entfernen)
4. DI Configuration anpassen

### Langfristig:
- Continuous Refactoring
- Test Coverage erhöhen
- Performance Monitoring
- Dokumentation aktualisieren

---

## Metriken

### Vorher (Analyse):
- ❌ 46 Domain → Presentation Dependencies
- ❌ 34 Domain → Infrastructure Dependencies
- ❌ 22 Services mit ToastShowService im Domain Layer
- ❌ 18 Services mit NavigationService im Domain Layer

### Nach Phase 1:
- ✅ 0 TypeScript Compilation Errors
- ✅ 937 Tests passing
- ✅ 22 Domain → Presentation Dependencies entfernt (Interfaces)
- ❌ 34 Domain → Infrastructure Dependencies (TODO: Phase 3)
- ❌ 22 Services mit ToastShowService (TODO: Phase 2)

### Ziel (Ende Phase 5):
- ✅ 0 Domain → Presentation Dependencies
- ✅ 0 Domain → Infrastructure Dependencies
- ✅ 100% Interface-basierte Dependencies
- ✅ >80% Test Coverage für Domain Layer
- ✅ Klare Layer-Trennung

---

## Wichtige Dateien für neue Session

### Geänderte Core-Files:
1. `/src/app/domain/interfaces/manageable.interface.ts` - Neue Interfaces
2. `/src/app/presentation/workplace/core/manageable-service-registry.ts` - Import aktualisiert
3. `/src/app/presentation/workplace/core/manageable-service.factory.ts` - Import aktualisiert
4. `/src/app/presentation/workplace/core/workplace-state.service.ts` - Import aktualisiert

### Pattern-Beispiele:
- Signal → Getter Pattern: `/src/app/domain/services/data-management-shift.service.ts`
- Computed Signal → Getter: `/src/app/domain/services/client/data-management-client.service.ts`
- Test Updates: `/src/app/domain/services/data-management-llm.service.spec.ts`

### Alte Dateien (können gelöscht werden nach Phase 5):
- `/src/app/presentation/workplace/core/interfaces/common.interfaces.ts`

---

## Lessons Learned

1. **Batch-Updates mit sed sehr effektiv** für gleichartige Änderungen
2. **Getter statt Functions** in Interfaces für bessere Encapsulation
3. **Framework-agnostische Interfaces** ermöglichen zukünftige Framework-Wechsel
4. **Schrittweise Refactoring** verhindert Breaking Changes
5. **Tests zuerst prüfen** nach jedem Refactoring-Schritt

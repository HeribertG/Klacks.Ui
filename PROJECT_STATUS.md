# Klacks.Ui - Project Status & Development Guide

**Letztes Update:** 13.10.2025
**Angular Version:** 18.x
**Gesamtfortschritt:** Phase 1 (Clean Architecture) + Phase 2 (Signals Migration) abgeschlossen

---

## 📋 Inhaltsverzeichnis

1. [Angular Signals Migration](#angular-signals-migration)
2. [Clean Architecture Refactoring](#clean-architecture-refactoring)
3. [Environment Configuration](#environment-configuration)
4. [Test Status](#test-status)
5. [Nächste Schritte](#nächste-schritte)

---

## 🔄 Angular Signals Migration

### Übersicht

Schrittweise Migration von RxJS BehaviorSubjects zu Angular Signals für bessere Performance und einfacheren reaktiven Code.

**Status:** Phase 2 abgeschlossen
**Datum:** 13.10.2025
**Test-Status:** ✅ 1098 SUCCESS, 0 FAILED, 21 SKIPPED

---

### Phase 1: Foundation Services ✅ Abgeschlossen

**Datum:** Vor 13.10.2025
**Migrierte Services:** 4

1. **DataManagementThemeService**
   - `theme$: BehaviorSubject` → `theme: WritableSignal`
   - Observable-Wrapper mit `toObservable()` für Backward Compatibility

2. **DataManagementSettingsService**
   - Settings state als Signal
   - Computed Signals für abgeleitete Werte

3. **DataManagementAbsenceTypeService**
   - Liste von Absence Types als Signal
   - Vereinfachte State-Updates

4. **DataManagementWageTypeService**
   - Wage Types State Management
   - Signal-basierte Filterung

**Pattern:**
```typescript
// Vorher:
private dataSubject$ = new BehaviorSubject<IData[]>([]);
public data$ = this.dataSubject$.asObservable();

getData(): Observable<IData[]> {
  return this.data$;
}

// Nachher:
public data = signal<IData[]>([]);
private data$ = toObservable(this.data); // Class field!

getData(): Observable<IData[]> {
  return this.data$;
}

// Verwendung:
this.data.set([...newData]);
const currentData = this.data();
```

---

### Phase 2: LLM & Speech Services ✅ Abgeschlossen

**Datum:** 13.10.2025
**Dauer:** ~4 Stunden
**Migrierte Services:** 3
**Behobene Test-Fehler:** 19 → 0

#### 1. DataManagementLLMService

**Migrierte BehaviorSubjects (4):**
- `availableModels$` → `availableModels: WritableSignal<ILLMModel[]>`
- `selectedModelId$` → `selectedModelId: WritableSignal<string>`
- `isLoading$` → `isLoading: WritableSignal<boolean>`
- `currentLanguage$` → `currentLanguage: WritableSignal<string>`

**Änderungen:**
```typescript
// Signal-Deklarationen
public availableModels = signal<ILLMModel[]>([]);
public selectedModelId = signal<string>('');
public isLoading = signal<boolean>(false);
public currentLanguage = signal<string>('de');

// Observable-Wrapper als Class Fields (wichtig für Injection Context!)
private availableModels$ = toObservable(this.availableModels);
private selectedModelId$ = toObservable(this.selectedModelId);
private currentLanguage$ = toObservable(this.currentLanguage);
private isLoading$ = toObservable(this.isLoading);

// Public Methods für Backward Compatibility
getAvailableModels(): Observable<ILLMModel[]> {
  return this.availableModels$;
}

getCurrentModelId(): Observable<string> {
  return this.selectedModelId$;
}

// Neue Methode für isLoading (Naming-Konflikt vermeiden)
isLoadingObservable(): Observable<boolean> {
  return this.isLoading$;
}

// State Updates
this.isLoading.set(true);
const modelId = this.selectedModelId();
```

**Wichtige Erkenntnisse:**
- ⚠️ `toObservable()` **MUSS** als Class Field initialisiert werden, nicht in Methoden
- ⚠️ Injection Context Error wenn `toObservable()` in Methoden aufgerufen wird
- ✅ Observable-Wrapper ermöglichen nahtlose Migration ohne Breaking Changes

#### 2. DataManagementLLMProviderService

**Migrierte BehaviorSubjects (1):**
- `providers$` → `providers: WritableSignal<ILLMProvider[]>`

**Änderungen:**
```typescript
public providers = signal<ILLMProvider[]>([]);
private providers$ = toObservable(this.providers);

getProviders(): Observable<ILLMProvider[]> {
  return this.providers$;
}

getCurrentProviders(): ILLMProvider[] {
  return this.providers();
}
```

#### 3. SpeechRecognitionService

**Migrierte BehaviorSubjects (2):**
- `isListening$` → `isListening: WritableSignal<boolean>`
- `isSupportedSubject$` → `isSupported$: WritableSignal<boolean>`

**Beibehalten als Subjects (Event Streams):**
- ✅ `results$: Subject<string>` - Event Stream, kein State
- ✅ `errors$: Subject<string>` - Event Stream, kein State

**Änderungen:**
```typescript
// Signals für State
public isListening = signal<boolean>(false);
public isSupported$ = signal<boolean>(false);

// Subjects für Events bleiben
private results$ = new Subject<string>();
private errors$ = new Subject<string>();

// Backward Compatibility Getter
get isListeningObservable(): Observable<boolean> {
  return toObservable(this.isListening);
}
```

**Wichtige Unterscheidung:**
- **State** → Signal (aktueller Wert, der sich ändert)
- **Events** → Subject (Ereignisse, die gefeuert werden)

---

### Template & Component Updates

#### llm-chat.component.html (4 Änderungen)

```html
<!-- Vorher: -->
@if (speechService.isSupported$.value === false) {
  <div class="speech-not-supported">...</div>
}
[disabled]="isProcessing || !speechService.isSupported$.value"

<!-- Nachher: -->
@if (speechService.isSupported$() === false) {
  <div class="speech-not-supported">...</div>
}
[disabled]="isProcessing || !speechService.isSupported$()"
```

#### llm-providers.component.ts

```typescript
// Vorher:
this.providerService.providers$
  .pipe(takeUntil(this.destroy$))
  .subscribe(providers => { this.providers = providers; });

// Nachher:
this.providerService.getProviders()
  .pipe(takeUntil(this.destroy$))
  .subscribe(providers => { this.providers = providers; });
```

---

### Test-Fixes

#### Problem 1: Signal Mock in Tests (16 Tests gefixt)

**Fehler:**
```
TypeError: ctx.speechService.isSupported$ is not a function
```

**Ursache:** Mock verwendete `BehaviorSubject` statt Signal-Funktion

**Lösung:**
```typescript
// ❌ Falsch:
const speechServiceSpy = jasmine.createSpyObj('SpeechRecognitionService',
  ['startListening'],
  { isSupported$: new BehaviorSubject(true) }
);

// ✅ Richtig:
const speechServiceSpy = jasmine.createSpyObj('SpeechRecognitionService',
  ['startListening'],
  { isSupported$: jasmine.createSpy('isSupported$').and.returnValue(true) }
);
```

#### Problem 2: Loading State Test (1 Test gefixt)

**Fehler:**
```
Expected [ false, false ] to contain true
```

**Ursache:** Synchrones Observable führte zu zu schnellen State-Änderungen

**Lösung:**
```typescript
// ❌ Falsch - Synchrones Observable:
mockDataLLMService.chat.and.returnValue(of(mockResponse));

// ✅ Richtig - Asynchrones Observable mit Delay:
mockDataLLMService.chat.and.returnValue(
  of(mockResponse).pipe(delay(50))
);

// Import hinzufügen:
import { of, throwError, delay } from 'rxjs';
```

#### Problem 3: LLMProvidersComponent Mock (2 Tests gefixt)

**Fehler:**
```
TypeError: this.providerService.getProviders is not a function
```

**Ursache:** Neue `getProviders()` Methode fehlte im Mock

**Lösung:**
```typescript
const providerServiceSpy = jasmine.createSpyObj(
  'DataManagementLLMProviderService',
  [
    'loadProviders',
    'createProvider',
    'updateProvider',
    'deleteProvider',
    'toggleProviderStatus',
    'getProviders', // ← Hinzugefügt!
  ],
  {
    providers$: of(mockProviders),
    isLoading: signal(false),
  }
);

// Return Value setzen:
providerServiceSpy.getProviders.and.returnValue(of(mockProviders));
```

---

### Geänderte Dateien (Phase 2)

**Services (3):**
- `src/app/domain/services/llm/data-management-llm.service.ts`
- `src/app/domain/services/llm/data-management-llm-provider.service.ts`
- `src/app/presentation/aside/llm-chat/services/speech-recognition.service.ts`

**Components (2):**
- `src/app/presentation/aside/llm-chat/llm-chat.component.html` (4× Signal-Zugriff)
- `src/app/presentation/workplace/settings/llm-providers/llm-providers.component.ts`

**Tests (3):**
- `src/app/presentation/aside/llm-chat/llm-chat.component.spec.ts`
- `src/app/domain/services/llm/data-management-llm.service.spec.ts`
- `src/app/presentation/workplace/settings/llm-providers/llm-providers.component.spec.ts`

---

### Migration Pattern Summary

#### ✅ Best Practices

1. **toObservable() als Class Field**
   ```typescript
   public data = signal<T>([]);
   private data$ = toObservable(this.data); // ✅ Class field

   // ❌ NICHT in Methoden:
   getData(): Observable<T> {
     return toObservable(this.data); // Error: Injection Context!
   }
   ```

2. **Backward Compatibility mit Observable-Wrappern**
   ```typescript
   // Bestehende API bleibt erhalten
   getAvailableModels(): Observable<ILLMModel[]> {
     return this.availableModels$; // Observable-Wrapper
   }
   ```

3. **State vs Events unterscheiden**
   - Signal → Aktueller State (isLoading, currentUser, selectedItem)
   - Subject → Events (buttonClicked$, dataChanged$, errorOccurred$)

4. **Test-Mocks für Signals**
   ```typescript
   // Signal als Spy-Funktion
   { mySignal: jasmine.createSpy('mySignal').and.returnValue(initialValue) }
   ```

5. **Async Tests für Signal-Propagierung**
   ```typescript
   // Delay für State-Propagierung in Tests
   mockService.method.and.returnValue(of(data).pipe(delay(50)));
   ```

---

### Metriken (Phase 1 + 2)

**Migrierte Services:** 7
**Migrierte BehaviorSubjects:** ~15
**Behobene Test-Fehler:** 19
**Test-Status:** ✅ 1098 SUCCESS, 0 FAILED, 21 SKIPPED

---

### Phase 3: Nächste Services (Geplant)

Potenzielle Kandidaten für weitere Migration:
- DataManagementClientService
- DataManagementAbsenceService
- DataManagementContractService
- WorkplaceStateService
- NavigationService

---

## 🏗️ Clean Architecture Refactoring

### Übersicht

Schrittweise Umstellung auf Clean Architecture nach Uncle Bob für bessere Wartbarkeit, Testbarkeit und Framework-Unabhängigkeit.

**Gesamtaufwand:** 16 Wochen (480 Stunden)
**Aktueller Stand:** Phase 1 abgeschlossen, Phase 2 in Arbeit

---

### Phase 1: Foundation - Interfaces in Domain Layer ✅

**Datum:** 12.10.2025
**Aufwand:** ~4 Stunden
**Status:** Abgeschlossen

#### Neue Interface-Struktur

**Datei:** `/src/app/domain/interfaces/manageable.interface.ts`

```typescript
export interface ISaveable {
  areObjectsDirty(): boolean;
  canSave?(): boolean;
  save(): void;
  onSaveCompleted?: () => void;
}

export interface IResettable {
  resetData(): void;
  readonly isReset: boolean; // ← Nicht Signal!
}

export interface ILoadable {
  readonly showProgressSpinner: boolean; // ← Nicht Signal!
}

export interface INavigable {
  goBack(): string;
}
```

**Wichtig:**
- Framework-agnostisch (keine Angular-spezifischen Typen)
- `readonly boolean` Properties statt `Signal<boolean>`
- Klare Interface-Segregation

#### Services: Private Signal + Public Getter Pattern

**Pattern:**
```typescript
// Vorher (Angular-spezifisch):
public showProgressSpinner = signal(false);
public isReset = signal(false);

// Nachher (Interface-konform):
private _showProgressSpinner = signal(false);
get showProgressSpinner(): boolean {
  return this._showProgressSpinner();
}

private _isReset = signal(false);
get isReset(): boolean {
  return this._isReset();
}

// Internes Setzen:
this._showProgressSpinner.set(true);
this._isReset.set(false);
```

#### Aktualisierte Services (27)

**Domain Services:**
- `data-management-shift.service.ts`
- `data-management-group.service.ts`
- `client/data-management-client.service.ts`
- `data-management-absence.service.ts`
- `data-management-settings.service.ts`
- `settings-manageable-wrapper.service.ts`
- `data-management-schedule.service.ts`
- `data-management-shift-cut.service.ts`
- `data-management-profile.service.ts`
- `data-management-break.service.ts`
- `data-management-contract.service.ts`
- `data-management-absence-gantt.service.ts`
- `client/client-edit.service.ts`
- `client/client-list.service.ts`
- `data-management-group-visibility.service.ts`
- `data-management-llm.service.ts`

**Presentation Services:**
- `shared/grid/services/grid-color.service.ts`
- `shared/grid/services/grid-fonts.service.ts`
- `shared/grid/services/holiday-collection.service.ts`

#### Components aktualisiert (50+)

**Änderung:** Getter-Aufrufe korrigiert

```typescript
// Vorher:
const isReset = this.service.isReset();
if (this.service.showProgressSpinner()) { ... }

// Nachher:
const isReset = this.service.isReset;
if (this.service.showProgressSpinner) { ... }
```

#### Ergebnisse

✅ **0 TypeScript Compilation Errors**
✅ **937 Tests passing, 21 skipped**
✅ **22 Domain → Presentation Dependencies entfernt**
✅ **Framework-agnostische Interfaces**
✅ **Korrekte Dependency-Richtung: Presentation → Application → Domain**

---

### Phase 2: Event System (EventBus) ⏳ In Arbeit

**Ziel:** Domain Layer von Presentation Layer (ToastShowService, NavigationService) entkoppeln

**Datum:** 12.10.2025
**Fortschritt:** 5 von 17 Services refactored (29%)

#### EventBus Service

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

#### Domain Events

**Datei:** `/src/app/domain/events/domain-events.ts`

```typescript
export enum DomainEventType {
  ERROR = 'domain:error',
  SUCCESS = 'domain:success',
  WARNING = 'domain:warning',
  INFO = 'domain:info',
  NAVIGATE = 'domain:navigate',
}

export interface ErrorEvent {
  message: string;
  code?: string;
  context?: string;
}

export interface NavigationEvent {
  route: string;
  queryParams?: Record<string, any>;
}
```

#### Domain Service Refactoring

**Beispiel - DataManagementShiftService:**

```typescript
// Vorher (Presentation Dependency):
private toastShowService = inject(ToastShowService);
private navigationService = inject(NavigationService);

this.toastShowService.showError(error, 'ShiftError');
this.navigationService.navigateToNewShift();

// Nachher (Event-basiert):
private eventBus = inject(EventBus);

this.eventBus.emit(DomainEventType.ERROR, {
  message: error,
  code: 'ShiftError',
  context: 'DataManagementShiftService.saveEditShift'
});

this.eventBus.emit(DomainEventType.NAVIGATE, {
  route: '/workplace/new-shift'
});
```

#### Event Handler (Presentation Layer)

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
    this.eventBus.on<NavigationEvent>(DomainEventType.NAVIGATE)
      .subscribe(event => {
        this.navigationService.navigate(event.route);
      });
  }
}
```

#### Refactored Services (5/17)

1. ✅ **DataManagementShiftService** - 7 Toast + 2 Navigation calls ersetzt
2. ✅ **DataManagementGroupService** - 7 Toast + 3 Navigation calls ersetzt
3. ✅ **DataManagementSettingsService** - 12 Toast calls ersetzt
4. ✅ **DataManagementAbsenceService** - Nur unused Import entfernt
5. ✅ **DataManagementScheduleService** - Nur unused Import entfernt

#### Verbleibende Services (12/17)

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

### Phase 3: Repository Pattern (Ports & Adapters) TODO

**Ziel:** Domain Layer von Infrastructure Layer entkoppeln

#### Repository Interfaces (Domain Layer)

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

#### Adapters (Infrastructure Layer)

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

#### Provider Configuration

**Datei:** `/src/app/app.config.ts`

```typescript
{
  provide: IShiftRepository,
  useClass: ShiftRepositoryAdapter
}
```

#### Zu erstellende Repositories

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

### Phase 4: Layer Reorganization TODO

**Ziel:** Services in die richtigen Layer verschieben

#### 1. Application Layer Use Cases

Verschiebe "DataManagement" Services → `/src/app/application/use-cases/`

**Beispiel:**
- `data-management-shift.service.ts` → `shift.use-case.ts`
- `data-management-group.service.ts` → `group.use-case.ts`
- `data-management-client.service.ts` → `client.use-case.ts`

#### 2. Domain Services extrahieren

Echte Domain-Logik in Domain Services:
- Validierung
- Berechnungen (z.B. work-time-calculation.service.ts)
- Business Rules

#### 3. View Models verschieben

Von Domain → Presentation:
- Rectangle (aus absence-class.ts)
- UI-spezifische Properties

---

### Phase 5: Code Quality & Testing TODO

#### Base Classes

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

#### Testing

- Unit Tests für Domain Services
- Integration Tests für Use Cases
- Repository Adapter Tests

---

### Bekannte Probleme & Lösungen

#### Problem 1: Signal als Interface Property

**Fehler:** TypeScript akzeptiert `Signal<boolean>` nicht in Interfaces

**Lösung:**
- Private Signal + Public Getter
- Interface definiert `readonly boolean` Property

#### Problem 2: Getter wird als Function aufgerufen

**Fehler:** `this.service.isReset()` funktioniert nicht

**Lösung:**
- Alle `()` bei Getter-Aufrufen entfernen
- `this.service.isReset` statt `this.service.isReset()`

#### Problem 3: Externe `.set()` Aufrufe

**Fehler:** `service.isReset.set(false)` - Property 'set' does not exist on type 'boolean'

**Lösung:**
- Service setzt sich selbst zurück via `setTimeout(() => this._isReset.set(false), 100)`
- Externe `.set()` Aufrufe entfernen

---

### Metriken

#### Vorher (Analyse)
- ❌ 46 Domain → Presentation Dependencies
- ❌ 34 Domain → Infrastructure Dependencies
- ❌ 22 Services mit ToastShowService im Domain Layer
- ❌ 18 Services mit NavigationService im Domain Layer

#### Nach Phase 1
- ✅ 0 TypeScript Compilation Errors
- ✅ 937 Tests passing
- ✅ 22 Domain → Presentation Dependencies entfernt (Interfaces)
- ❌ 34 Domain → Infrastructure Dependencies (TODO: Phase 3)
- ❌ 22 Services mit ToastShowService (TODO: Phase 2)

#### Ziel (Ende Phase 5)
- ✅ 0 Domain → Presentation Dependencies
- ✅ 0 Domain → Infrastructure Dependencies
- ✅ 100% Interface-basierte Dependencies
- ✅ >80% Test Coverage für Domain Layer
- ✅ Klare Layer-Trennung

---

## 🌍 Environment Configuration

### Environment Files

**Verzeichnis:** `src/environments/`

- **`environment.ts`** - Default/fallback configuration
- **`environment.dev.ts`** - Development environment
- **`environment.prod.ts`** - Production environment

### Build Commands

#### Development
```bash
ng serve --configuration=development
ng serve --configuration=dev  # alias
ng build --configuration=development
```

#### Production
```bash
ng serve --configuration=production
ng build --configuration=production
ng build  # production is default
```

### Environment Properties

```typescript
export const environment = {
  production: boolean,
  baseUrl: string,

  // Feature flags
  enableDebugMode: boolean,
  enableMockData: boolean,
  enableConsoleLogging: boolean,
  enableAngularDevTools: boolean,

  // Configuration
  logLevel: 'debug' | 'info' | 'warn' | 'error',
  apiTimeout: number  // milliseconds
};
```

### Environment-Specific Values

| Property | Development | Production | Default |
|----------|-------------|------------|---------|
| `production` | `false` | `true` | `false` |
| `baseUrl` | `https://localhost:5001/api/v1/backend/` | `http://157.180.42.127:5000/api/v1/backend/` | localhost |
| `enableDebugMode` | `true` | `false` | `false` |
| `logLevel` | `'debug'` | `'error'` | `'info'` |
| `apiTimeout` | `30000` | `10000` | `15000` |
| `enableConsoleLogging` | `true` | `false` | `false` |
| `enableAngularDevTools` | `true` | `false` | `false` |

### Best Practices

1. ⚠️ **Never commit sensitive data** (API keys, passwords) to environment files
2. ✅ **Use feature flags** for conditional functionality
3. ✅ **Keep development timeouts longer** than production for debugging
4. ✅ **Disable debug features** in production for performance
5. ✅ **Use consistent naming** across all environment files

---

## 🧪 Test Status

### Aktueller Stand

```
✅ 1098 SUCCESS
❌ 0 FAILED
⏭️ 21 SKIPPED
```

### Test-Ausführung

```bash
# Alle Tests ausführen
export CHROME_BIN=/usr/bin/chromium-browser && npm test

# Tests mit Coverage
npm run test:coverage

# Einzelne Test-Suite
ng test --include='**/data-management-llm.service.spec.ts'
```

### Test-Setup

- **Framework:** Jasmine + Karma
- **Browser:** Chromium (WSL)
- **Reporter:** karma-html-reporter
- **Coverage:** Istanbul

### Test-Report

- **Location:** `test-results/html/test-report/index.html`
- **Öffnen:** `start test-results\html\test-report\index.html` (Windows)

---

## 🚀 Nächste Schritte

### Sofort (1-2 Wochen)

1. **Angular Signals Migration Phase 3**
   - DataManagementClientService
   - DataManagementAbsenceService
   - DataManagementContractService
   - WorkplaceStateService

2. **Clean Architecture Phase 2 abschließen**
   - 12 verbleibende Services refactorieren
   - EventBus Integration testen
   - Dokumentation aktualisieren

### Mittelfristig (2-4 Wochen)

1. **Repository Pattern (Phase 3)**
   - 10 Repository Interfaces definieren
   - Adapters implementieren
   - Domain Services refactorieren

2. **Test Coverage erhöhen**
   - Domain Service Unit Tests
   - Use Case Integration Tests
   - E2E Tests für kritische Workflows

### Langfristig (3-6 Monate)

1. **Layer Reorganization (Phase 4)**
   - Services in richtige Layer verschieben
   - Use Cases erstellen
   - View Models extrahieren

2. **Code Quality (Phase 5)**
   - Base Classes für CRUD Operations
   - Linting Rules verschärfen
   - Performance Monitoring

---

## 📚 Wichtige Dateien

### Core Interface Files
- `/src/app/domain/interfaces/manageable.interface.ts` - Core Interfaces
- `/src/app/domain/events/domain-events.ts` - Domain Events
- `/src/app/application/services/event-bus.service.ts` - Event Bus

### Pattern-Beispiele
- Signal → Getter: `/src/app/domain/services/data-management-shift.service.ts`
- Signals Migration: `/src/app/domain/services/llm/data-management-llm.service.ts`
- Event-basiert: `/src/app/domain/services/data-management-group.service.ts`

### Test-Beispiele
- Signal Tests: `/src/app/domain/services/llm/data-management-llm.service.spec.ts`
- Mock Patterns: `/src/app/presentation/aside/llm-chat/llm-chat.component.spec.ts`

---

## 📝 Lessons Learned

### Angular Signals

1. ✅ **toObservable() als Class Field** - Vermeidet Injection Context Errors
2. ✅ **Observable-Wrapper** - Ermöglichen nahtlose Migration ohne Breaking Changes
3. ✅ **State vs Events** - Signals für State, Subjects für Events
4. ✅ **Test-Mocks** - Signals als Spy-Funktionen mocken
5. ✅ **Async Tests** - Delays für Signal-Propagierung einbauen

### Clean Architecture

1. ✅ **Framework-agnostisch** - Interfaces ohne Angular-spezifische Typen
2. ✅ **Private Signal + Public Getter** - Beste Encapsulation
3. ✅ **EventBus Pattern** - Entkopplung zwischen Layern
4. ✅ **Schrittweise Migration** - Vermeidet Breaking Changes
5. ✅ **Tests first** - Nach jedem Refactoring-Schritt prüfen

---

## 🔗 Ressourcen

### Dokumentation
- [Angular Signals Guide](https://angular.io/guide/signals)
- [Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Ports & Adapters Pattern](https://alistair.cockburn.us/hexagonal-architecture/)

### Interne Dokumente
- Diese Datei: `PROJECT_STATUS.md`
- README: `README.md`
- CLAUDE Anweisungen: `/mnt/c/SourceCode/CLAUDE.md`

---

**Letztes Update:** 13.10.2025
**Nächste Review:** Nach Abschluss Phase 3 (Signals) oder Phase 2 (Clean Architecture)

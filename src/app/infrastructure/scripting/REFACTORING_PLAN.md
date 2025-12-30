# Frontend Scripting Refactoring Plan

## Analyse: Vergleich Backend vs Frontend

### Architektur-Unterschiede

| Aspekt | Backend (C#) | Frontend (TypeScript) |
|--------|--------------|----------------------|
| Struktur | 3 Klassen getrennt | Monolithisch |
| Kompilierung | `Code.cs` (nur compile) | `code.ts` (compile + execute) |
| Compiled Output | `CompiledScript.cs` (immutable) | Nicht vorhanden |
| Execution | `ScriptExecutionContext.cs` | In `code.ts` integriert |
| Value Types | `ScriptValue` struct | `any` überall |
| Rekursionsschutz | Max 1000, Exception | Nicht vorhanden |
| Cancellation | `CancellationToken` | Timeout-basiert |

### Bugs im Frontend (code.ts)

1. **Or-Operator** (Zeile 647-648):
   ```typescript
   case Opcodes.Or:
     this.scopes.push(Math.pow(...));  // FALSCH! Sollte | sein
   ```

2. **And-Operator** (Zeile 650-651):
   ```typescript
   case Opcodes.And:
     this.scopes.push(... + ...);  // FALSCH! Sollte & sein
   ```

3. **getTickCount()** (Zeile 774-776):
   ```typescript
   private getTickCount(): number {
     return new Date().getMilliseconds();  // FALSCH! Gibt nur 0-999 zurück
   }
   ```
   Sollte `Date.now()` oder `performance.now()` sein.

---

## Refactoring-Plan

### Phase 1: Bug-Fixes (Kritisch)

**Dateien:** `code.ts`

1. **Or-Operator korrigieren** (Zeile 647-648):
   ```typescript
   case Opcodes.Or:
     this.scopes.push(
       Math.trunc(this.extractDouble(accumulator)) |
       Math.trunc(this.extractDouble(register))
     );
   ```

2. **And-Operator korrigieren** (Zeile 650-651):
   ```typescript
   case Opcodes.And:
     this.scopes.push(
       Math.trunc(this.extractDouble(accumulator)) &
       Math.trunc(this.extractDouble(register))
     );
   ```

3. **getTickCount() korrigieren** (Zeile 774-776):
   ```typescript
   private getTickCount(): number {
     return Date.now();
   }
   ```

---

### Phase 2: ScriptValue einführen

**Neue Datei:** `script-value.ts`

```typescript
export enum ScriptValueType {
  Null = 0,
  Number = 1,
  Boolean = 2,
  String = 3,
  Object = 4
}

export class ScriptValue {
  private readonly _type: ScriptValueType;
  private readonly _numberValue: number;
  private readonly _objectValue: unknown;

  private constructor(type: ScriptValueType, numberValue: number, objectValue: unknown) {
    this._type = type;
    this._numberValue = numberValue;
    this._objectValue = objectValue;
  }

  static readonly Null = new ScriptValue(ScriptValueType.Null, 0, null);

  static fromNumber(value: number): ScriptValue {
    return new ScriptValue(ScriptValueType.Number, value, null);
  }

  static fromBoolean(value: boolean): ScriptValue {
    return new ScriptValue(ScriptValueType.Boolean, value ? 1 : 0, null);
  }

  static fromString(value: string | null): ScriptValue {
    return value === null
      ? ScriptValue.Null
      : new ScriptValue(ScriptValueType.String, 0, value);
  }

  static fromObject(value: unknown): ScriptValue {
    if (value === null || value === undefined) return ScriptValue.Null;
    if (value instanceof ScriptValue) return value;
    if (typeof value === 'number') return ScriptValue.fromNumber(value);
    if (typeof value === 'boolean') return ScriptValue.fromBoolean(value);
    if (typeof value === 'string') return ScriptValue.fromString(value);
    return new ScriptValue(ScriptValueType.Object, 0, value);
  }

  get type(): ScriptValueType { return this._type; }
  get isNull(): boolean { return this._type === ScriptValueType.Null; }

  asDouble(): number {
    switch (this._type) {
      case ScriptValueType.Number:
      case ScriptValueType.Boolean:
        return this._numberValue;
      case ScriptValueType.String:
        return parseFloat(this._objectValue as string) || 0;
      case ScriptValueType.Object:
        return Number(this._objectValue) || 0;
      default:
        return 0;
    }
  }

  asInt(): number { return Math.trunc(this.asDouble()); }

  asBoolean(): boolean {
    switch (this._type) {
      case ScriptValueType.Boolean:
      case ScriptValueType.Number:
        return this._numberValue !== 0;
      case ScriptValueType.String:
        return !!(this._objectValue as string);
      case ScriptValueType.Object:
        return this._objectValue !== null;
      default:
        return false;
    }
  }

  asString(): string {
    switch (this._type) {
      case ScriptValueType.String:
        return (this._objectValue as string) ?? '';
      case ScriptValueType.Number:
        return this._numberValue.toString();
      case ScriptValueType.Boolean:
        return this._numberValue !== 0 ? 'True' : 'False';
      case ScriptValueType.Object:
        return String(this._objectValue ?? '');
      default:
        return '';
    }
  }
}
```

**Änderungen in:**
- `identifier.ts`: `value: any` → `value: ScriptValue`
- `scope.ts`: Entry.value → ScriptValue
- `scopes.ts`: Alle push/pop verwenden ScriptValue

---

### Phase 3: Architektur-Trennung

**Schritt 1: CompiledScript erstellen**

**Neue Datei:** `compiled-script.ts`

```typescript
export interface ScriptError {
  code: number;
  description: string;
  line: number;
  column: number;
}

export class CompiledScript {
  private readonly _instructions: unknown[][];
  private readonly _externalSymbols: Map<string, Identifier>;
  private readonly _error: ScriptError | null;

  private constructor(
    instructions: unknown[][],
    externalSymbols: Map<string, Identifier>,
    error: ScriptError | null
  ) {
    this._instructions = instructions;
    this._externalSymbols = externalSymbols;
    this._error = error;
  }

  get instructions(): readonly unknown[][] { return this._instructions; }
  get externalSymbols(): ReadonlyMap<string, Identifier> { return this._externalSymbols; }
  get error(): ScriptError | null { return this._error; }
  get hasError(): boolean { return this._error !== null; }

  static compile(source: string, optionExplicit = true, allowExternal = true): CompiledScript {
    // Verwendet bestehende Parser-Logik
  }

  setExternalValue(name: string, value: unknown): void {
    // ...
  }
}
```

**Schritt 2: ScriptExecutionContext erstellen**

**Neue Datei:** `script-execution-context.ts`

```typescript
export interface ScriptResult {
  success: boolean;
  messages: ResultMessage[];
  error?: ScriptError;
}

export class ScriptExecutionContext {
  private static readonly MAX_RECURSION_DEPTH = 1000;

  private readonly script: CompiledScript;
  private scopes: Scopes | null = null;
  private pc = 0;
  private recursionDepth = 0;
  private running = false;

  constructor(script: CompiledScript) {
    this.script = script;
  }

  execute(abortSignal?: AbortSignal): ScriptResult {
    if (this.script.hasError) {
      return { success: false, messages: [], error: this.script.error! };
    }
    // Execution-Logik aus code.ts hierher verschieben
  }
}
```

**Schritt 3: code.ts bereinigen**

Nach der Trennung enthält `code.ts` nur noch:
- `Opcodes` enum (bleibt)
- `Results` Klasse (bleibt)
- Kompilierungs-Logik (`add`, `fixUp`, `clone`, `import*`)
- Keine `interpret()`-Methode mehr

---

### Phase 4: Rekursionsschutz

**In ScriptExecutionContext:**

```typescript
case Opcodes.Call:
  if (++this.recursionDepth > ScriptExecutionContext.MAX_RECURSION_DEPTH) {
    this.running = false;
    throw new ScriptTooComplexError(
      `Maximum recursion depth (${ScriptExecutionContext.MAX_RECURSION_DEPTH}) exceeded`
    );
  }
  // ...
  break;

case Opcodes.Return:
  this.recursionDepth--;
  // ...
  break;
```

**Neue Exception:**

```typescript
export class ScriptTooComplexError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScriptTooComplexError';
  }
}
```

---

### Phase 5: AbortSignal statt Timeout

**In ScriptExecutionContext:**

```typescript
execute(abortSignal?: AbortSignal): ScriptResult {
  // ...
  while (this.pc < instructions.length && this.running) {
    // ...

    if (abortSignal?.aborted) {
      this.running = false;
      return {
        success: false,
        messages: this.messages,
        error: { code: -1, description: 'Execution cancelled', line: 0, column: 0 }
      };
    }
  }
}
```

**Verwendung in script.service.ts:**

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 60000);
const result = context.execute(controller.signal);
```

---

## Datei-Struktur nach Refactoring

```
src/app/infrastructure/scripting/
├── code.ts                      # Nur Kompilierung (wie BE Code.cs)
├── compiled-script.ts           # NEU: Immutables kompiliertes Skript
├── script-execution-context.ts  # NEU: Ausführung mit State
├── script-value.ts              # NEU: Typisierte Werte
├── script-result.ts             # NEU: Ergebnis-Typen
├── script-too-complex.error.ts  # NEU: Exception
├── identifier.ts                # Angepasst für ScriptValue
├── scope.ts                     # Angepasst für ScriptValue
├── scopes.ts                    # Angepasst für ScriptValue
├── interpreterError.ts          # Unverändert
├── stringInput.ts               # Unverändert
├── syntaxAnalyser.ts            # Unverändert
└── script.service.ts            # Angepasst für neue API
```

---

## Umsetzungs-Reihenfolge

| Schritt | Beschreibung | Priorität |
|---------|--------------|-----------|
| 1 | Bug-Fixes (Or, And, getTickCount) | **Kritisch** |
| 2 | ScriptValue.ts erstellen | Hoch |
| 3 | Identifier/Scope/Scopes anpassen für ScriptValue | Hoch |
| 4 | CompiledScript.ts erstellen | Mittel |
| 5 | ScriptExecutionContext.ts erstellen | Mittel |
| 6 | code.ts bereinigen (nur compile) | Mittel |
| 7 | Rekursionsschutz hinzufügen | Mittel |
| 8 | AbortSignal implementieren | Niedrig |
| 9 | script.service.ts anpassen | Niedrig |
| 10 | Tests schreiben | Hoch |

---

## Breaking Changes

Die Refactoring-Schritte 2-6 sind **Breaking Changes**:
- `Code.interpret()` wird entfernt
- `Code.result()` wird entfernt
- Neue API: `CompiledScript.compile()` + `ScriptExecutionContext.execute()`

**Migration in script.service.ts:**

```typescript
// Alt:
const code = new Code(error, stream);
code.compile(source);
code.interpret();
return code.result();

// Neu:
const script = CompiledScript.compile(source);
const context = new ScriptExecutionContext(script);
return context.execute();
```

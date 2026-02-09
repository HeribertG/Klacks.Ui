# Scripting Macro Engine

## Übersicht

Die Scripting Macro Engine ist ein vollständiger BASIC-ähnlicher Interpreter, der in TypeScript implementiert wurde. Sie ermöglicht die Ausführung von Makro-Skripten zur Laufzeit in der Angular-Anwendung.

**Pfad:** `src/app/infrastructure/scripting/`

## Architektur

```
ScriptService (Angular Injectable Service)
        |
        +--- Lexer (Tokenizer)
        |        |
        |        +--- StringInputStream
        |
        +--- Parser (Compiler)
        |        |
        |        +--- SyntaxAnalyser (Hierarchy)
        |
        +--- Executor (Interpreter)
                 |
                 +--- Code (Bytecode)
```

## Parser-Hierarchie

```
SyntaxAnalyserBase
       |
       v
SyntaxAnalyserBuiltIns        (MsgBox, InputBox, Message)
       |
       v
SyntaxAnalyserExpressions     (Ausdrücke, Bedingungen, Terme)
       |
       v
SyntaxAnalyserDeclarations    (CONST, DIM, FUNCTION, SUB)
       |
       v
SyntaxAnalyserControlFlow     (IF, FOR, DO)
       |
       v
SyntaxAnalyserStatements      (Zuweisungen, Aufrufe)
       |
       v
SyntaxAnalyser                (Hauptklasse mit parse())
```

## ScriptService Verwendung

```typescript
const service = inject(ScriptService);

// Kompilieren
if (service.compile('debugprint 10 + 5')) {
  // Ausführen
  if (service.run()) {
    // Ergebnis lesen
    const results = service.debugResult();
  }
}
```

## Unterstützte Token-Typen

| Kategorie | Tokens |
|-----------|--------|
| Operatoren | `+`, `-`, `*`, `/`, `\`, `%`, `^`, `!` |
| Zuweisungen | `+=`, `-=`, `*=`, `/=`, `&=`, `\=`, `%=` |
| Vergleiche | `=`, `<>`, `<`, `<=`, `>`, `>=` |
| Logik | `AND`, `OR`, `NOT` |
| Literale | Zahlen, Strings (`"..."`), `TRUE`, `FALSE`, `PI` |

## Opcodes

| Kategorie | Opcodes |
|-----------|---------|
| Speicher | `AllocConst`, `AllocVar`, `PushValue`, `PushVariable`, `Pop`, `Assign` |
| Arithmetik | `Add`, `Sub`, `Multiplication`, `Division`, `Div`, `Mod`, `Power` |
| Vergleich | `Eq`, `NotEq`, `Lt`, `LEq`, `Gt`, `GEq` |
| Logik | `Or`, `And`, `Not`, `Negate` |
| Kontrolle | `Jump`, `JumpTrue`, `JumpFalse`, `Call`, `Return` |
| Scopes | `PushScope`, `PopScope` |
| I/O | `Msgbox`, `Inputbox`, `Message`, `DebugPrint` |

## Sprachsyntax

### Variablen und Konstanten

**WICHTIG:** `DIM` kann Variablen nur deklarieren, NICHT gleichzeitig initialisieren (wie in VB vor Version 6 / VBA). `DIM x = 10` ist ein Syntaxfehler!

```basic
' Variablendeklaration (nur Deklaration, keine Initialisierung!)
DIM x
DIM a, b, c

' Konstantendeklaration (CONST darf mit Wert!)
CONST PI_VALUE = 3.14159
CONST GREETING = "Hallo"

' Zuweisung (separat nach DIM)
x = 10
x += 5      ' x = x + 5
x -= 3      ' x = x - 3
x *= 2      ' x = x * 2
x /= 4      ' x = x / 4
x &= " cm"  ' String-Konkatenation
```

### Operatoren

```basic
' Arithmetik
result = 10 + 5       ' Addition
result = 10 - 5       ' Subtraktion
result = 10 * 5       ' Multiplikation
result = 10 / 3       ' Division (Fließkomma): 3.333...
result = 10 \ 3       ' Ganzzahldivision: 3
result = 10 MOD 3     ' Modulo: 1
result = 2 ^ 10       ' Potenz: 1024
result = 5!           ' Fakultät: 120

' String
text = "Hello" & " " & "World"

' Vergleich
IF a = b THEN ...
IF a <> b THEN ...
IF a < b THEN ...
IF a <= b THEN ...
IF a > b THEN ...
IF a >= b THEN ...

' Logik
IF a AND b THEN ...
IF a OR b THEN ...
IF NOT a THEN ...
```

### Kontrollstrukturen

```basic
' IF-Statement (einzeilig)
IF x > 10 THEN debugprint "groß"

' IF-Statement (mehrzeilig)
IF x > 10 THEN
    debugprint "groß"
ELSE
    debugprint "klein"
END IF

' FOR-Schleife
FOR i = 1 TO 10
    debugprint i
NEXT

' FOR mit STEP
FOR i = 10 TO 1 STEP -1
    debugprint i
NEXT

' DO-WHILE (Bedingung am Anfang)
DO WHILE x < 10
    x = x + 1
LOOP

' DO-UNTIL (Bedingung am Ende)
DO
    x = x + 1
LOOP UNTIL x >= 10

' EXIT-Statements
FOR i = 1 TO 100
    IF i > 50 THEN EXIT FOR
NEXT

DO WHILE TRUE
    IF condition THEN EXIT DO
LOOP
```

### Funktionen und Subroutinen

```basic
' Funktion (gibt Wert zurück)
FUNCTION Add(a, b)
    Add = a + b
END FUNCTION

' Aufruf
result = Add(5, 3)

' Subroutine (kein Rückgabewert)
SUB PrintMessage(msg)
    debugprint msg
END SUB

' Aufruf
PrintMessage("Hello")
```

### Eingebaute Funktionen

```basic
' Trigonometrie
result = SIN(angle)
result = COS(angle)
result = TAN(angle)
result = ATAN(value)

' IIF (Inline-IF)
result = IIF(condition, trueValue, falseValue)

' Konstanten
debugprint PI        ' 3.141592654
debugprint VBCRLF    ' Carriage Return + Line Feed
debugprint VBTAB     ' Tab
debugprint TRUE      ' Boolean True
debugprint FALSE     ' Boolean False
```

### I/O-Befehle

```basic
' Debug-Ausgabe (immer verfügbar)
DEBUGPRINT "Nachricht"
DEBUGCLEAR
DEBUGSHOW
DEBUGHIDE

' Message (Ergebnisausgabe mit Typ)
MESSAGE 1, "Erfolg"
MESSAGE 2, "Warnung"

' UI-Dialoge (nur wenn allowUI = true)
MSGBOX("Nachricht")
result = INPUTBOX("Frage", "Standardantwort")
```

## Externe Variablen

```typescript
// In Angular-Code
service.code.importAdd('kundenName', 'Max Mustermann');
service.code.importAdd('betrag', 100.50);
```

```basic
' Im Skript
IMPORT kundenName
IMPORT betrag

debugprint kundenName & ": " & betrag & " EUR"
```

### Macro-spezifische Import-Variablen

| Variable | Beschreibung |
|----------|-------------|
| hour | Arbeitsstunden |
| fromhour/untilhour | Start-/Endzeit als Dezimalstunden |
| weekday | Wochentag ISO-8601 (1=Mo..7=So) |
| holiday/holidaynextday | Feiertag boolean |
| nightrate | Nachtzuschlag-Satz |
| holidayrate | Feiertagszuschlag-Satz |
| sarate | **Sa**mstags-Zuschlag (sa = Samstag/Saturday) |
| sorate | **So**nntags-Zuschlag (so = Sonntag/Sunday) |
| guaranteedhours | Garantierte Monatsstunden |
| fulltime | Vollzeit-Stunden |

```basic
' Beispiel im Skript
IMPORT weekday, sarate, sorate
```

## Fehlerbehandlung

```typescript
if (!service.compile(source)) {
  const error = service.interpreterError;
  console.error(`Fehler ${error.number}: ${error.description}`);
  console.error(`Zeile ${error.line}, Spalte ${error.col}`);
}

if (!service.run()) {
  const error = service.interpreterError;
  console.error(`Laufzeitfehler: ${error.description}`);
}
```

**Fehlertypen:**
| Kategorie | Beschreibung |
|-----------|--------------|
| `lexErrors` | Lexikalische Fehler (unbekannte Zeichen, nicht geschlossene Strings) |
| `parsErrors` | Syntaxfehler (fehlende Klammern, unerwartete Tokens) |
| `runErrors` | Laufzeitfehler (unbekannte Variablen, Mathematik-Fehler) |

## Konfiguration

| Option | Beschreibung | Standard |
|--------|--------------|----------|
| `optionExplicit` | Variablen müssen mit DIM deklariert werden | `true` |
| `allowExternal` | IMPORT-Statement erlaubt | `true` |
| `allowUI` | MsgBox/InputBox erlaubt | `false` |
| `timeout` | Timeout in Millisekunden | `60000` |

## Dateistruktur

```
src/app/infrastructure/scripting/
+-- script.service.ts              # Haupt-Service
+-- script.service.spec.ts         # Unit-Tests
+-- lexicalAnalyser.ts             # Tokenizer
+-- stringInput.ts                 # Eingabe-Stream
+-- symbol.ts                      # Token-Definitionen
+-- syntaxAnalyser.ts              # Parser (Hauptklasse)
+-- syntaxAnalyserBase.ts          # Basis-Klasse
+-- syntaxAnalyserBuiltIns.ts      # Built-in Funktionen
+-- syntaxAnalyserExpressions.ts   # Ausdruck-Parsing
+-- syntaxAnalyserDeclarations.ts  # Deklarationen
+-- syntaxAnalyserControlFlow.ts   # Kontrollstrukturen
+-- syntaxAnalyserStatements.ts    # Statements
+-- code.ts                        # Bytecode & Executor
+-- identifier.ts                  # Identifier-Typen
+-- scope.ts                       # Einzelner Scope
+-- scopes.ts                      # Scope-Stack
+-- interpreterError.ts            # Fehlerbehandlung
```

## Beispiele

### Rekursive Funktion

```basic
FUNCTION Fibonacci(n)
    IF n <= 1 THEN
        Fibonacci = n
    ELSE
        Fibonacci = Fibonacci(n - 1) + Fibonacci(n - 2)
    END IF
END FUNCTION

debugprint "Fib(10) = " & Fibonacci(10)
```

### Primzahl-Prüfung

```basic
FUNCTION IstPrimzahl(n)
    DIM i
    IF n < 2 THEN
        IstPrimzahl = FALSE
        EXIT FUNCTION
    END IF
    FOR i = 2 TO n - 1
        IF n MOD i = 0 THEN
            IstPrimzahl = FALSE
            EXIT FUNCTION
        END IF
    NEXT
    IstPrimzahl = TRUE
END FUNCTION

DIM num
FOR num = 2 TO 20
    IF IstPrimzahl(num) THEN
        debugprint num & " ist Primzahl"
    END IF
NEXT
```

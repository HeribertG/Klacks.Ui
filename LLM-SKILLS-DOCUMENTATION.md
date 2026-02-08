# LLM Chat & Skills System - Dokumentation

## Inhaltsverzeichnis

1. [Architektur-Uebersicht](#architektur-uebersicht)
2. [Datenfluss](#datenfluss)
3. [Backend-Konzepte](#backend-konzepte)
4. [Frontend-Konzepte](#frontend-konzepte)
5. [Initialisierungs-Flow](#initialisierungs-flow)
6. [Neue Backend-Skills erstellen](#neue-backend-skills-erstellen)
7. [Neue Frontend UI-Aktionen erstellen](#neue-frontend-ui-aktionen-erstellen)
8. [Beispiel: Settings General](#beispiel-settings-general)
9. [E2E-Test Strategie](#e2e-test-strategie)

---

## Architektur-Uebersicht

Das LLM Chat & Skills System besteht aus drei Hauptschichten:

```
+---------------------------+
|    Frontend (Angular)     |
|  LLM Chat Component      |
|  Function Registry        |
|  Function Execution       |
+---------------------------+
           |  HTTP
+---------------------------+
|    Backend (ASP.NET)      |
|  LLMFunctionExecutor      |
|  LLMSkillBridge           |
|  SkillRegistry            |
|  LLMSystemPromptBuilder   |
+---------------------------+
           |  API
+---------------------------+
|    LLM Provider           |
|  (OpenAI, Anthropic, ...) |
+---------------------------+
```

### Drei Funktionstypen

| Typ | Wo definiert | Wo ausgefuehrt | Beispiel |
|-----|-------------|----------------|----------|
| **BuiltInFunctions** | Backend `LLMFunctionExecutor` | Backend (MCP oder Fallback) | `create_client`, `search_clients`, `get_system_info` |
| **FrontendOnlyFunctions** | Backend `LLMFunctionExecutor` + Frontend | Backend-Skill + Frontend-UI-Aktion | `get_general_settings`, `update_general_settings` |
| **Frontend UI-Aktionen** | Frontend `LLMFunctionRegistryService` | Nur Frontend | `navigateToPage`, `searchAndNavigate`, `fillForm` |

---

## Datenfluss

### Kompletter Ablauf einer User-Nachricht

```
1. User tippt Nachricht im Chat
         |
2. LLMChatComponent.sendMessage()
         |
3. DataManagementLLMService.sendMessage(text, conversationId)
         |  HTTP POST -> Backend
4. Backend baut LLMContext auf:
   - UserId, UserRights
   - AvailableFunctions (aus SkillRegistry + BuiltIns)
         |
5. LLMSystemPromptBuilder.BuildSystemPrompt(context)
   - Sprachabhaengig (de/en/fr/it)
   - Berechtigungshinweise
   - Liste aller verfuegbaren Funktionen
         |
6. Anfrage an LLM Provider (z.B. OpenAI, Anthropic)
         |
7. LLM antwortet mit:
   a) Nur Text -> direkt zurueck an Frontend
   b) Text + FunctionCalls -> weiter zu Schritt 8
         |
8. LLMFunctionExecutor.ProcessFunctionCallsAsync()
   - FrontendOnlyFunction? -> ExecuteSkillAsync() -> Ergebnis zurueck
   - BuiltInFunction? -> MCP-Service oder lokaler Handler
   - Sonstiges? -> ExecuteSkillAsync() via LLMSkillBridge
         |
9. Ergebnisse zurueck an LLM fuer finale Antwort
         |
10. Response zurueck an Frontend mit:
    - message (Antworttext)
    - functionCalls (optional, fuer Frontend-Ausfuehrung)
    - suggestions, navigateTo
         |
11. LLMChatComponent.executeFunctionCalls()
    - Iteriert ueber alle functionCalls
    - LLMFunctionExecutionService.executeFunction(call)
    - UI-Aktionen (Navigation, Formular, etc.)
         |
12. Chat-Nachricht wird aktualisiert
```

### Sequenzdiagramm (vereinfacht)

```
User -> ChatComponent -> LLMService -> Backend -> LLM Provider
                                          |
                                   FunctionExecutor
                                    /     |      \
                              BuiltIn  Frontend  SkillBridge
                                Only              -> SkillRegistry
                                                  -> Skill.ExecuteAsync()
```

---

## Backend-Konzepte

### LLMFunctionExecutor

**Datei:** `Klacks.Api/Domain/Services/LLM/LLMFunctionExecutor.cs`

Zentrale Klasse fuer die Ausfuehrung von Function Calls. Unterscheidet drei Kategorien:

```csharp
private static readonly HashSet<string> BuiltInFunctions = new()
{
    "create_client", "search_clients", "create_contract", "get_system_info"
};

private static readonly HashSet<string> FrontendOnlyFunctions = new()
{
    "get_general_settings", "update_general_settings"
};
```

**Ausfuehrungslogik in `ExecuteFunctionAsync`:**
1. Ist es eine `FrontendOnlyFunction`? -> `ExecuteSkillAsync()` ausfuehren, nur erste Zeile zurueckgeben (Daten gehen zusaetzlich ans Frontend)
2. Ist es eine `BuiltInFunction`? -> Zuerst MCP-Service versuchen, dann lokaler Fallback-Handler
3. Alles andere -> `ExecuteSkillAsync()` via `ILLMSkillBridge`

### LLMSkillBridge

**Datei:** `Klacks.Api/Domain/Services/Skills/LLMSkillBridge.cs`

Bruecke zwischen LLM-Welt und Skill-System:
- `GetSkillsAsLLMFunctions()` - Konvertiert Skills in LLM-Function-Definitionen
- `ExecuteSkillFromLLMCallAsync()` - Fuehrt einen Skill ueber den `ISkillExecutor` aus
- `GetSkillsForProvider()` - Exportiert Skills im providersspezifischen Format (OpenAI, Anthropic, etc.)

### SkillRegistry

**Datei:** `Klacks.Api/Domain/Services/Skills/SkillRegistry.cs`

Verwaltet alle registrierten Skills:
- `Register(ISkill)` - Einzelnen Skill registrieren
- `RegisterFromAssembly(Assembly)` - Alle Skills aus einem Assembly automatisch finden und registrieren
- `GetSkillsForUser(permissions)` - Skills gefiltert nach Benutzerberechtigungen
- `ExportAsProviderFormat()` - Cache-basierter Export fuer LLM Provider

Skills werden per Reflection aus dem Assembly geladen. Der Cache hat eine Sliding Expiration von 5 Minuten und eine Absolute Expiration von 30 Minuten.

### ISkill Interface

**Datei:** `Klacks.Api/Domain/Interfaces/Skills/ISkill.cs`

```csharp
public interface ISkill
{
    string Name { get; }
    string Description { get; }
    SkillCategory Category { get; }
    IReadOnlyList<SkillParameter> Parameters { get; }
    IReadOnlyList<string> RequiredPermissions { get; }
    IReadOnlyList<LLMCapability> RequiredCapabilities { get; }

    Task<SkillResult> ExecuteAsync(
        SkillExecutionContext context,
        Dictionary<string, object> parameters,
        CancellationToken cancellationToken = default);
}
```

### SkillCategory Enum

```csharp
public enum SkillCategory
{
    Crud,       // Erstellen, Lesen, Aktualisieren, Loeschen
    Query,      // Nur-Lesen Abfragen
    Action,     // Aktionen ausfuehren
    UI,         // UI-bezogene Aktionen
    System,     // Systemfunktionen
    Validation  // Validierungen
}
```

### SkillParameter Record

```csharp
public record SkillParameter(
    string Name,
    string Description,
    SkillParameterType Type,
    bool Required,
    object? DefaultValue = null,
    IReadOnlyList<string>? EnumValues = null,
    string? JsonSchema = null
);
```

### BaseSkill Abstrakte Klasse

**Datei:** `Klacks.Api/Domain/Services/Skills/Implementations/BaseSkill.cs`

Basisklasse fuer alle Skills mit Hilfsmethoden:
- `GetParameter<T>()` - Typsicherer Parameterzugriff mit Konvertierung
- `GetRequiredString()` - Pflichtparameter als String
- `GetRequiredInt()` - Pflichtparameter als Integer
- `GetRequiredGuid()` - Pflichtparameter als GUID

### LLMSystemPromptBuilder

**Datei:** `Klacks.Api/Domain/Services/LLM/LLMSystemPromptBuilder.cs`

Baut den System-Prompt sprachabhaengig auf (de/en/fr/it). Enthaelt:
- Benutzer-Kontext (UserId, Berechtigungen)
- Berechtigungshinweise (z.B. "Benutzer hat KEINE Berechtigung fuer Einstellungen")
- Liste aller verfuegbaren Funktionen mit Beschreibungen
- Verhaltensrichtlinien fuer den LLM-Assistenten

---

## Frontend-Konzepte

### LLMFunctionRegistryService

**Datei:** `Klacks.Ui/src/app/domain/services/llm/llm-function-registry.service.ts`

Registriert alle verfuegbaren Frontend-Funktionen mit ihren Definitionen. Kategorien:

| Kategorie | Funktionen |
|-----------|-----------|
| `navigation` | `navigateToPage`, `navigateToEntity`, `openDialog`, `searchAndNavigate` |
| `form` | `fillForm`, `submitForm` |
| `data` | `searchData`, `getData`, `createEntity`, `updateEntity` |
| `system` | `getCurrentUser`, `getUserPermissions` |
| `backend` | `create_client`, `search_clients`, `create_contract`, `get_system_info`, `navigate_to_page` |
| `ui` | `get_general_settings`, `update_general_settings` |

Jede Funktion wird mit `ILLMFunctionDefinition` registriert:
- `name` - Eindeutiger Funktionsname
- `description` - Beschreibung fuer den LLM
- `parameters` - Liste der Parameter mit Name, Typ, Beschreibung, required, enum
- `category` - Funktionskategorie

Wichtige Methoden:
- `registerFunction(definition)` - Funktion registrieren
- `validateFunctionCall(call)` - Validiert Parameter (Typ, Required, Enum)
- `convertToToolDefinitions()` - Konvertiert zu OpenAI-kompatiblem Tool-Format

### LLMFunctionExecutionService

**Datei:** `Klacks.Ui/src/app/domain/services/llm/llm-function-execution.service.ts`

Fuehrt Frontend-Funktionen aus. Die `executeFunction()`-Methode routet per `switch` zum passenden Handler:

**Navigation:**
- `navigateToPage` - Angular Router Navigation zu einer Route
- `navigateToEntity` - Navigation zu einer Entitaet (client, group, shift) per ID
- `navigateToPageLegacy` / `navigate_to_page` - Legacy-Navigation per Seitenname
- `searchAndNavigate` - Suche + Navigation + globale Suche setzen

**Formulare:**
- `fillForm` - DOM-Manipulation: Felder per ID suchen und Werte setzen
- `submitForm` - Submit-Event auf Formular ausloesen

**Daten:**
- `searchData` - HTTP-Suche nach clients/shifts/groups
- `getData` - Einzelne Entitaet per ID laden
- `createEntity` - Neue Entitaet erstellen (HTTP POST)
- `updateEntity` - Entitaet aktualisieren (HTTP PUT)

**System:**
- `getCurrentUser` - Benutzerinfo aus JWT-Token
- `getUserPermissions` - Berechtigungen aus JWT-Token

**UI-Aktionen (Settings):**
- `get_general_settings` / `settings_general_read` - Settings oeffnen, App-Namen lesen
- `update_general_settings` / `settings_general_update` - Settings oeffnen, App-Namen aendern

**Client-Erstellung:**
- `create_client` - Kompletter UI-Flow: Client erstellen, Felder setzen, Vertrag/Gruppe zuweisen, speichern

Hilfsmethoden:
- `waitForElement(id, maxWaitMs)` - Wartet bis ein DOM-Element sichtbar ist (Polling alle 200ms)
- `ensureServicesInitialized()` - Stellt sicher, dass Contract- und Group-Services geladen sind

### LLMChatComponent

**Datei:** `Klacks.Ui/src/app/presentation/aside/llm-chat/llm-chat.component.ts`

Angular Standalone-Component fuer den Chat. Hauptbestandteile:

**Services:**
- `DataManagementLLMService` - LLM API-Kommunikation, Model-Verwaltung
- `DataManagementLLMProviderService` - Provider-Verwaltung (API Keys)
- `LLMFunctionExecutionService` - Frontend Function Execution
- `SpeechRecognitionService` - Spracheingabe (Web Speech API + Whisper Fallback)

**UI-Elemente (Template):**
- Initialisierungs-Spinner (`isInitializing()`)
- API-Key-Warnung (`hasNoApiKey()`)
- Model-Dropdown (Provider + Kosten)
- Nachrichten-Bereich mit User/Assistant-Avataren
- Eingabebereich mit Spracheingabe + Textfeld + Senden-Button
- Typing-Indicator waehrend der Verarbeitung

**Nachrichtenformat (`ChatMessage`):**
```typescript
interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  navigateTo?: string;
  actionPerformed?: boolean;
}
```

---

## Initialisierungs-Flow

Der Chat zeigt einen Loading-Spinner bis beide Bedingungen erfuellt sind:

```typescript
isInitializing(): boolean {
  return !this.llmService.modelsInitialized()
      || !this.llmProviderService.providersInitialized();
}
```

### Ablauf

1. `ngOnInit()` wird aufgerufen
2. `llmProviderService.loadProviders()` - Laedt Provider-Konfigurationen (API Keys)
3. `llmService.getAvailableModels()` - Laedt verfuegbare Modelle
4. `llmService.getCurrentModelId()` - Laedt aktuell ausgewaehltes Modell
5. Sobald `modelsInitialized` und `providersInitialized` Signals `true` sind, verschwindet der Spinner
6. Danach wird geprueft ob ein API Key vorhanden ist (`hasNoApiKey()`)

### hasNoApiKey() Logik

Gibt `true` zurueck wenn:
- Keine aktivierten Modelle vorhanden
- Kein Modell ausgewaehlt
- Ausgewaehltes Modell nicht in der Liste
- Kein Provider fuer das Modell gefunden
- Provider hat keinen API Key

---

## Neue Backend-Skills erstellen

### Schritt-fuer-Schritt Anleitung

**1. Skill-Klasse erstellen:**

Neue Datei unter `Klacks.Api/Application/Skills/` anlegen:

```csharp
using Klacks.Api.Domain.Enums;
using Klacks.Api.Domain.Models.Skills;
using Klacks.Api.Domain.Services.Skills.Implementations;

namespace Klacks.Api.Application.Skills;

public class MeinNeuerSkill : BaseSkill
{
    public override string Name => "mein_neuer_skill";

    public override string Description =>
        "Beschreibung was der Skill macht (fuer den LLM).";

    public override SkillCategory Category => SkillCategory.Query;

    public override IReadOnlyList<string> RequiredPermissions =>
        new[] { "CanViewClients" };

    public override IReadOnlyList<SkillParameter> Parameters => new[]
    {
        new SkillParameter(
            "paramName",
            "Beschreibung des Parameters",
            SkillParameterType.String,
            Required: true)
    };

    // Dependencies per Constructor Injection
    public MeinNeuerSkill(IMyRepository repository)
    {
        _repository = repository;
    }

    public override async Task<SkillResult> ExecuteAsync(
        SkillExecutionContext context,
        Dictionary<string, object> parameters,
        CancellationToken cancellationToken = default)
    {
        var paramValue = GetRequiredString(parameters, "paramName");

        // Logik hier...

        return SkillResult.SuccessResult(
            new { /* Ergebnis-Daten */ },
            "Erfolgreiche Ausfuehrung.");
    }
}
```

**2. Automatische Registrierung:**

Skills werden automatisch per `RegisterFromAssembly()` registriert. Sobald die Klasse `ISkill` implementiert (via `BaseSkill`), wird sie beim Startup erkannt.

**3. Berechtigungen definieren:**

`RequiredPermissions` bestimmt, welche Benutzer den Skill sehen und ausfuehren koennen. Ein leeres Array bedeutet: alle Benutzer haben Zugriff.

**4. Falls FrontendOnly:**

Wenn der Skill zusaetzlich eine Frontend-UI-Aktion ausloesen soll:
- Skill-Name in `FrontendOnlyFunctions` HashSet im `LLMFunctionExecutor` eintragen
- Entsprechende Frontend-Aktion implementieren (siehe naechstes Kapitel)

### Checkliste neuer Skill

- [ ] Klasse erstellt unter `Application/Skills/`
- [ ] Erbt von `BaseSkill`
- [ ] `Name`, `Description`, `Category`, `Parameters`, `RequiredPermissions` definiert
- [ ] `ExecuteAsync()` implementiert
- [ ] Dependencies per Constructor Injection
- [ ] Bei FrontendOnly: Name in `FrontendOnlyFunctions` eingetragen
- [ ] Beschreibung ist praezise (der LLM nutzt sie zur Entscheidung)

---

## Neue Frontend UI-Aktionen erstellen

### Schritt-fuer-Schritt Anleitung

**1. Funktion in der Registry registrieren:**

In `llm-function-registry.service.ts` unter `registerBuiltInFunctions()`:

```typescript
this.registerFunction({
  name: 'meine_neue_aktion',
  description: 'Was die Aktion macht (fuer den LLM)',
  parameters: [
    {
      name: 'param1',
      type: 'string',
      description: 'Beschreibung',
      required: true,
    },
  ],
  category: 'ui',
});
```

**2. Handler im ExecutionService implementieren:**

In `llm-function-execution.service.ts`:

a) Case im `switch` von `executeFunction()` hinzufuegen:

```typescript
case 'meine_neue_aktion':
  return this.executeMeineNeueAktion(functionCall);
```

b) Handler-Methode implementieren:

```typescript
private executeMeineNeueAktion(
  call: ILLMFunctionCall
): Observable<ILLMFunctionResult> {
  const { param1 } = call.arguments;

  // UI-Logik hier...

  return of({
    id: call.id,
    success: true,
    result: { message: 'Aktion erfolgreich' },
  });
}
```

**3. Bei asynchronen DOM-Aktionen:**

Wenn auf DOM-Elemente gewartet werden muss (z.B. nach Navigation):

```typescript
private executeMeineAktion(
  call: ILLMFunctionCall
): Observable<ILLMFunctionResult> {
  return from(this.doMeineAktion(call));
}

private async doMeineAktion(
  call: ILLMFunctionCall
): Promise<ILLMFunctionResult> {
  // Navigation oder Click ausloesen
  document.getElementById('open-something')?.click();

  // Auf Element warten (max 3 Sekunden)
  const element = await this.waitForElement('my-element-id');
  if (!element) {
    return { id: call.id, success: false, error: 'Element not found' };
  }

  // DOM manipulieren...

  return {
    id: call.id,
    success: true,
    result: { message: 'Erfolgreich' },
  };
}
```

### Checkliste neue UI-Aktion

- [ ] Funktion in `LLMFunctionRegistryService` registriert
- [ ] Case in `LLMFunctionExecutionService.executeFunction()` hinzugefuegt
- [ ] Handler-Methode implementiert
- [ ] Bei async DOM-Operationen: `waitForElement()` nutzen
- [ ] Fehlerbehandlung mit `success: false` und `error`-Message
- [ ] Falls Backend-Skill benoetigt: Skill-Name in `FrontendOnlyFunctions` eintragen

---

## Beispiel: Settings General

Dieses Beispiel zeigt den kompletten Datenfluss fuer "App-Name aendern".

### User sagt: "Aendere den App-Namen zu MeinApp"

**1. Backend-Verarbeitung:**

Der LLM erkennt die Absicht und generiert einen Function Call:
```json
{
  "functionName": "update_general_settings",
  "parameters": { "appName": "MeinApp" }
}
```

**2. LLMFunctionExecutor (Backend):**

`update_general_settings` ist in `FrontendOnlyFunctions` -> `ExecuteSkillAsync()` wird aufgerufen:

```csharp
if (FrontendOnlyFunctions.Contains(call.FunctionName))
{
    var skillResult = await ExecuteSkillAsync(context, call);
    var firstLine = skillResult.Split('\n')[0];
    return firstLine;
}
```

**3. UpdateGeneralSettingsSkill (Backend):**

- Liest aktuellen App-Namen aus der Datenbank
- Aktualisiert den Wert in der Datenbank
- Gibt Ergebnis zurueck: `"Application name updated from 'AlterName' to 'MeinApp'."`

**4. Backend-Antwort an Frontend:**

Die Antwort enthaelt sowohl die LLM-Textnachricht als auch den Function Call fuer das Frontend.

**5. Frontend executeFunctionCalls():**

In `LLMChatComponent.executeFunctionCalls()` wird der Function Call an `LLMFunctionExecutionService` weitergeleitet.

**6. executeSettingsGeneralUpdate (Frontend):**

```
a) document.getElementById('open-settings')?.click()
   -> Oeffnet die Settings-Seite

b) waitForElement('setting-general-name')
   -> Wartet bis das Input-Feld sichtbar ist (max 3s)

c) Liest vorherigen Wert aus dem Input

d) Setzt neuen Wert per nativeInputValueSetter
   (umgeht Angular Change Detection)

e) Dispatcht 'input' Event fuer Angular Reactive Forms

f) Gibt Ergebnis zurueck:
   { previousName: "AlterName", newName: "MeinApp", message: "..." }
```

### Warum FrontendOnly?

`get_general_settings` und `update_general_settings` sind FrontendOnly-Funktionen, weil:
1. **Backend-Skill:** Liest/schreibt den Wert in der Datenbank (persistente Aenderung)
2. **Frontend-Aktion:** Navigiert zur Settings-Seite und aktualisiert das Formular visuell

Beide Seiten werden ausgefuehrt: Der Backend-Skill aendert die Datenbank, die Frontend-Aktion aktualisiert die UI.

### Beteiligte Dateien

| Datei | Rolle |
|-------|-------|
| `GetGeneralSettingsSkill.cs` | Backend: Liest App-Name aus DB, braucht `CanViewSettings` |
| `UpdateGeneralSettingsSkill.cs` | Backend: Schreibt App-Name in DB, braucht `CanEditSettings` |
| `LLMFunctionExecutor.cs` | Routing: Erkennt als FrontendOnly, fuehrt Skill aus |
| `llm-function-registry.service.ts` | Frontend: Registriert `get_general_settings`, `update_general_settings` |
| `llm-function-execution.service.ts` | Frontend: `executeSettingsGeneralRead/Update` - DOM-Manipulation |
| `LLMSystemPromptBuilder.cs` | Fuegt Berechtigungshinweise zum Prompt hinzu |

---

## E2E-Test Strategie

### Teststrategie fuer LLM Chat & Skills

**Wichtig:** Immer `Actions` statt `Page` verwenden (siehe Code Policies).

### Testbare Bereiche

**1. Chat UI Tests:**
- Initialisierungs-Spinner wird angezeigt bis Models + Providers geladen
- API-Key-Warnung erscheint wenn kein Key konfiguriert
- Model-Dropdown zeigt verfuegbare Modelle
- Nachrichten werden korrekt angezeigt (User + Assistant)
- Send-Button ist disabled waehrend Verarbeitung
- Typing-Indicator wird angezeigt

**2. Navigation Tests:**
- `navigateToPage` fuehrt zu korrekter Route
- `navigateToEntity` oeffnet richtige Edit-Seite
- `searchAndNavigate` navigiert + setzt Suchbegriff

**3. Settings General Tests:**
- `get_general_settings` oeffnet Settings und liest App-Namen
- `update_general_settings` aendert App-Namen im Formular
- Berechtigungspruefung: User ohne `CanViewSettings` sieht Fehlermeldung

**4. Skill-Ausfuehrung Tests:**
- Backend-Skills geben korrekte Ergebnisse zurueck
- Fehlende Berechtigungen werden korrekt behandelt
- Parameter-Validierung funktioniert

### Testansatz

Da LLM-Antworten nicht deterministisch sind, sollten E2E-Tests fuer das Skill-System:
- Die Function Execution direkt testen (nicht ueber LLM-Nachrichten)
- Mock-Responses fuer die LLM-API verwenden
- DOM-Zustaende nach Aktionen pruefen (z.B. Navigation erfolgreich, Formularfeld gesetzt)
- Element-IDs nutzen die im Code definiert sind (z.B. `open-settings`, `setting-general-name`, `llm-chat-input`, `llm-chat-send-btn`, `llm-chat-messages`)

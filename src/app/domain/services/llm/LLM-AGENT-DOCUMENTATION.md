# Klacks LLM Agent System Documentation

## Overview

The Klacks application includes an AI Agent system that allows users to interact with the application through natural language. The LLM can navigate pages, fill forms, search data, and perform CRUD operations.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
│                      (llm-chat.component)                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DataManagementLLMService                       │
│  - Manages conversations                                         │
│  - Sends messages to LLM API                                     │
│  - Executes function calls                                       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│ LLMSystemContext│ │ LLMFunction     │ │ LLMFunctionExecution    │
│ Service         │ │ RegistryService │ │ Service                 │
│                 │ │                 │ │                         │
│ - System Prompt │ │ - Function Defs │ │ - Execute Functions     │
│ - Capabilities  │ │ - Validation    │ │ - Handle Results        │
│ - Examples      │ │ - Tool Convert  │ │ - Error Handling        │
└─────────────────┘ └─────────────────┘ └─────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `llm-chat.component.ts` | UI component for chat interface |
| `data-management-llm.service.ts` | Main LLM management service |
| `llm-function-registry.service.ts` | Registers available functions |
| `llm-function-execution.service.ts` | Executes function calls |
| `llm-system-context.service.ts` | Provides system context to LLM |
| `llm-function-definitions.interface.ts` | TypeScript interfaces |

---

## Available Functions

### Navigation Functions

| Function | Description | Parameters |
|----------|-------------|------------|
| `navigateToPage` | Navigate to a specific route | `route`: string, `params?`: object |
| `navigateToEntity` | Navigate to entity by ID | `entityType`: string, `entityId`: GUID, `action?`: string |
| `openDialog` | Open a modal dialog | `dialogType`: string, `data?`: object |
| `searchAndNavigate` | **Search by name and navigate** - Use this when user wants to open an entity by name | `entityType`: string, `searchQuery`: string, `action?`: string |

### Form Functions

| Function | Description | Parameters |
|----------|-------------|------------|
| `fillForm` | Fill form fields | `formId`: string, `data`: object |
| `submitForm` | Submit a form | `formId`: string |

### Data Functions

| Function | Description | Parameters |
|----------|-------------|------------|
| `searchData` | Search entities (returns list with IDs) | `entity`: string, `query`: string, `filters?`: object |
| `getData` | Get entity by ID | `entity`: string, `id`: string |
| `createEntity` | Create new entity | `entity`: string, `data`: object |
| `updateEntity` | Update entity | `entity`: string, `id`: string, `data`: object |

### System Functions

| Function | Description | Parameters |
|----------|-------------|------------|
| `getCurrentUser` | Get current user info | none |
| `getUserPermissions` | Get user permissions | none |

---

## Search Flow (Important!)

**Problem:** Users don't know entity GUIDs - they know names like "Max Müller" or "Frühschicht".

**Solution:** Use `searchAndNavigate` function which:
1. Searches by name using the existing Klacks APIs
2. If exactly 1 result: automatically navigates to edit page
3. If multiple results: returns list for user to choose from
4. If no results: returns error message

**Example Flow:**
```
User: "Öffne den Kunden Max Müller"
LLM calls: searchAndNavigate({ entityType: 'client', searchQuery: 'Max Müller' })
→ If 1 match: navigates to /workplace/edit-address/{guid}
→ If 3 matches: returns list with names, companies, cities for user to select
```

---

## Klacks Navigation Routes

### Main Routes

| Route | Description | Auth Required | Admin Only |
|-------|-------------|---------------|------------|
| `/workplace/dashboard` | Dashboard overview | Yes | No |
| `/workplace/client` | Client/Address list | Yes | No |
| `/workplace/schedule` | Schedule view | Yes | No |
| `/workplace/absence` | Absence Gantt chart | Yes | No |
| `/workplace/profile` | User profile | Yes | No |
| `/workplace/settings` | Application settings | Yes | Yes |
| `/workplace/group` | Group management | Yes | Yes |
| `/workplace/shift` | Shift list | Yes | No |

### Entity Edit Routes

| Route | Description | Parameters |
|-------|-------------|------------|
| `/workplace/edit-address` | Create new address | none |
| `/workplace/edit-address/:id` | Edit address | `id`: GUID |
| `/workplace/edit-group` | Create new group | none |
| `/workplace/edit-group/:id` | Edit group | `id`: GUID |
| `/workplace/new-shift` | Create new shift | none |
| `/workplace/edit-shift/:id` | Edit shift | `id`: GUID |
| `/workplace/cut-shift/:id` | Cut shift | `id`: GUID |
| `/workplace/container-template/:id` | Container template | `id`: GUID |

---

## Klacks Entities

| Entity Key | German Name | Description |
|------------|-------------|-------------|
| `clients` | Adressen | All addresses (employees, customers, external) |
| `employees` | Mitarbeiter | Internal employees (Type=0) |
| `external` | Externe | External employees (Type=1) |
| `customers` | Kunden | Customers (Type=2) |
| `shifts` | Dienste | Work shifts |
| `groups` | Gruppen | Organizational groups |
| `schedules` | Einsatzpläne | Schedule assignments |
| `absences` | Abwesenheiten | Absence records |

---

## Adding New Functions

### 1. Register Function in `llm-function-registry.service.ts`

```typescript
this.registerFunction({
  name: 'myNewFunction',
  description: 'What this function does',
  parameters: [
    {
      name: 'param1',
      type: 'string',
      description: 'Parameter description',
      required: true,
      enum: ['option1', 'option2'], // optional
    },
  ],
  category: 'navigation' | 'form' | 'data' | 'system',
});
```

### 2. Implement Function in `llm-function-execution.service.ts`

```typescript
case 'myNewFunction':
  return this.executeMyNewFunction(functionCall);

private executeMyNewFunction(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
  try {
    const { param1 } = call.arguments;
    // Implementation
    return of({
      id: call.id,
      success: true,
      result: { /* result data */ },
    });
  } catch (error: any) {
    return of({
      id: call.id,
      success: false,
      error: error.message,
    });
  }
}
```

### 3. Update System Context in `llm-system-context.service.ts`

Add examples for the new function in `getExamples()`.

---

## Security Considerations

1. **Permission Checks**: Functions should respect user permissions
2. **Confirmation**: Critical operations (delete, update) should request confirmation
3. **Validation**: All parameters are validated before execution
4. **Audit Logging**: Function executions should be logged
5. **Rate Limiting**: Consider limiting function calls per session

---

## Example User Interactions

### Navigation Examples

- "Zeige mir das Dashboard" → `navigateToPage('/workplace/dashboard')`
- "Gehe zu den Einstellungen" → `navigateToPage('/workplace/settings')`
- "Öffne die Kundenliste" → `navigateToPage('/workplace/client')`
- "Zeige mir alle Dienste" → `navigateToPage('/workplace/shift')`

### Search and Navigate Examples (NEW - Preferred for entity access)

- "Öffne den Kunden Max Müller" → `searchAndNavigate({ entityType: 'client', searchQuery: 'Max Müller' })`
- "Bearbeite den Dienst Frühschicht" → `searchAndNavigate({ entityType: 'shift', searchQuery: 'Frühschicht' })`
- "Zeige mir die Gruppe Zürich" → `searchAndNavigate({ entityType: 'group', searchQuery: 'Zürich' })`
- "Öffne Meier AG" → `searchAndNavigate({ entityType: 'client', searchQuery: 'Meier AG' })`

### Data Search Examples

- "Suche nach Kunden in Zürich" → `searchData({ entity: 'clients', query: 'Zürich' })`
- "Suche alle Mitarbeiter" → `searchData({ entity: 'clients', query: '', filters: { type: 0 } })`
- "Zeige mir Dienste mit Nacht" → `searchData({ entity: 'shifts', query: 'Nacht' })`

### Create Examples

- "Erstelle einen neuen Kunden" → `navigateToPage('/workplace/edit-address')`
- "Neuen Dienst anlegen" → `navigateToPage('/workplace/new-shift')`
- "Neue Gruppe erstellen" → `navigateToPage('/workplace/edit-group')`

### Backend Function: create_client (Mitarbeiter erstellen)

Die `create_client` Funktion erstellt einen neuen Mitarbeiter vollständig mit allen Daten:

**Parameter:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `firstName` | string | Ja | Vorname |
| `lastName` | string | Ja | Nachname |
| `gender` | string | Ja | Male, Female, Intersexuality, LegalEntity |
| `birthdate` | string | Nein | Geburtsdatum (YYYY-MM-DD) |
| `street` | string | Nein | Strasse und Hausnummer |
| `postalCode` | string | Nein | Postleitzahl |
| `city` | string | Nein | Stadt/Ort |
| `canton` | string | Nein | Kanton (automatisch aus PLZ erkannt) |
| `country` | string | Nein | Land (Schweiz, Deutschland, etc.) |
| `contractType` | string | Nein | Vertragstyp (z.B. "BE 180 Std") |
| `groupPath` | string | Nein | Gruppenpfad (z.B. "Deutschweiz Mitte -> BERN -> Bern") |

**Automatische Erkennung:**
- **Kanton aus PLZ:** 3xxx=BE, 8xxx=ZH, 5xxx=AG, etc.
- **Land-Abkürzung:** "Schweiz"→"CH", "Deutschland"→"DE", "Österreich"→"AT"
- **Vertrag:** Wird anhand des Namens in der Vertragsliste gesucht
- **Gruppe:** Wird anhand des letzten Teils des Pfades gesucht

**Beispiele:**
```
User: "Erstelle einen neuen Mitarbeiter: Herr Max Müller, geboren am 15.03.1985,
       wohnhaft in Liebefeld, Hauptstrasse 42, 3097"

LLM calls: create_client({
  firstName: "Max",
  lastName: "Müller",
  gender: "Male",
  birthdate: "1985-03-15",
  street: "Hauptstrasse 42",
  postalCode: "3097",
  city: "Liebefeld",
  country: "Schweiz"
})
→ Kanton wird automatisch als "BE" erkannt (PLZ 3xxx)
→ Land wird als "CH" gespeichert

User: "Erstelle Mitarbeiter Hans Meier mit Vertrag BE 180 Std in Gruppe Bern"

LLM calls: create_client({
  firstName: "Hans",
  lastName: "Meier",
  gender: "Male",
  contractType: "BE 180 Std",
  groupPath: "Bern"
})
→ Vertrag "BE 180 Std" wird zugewiesen
→ Gruppe "Bern" wird zugewiesen
```

---

## Changelog

### Version 1.0 (Initial)
- Basic navigation functions
- Form fill/submit functions
- Data CRUD functions
- System info functions

### Version 1.1 (Klacks-specific)
- Added Klacks navigation routes
- Updated entity types for Klacks domain
- Added German language examples

### Version 1.2 (Search & Navigate)
- Added `searchAndNavigate` function for name-based entity access
- Implemented real API calls in `searchData` (Clients, Shifts, Groups)
- Auto-navigation when exactly one search result found
- Multiple results handling with user selection
- Added `navigateToEntity` for direct GUID-based navigation

### Version 1.3 (Multi-Provider Function Calling)
- Implemented Function Calling / Tool Use support for all major LLM providers
- Backend now sends `FunctionCalls` to frontend for execution
- Frontend executes functions via `LLMFunctionExecutionService`
- `searchAndNavigate` triggers actual UI search via `SearchStrategyService`

### Version 1.4 (Create Client with Full Data - December 2025)
- **`create_client` function** now creates employees with full data:
  - Name, Gender, Birthdate
  - Full address (Street, PLZ, City, Canton, Country)
  - Contract assignment (by name matching)
  - Group assignment (by path matching)
- **Automatic Canton detection** from Swiss postal codes (3xxx=BE, 8xxx=ZH, etc.)
- **Country abbreviation conversion** ("Schweiz"→"CH", "Deutschland"→"DE")
- Services are automatically initialized before client creation
- Navigation to edit-address page after successful creation

---

## LLM Provider Configuration

### Supported Providers with Function Calling

| Provider | API Format | Function Calling Support | Notes |
|----------|-----------|-------------------------|-------|
| OpenAI | `tools` | Yes | Standard implementation |
| Anthropic | `tool_use` | Yes | Uses different message structure |
| Google Gemini | `tools` (v1beta) | Yes | Requires v1beta API for tools |
| Mistral | `tools` | Yes | Uses OpenAI-compatible format |
| DeepSeek | `tools` | Yes | Uses OpenAI-compatible format |
| Cohere | `tools` | Planned | Not yet implemented |
| Qwen | `tools` | Planned | Not yet implemented |

### Current Model IDs (Stand: November 2025)

#### OpenAI (GPT-5.1 Serie)
| Model Name | API Model ID | Category |
|------------|-------------|----------|
| GPT-5.1 | `gpt-5.1` | powerful |
| GPT-5.1 Instant | `gpt-5.1-instant` | fast |
| GPT-5.1 Codex | `gpt-5.1-codex` | coding |
| GPT-5.1 Codex Mini | `gpt-5.1-codex-mini` | coding |

#### Anthropic Claude
| Model Name | API Model ID | Category |
|------------|-------------|----------|
| Claude 3.5 Haiku | `claude-3-5-haiku-20241022` | fast |
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | balanced |
| Claude Opus 4.5 | `claude-opus-4-5-20251101` | powerful |

#### Google Gemini (Gemini 3 Serie)
| Model Name | API Model ID | Category |
|------------|-------------|----------|
| Gemini 3 Pro | `gemini-3-pro-preview` | powerful |
| Gemini 2.5 Flash | `gemini-2.5-flash` | fast |

#### Mistral AI
| Model Name | API Model ID | Category |
|------------|-------------|----------|
| Mistral Medium 3 | `mistral-medium-2505` | powerful |
| Mistral Small 3.1 | `mistral-small-2503` | balanced |
| Magistral Medium | `magistral-medium-2509` | reasoning |
| Devstral Medium | `devstral-medium-2507` | coding |

#### DeepSeek (V3.2 Serie)
| Model Name | API Model ID | Category |
|------------|-------------|----------|
| DeepSeek V3.2 Chat | `deepseek-chat` | balanced |
| DeepSeek V3.2 Reasoner | `deepseek-reasoner` | reasoning |

#### Cohere
| Model Name | API Model ID | Category |
|------------|-------------|----------|
| Command A | `command-a` | powerful |
| Command A Reasoning | `command-a-reasoning` | reasoning |
| Command R+ | `command-r-plus-08-2024` | balanced |

#### Qwen (Alibaba)
| Model Name | API Model ID | Category |
|------------|-------------|----------|
| Qwen3 Max | `qwen3-max` | powerful |
| Qwen3 32B | `qwen3-32b` | balanced |

#### Baidu ERNIE
| Model Name | API Model ID | Category |
|------------|-------------|----------|
| ERNIE 5.0 | `ernie-5.0` | powerful |
| ERNIE 4.5 VL | `ernie-4.5-vl` | balanced |

#### Zhipu GLM
| Model Name | API Model ID | Category |
|------------|-------------|----------|
| GLM-4.6 | `glm-4.6` | powerful |
| GLM-4.5 | `glm-4.5` | balanced |

---

## Backend Function Calling Architecture

### Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Frontend  │────▶│   Backend    │────▶│  LLM Provider   │
│   (Chat)    │     │  (API)       │     │  (OpenAI, etc.) │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                   │                      │
       │                   │  Request with        │
       │                   │  AvailableFunctions  │
       │                   │─────────────────────▶│
       │                   │                      │
       │                   │  Response with       │
       │                   │  FunctionCalls       │
       │                   │◀─────────────────────│
       │                   │                      │
       │  FunctionCalls    │                      │
       │◀──────────────────│                      │
       │                   │                      │
       ▼                   │                      │
┌─────────────┐            │                      │
│ Function    │            │                      │
│ Execution   │            │                      │
│ Service     │            │                      │
└─────────────┘            │                      │
```

### Backend Files

| File | Purpose |
|------|---------|
| `LLMFunctions.cs` | Defines available functions (searchAndNavigate, etc.) |
| `ProcessLLMMessageCommand.cs` | Sends functions to LLM provider |
| `BaseHttpProvider.cs` | Base class for HTTP-based providers |
| `GeminiProvider.cs` | Google Gemini with v1beta tools support |
| `MistralProvider.cs` | Mistral with tools format |
| `DeepSeekProvider.cs` | DeepSeek with tools format |
| `AnthropicProvider.cs` | Anthropic with tool_use format |
| `OpenAIProvider.cs` | OpenAI with tools format |

### Provider-Specific Implementations

#### Gemini (v1beta for Function Calling)
```csharp
// GeminiProvider.cs - Uses v1beta API when tools are present
var useV1Beta = hasTools || hasSystemPrompt;
var baseUrl = useV1Beta
    ? "https://generativelanguage.googleapis.com/v1beta/"
    : "https://generativelanguage.googleapis.com/v1/";
```

#### Mistral / DeepSeek (tools format)
```csharp
// MistralRequest.cs
public class MistralRequest
{
    [JsonPropertyName("tools")]
    public List<MistralTool>? Tools { get; set; }

    [JsonPropertyName("tool_choice")]
    public string? ToolChoice { get; set; }  // "auto" when functions available
}
```

---

## Database Update for All Models (November 2025)

If you have old model IDs in your database, run this SQL to update to current versions:

```sql
-- Update OpenAI models to GPT-5.1 series
UPDATE llm_models SET api_model_id = 'gpt-5.1', model_name = 'GPT-5.1', model_id = 'gpt-51'
WHERE api_model_id IN ('gpt-4o', 'gpt-4');

UPDATE llm_models SET api_model_id = 'gpt-5.1-instant', model_name = 'GPT-5.1 Instant', model_id = 'gpt-51-instant'
WHERE api_model_id IN ('gpt-4o-mini', 'gpt-3.5-turbo');

-- Update Google Gemini models to Gemini 3
UPDATE llm_models SET api_model_id = 'gemini-3-pro-preview', model_name = 'Gemini 3 Pro', model_id = 'gemini-3-pro'
WHERE api_model_id IN ('gemini-2.5-pro', 'gemini-2.5-ultra');

-- Update Mistral models
UPDATE llm_models SET api_model_id = 'mistral-medium-2505', model_name = 'Mistral Medium 3', model_id = 'mistral-medium-3'
WHERE api_model_id = 'mistral-large-2407';

UPDATE llm_models SET api_model_id = 'mistral-small-2503', model_name = 'Mistral Small 3.1', model_id = 'mistral-small-31'
WHERE api_model_id = 'mistral-small-2409';

-- Update DeepSeek models (API names stay same, display names updated)
UPDATE llm_models SET model_name = 'DeepSeek V3.2 Chat' WHERE api_model_id = 'deepseek-chat';
UPDATE llm_models SET model_name = 'DeepSeek V3.2 Reasoner' WHERE api_model_id = 'deepseek-reasoner';

-- Update Qwen models
UPDATE llm_models SET api_model_id = 'qwen3-max', model_name = 'Qwen3 Max', model_id = 'qwen3-max'
WHERE api_model_id = 'qwen-turbo';

UPDATE llm_models SET api_model_id = 'qwen3-32b', model_name = 'Qwen3 32B', model_id = 'qwen3-32b'
WHERE api_model_id = 'qwen-plus';

-- Update Baidu ERNIE models
UPDATE llm_models SET api_model_id = 'ernie-5.0', model_name = 'ERNIE 5.0', model_id = 'ernie-5'
WHERE api_model_id = 'ernie-4.0-8k';

UPDATE llm_models SET api_model_id = 'ernie-4.5-vl', model_name = 'ERNIE 4.5 VL', model_id = 'ernie-45-vl'
WHERE api_model_id = 'ernie-3.5-8k';

-- Update Zhipu GLM models
UPDATE llm_models SET api_model_id = 'glm-4.6', model_name = 'GLM-4.6', model_id = 'glm-46'
WHERE api_model_id = 'glm-4';

UPDATE llm_models SET api_model_id = 'glm-4.5', model_name = 'GLM-4.5', model_id = 'glm-45'
WHERE api_model_id = 'glm-4-flash';
```

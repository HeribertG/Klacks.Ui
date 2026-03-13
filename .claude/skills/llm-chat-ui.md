---
name: llm-chat-ui
description: Verwende wenn an der Chat-UI, SignalR-Streaming, Function Execution oder UiAction Engine gearbeitet wird
---

# LLM Chat UI

## Übersicht

Angular-basierte Chat-UI mit SignalR-Streaming, Function Execution und UiAction Engine.

## Architektur

```
presentation/aside/assistant-chat/
├── assistant-chat.component.ts          → Chat UI, Message Rendering, User Input
└── assistant-chat.component.html        → Chat Template

domain/services/assistant/
├── assistant-function-execution.service.ts  → Function Call Execution
├── ui-action-engine.service.ts              → UiAction DOM-Manipulation
├── ui-action-value-resolver.service.ts      → Wert-Auflösung für UiActions
├── data-management-assistant.service.ts     → State Management

infrastructure/api/assistant/
├── data-assistant.service.ts                → HTTP API Service

infrastructure/signalr/
├── assistant-signalr.service.ts             → Real-time Streaming
```

## Message Flow (Frontend)

```
1. User tippt Nachricht → sendMessage()
2. HTTP POST an Backend → Response mit message, suggestions, functionCalls
3. Bot-Antwort anzeigen
4. Falls functionCalls vorhanden:
   a. Hat UiActionSteps? → executeUiActionSteps()
   b. Sonst → functionExecutionService.executeFunction()
5. Falls navigateTo + actionPerformed → Auto-Navigation nach 2s
```

## Function Execution

**Pfad:** `domain/services/assistant/assistant-function-execution.service.ts`

Routing:
- `navigate_to`, `navigate_to_page`, `navigateToPage` → lokale Router-Navigation
- Alle anderen → HTTP POST an `/assistant/chat/execute-function`

## UiAction Engine

**Pfad:** `domain/services/assistant/ui-action-engine.service.ts`

Führt deklarative DOM-Schritte aus dem `HandlerConfig` JSON aus.

### Unterstützte Actions

| Action | Zweck | Wichtige Felder |
|--------|-------|-----------------|
| `navigate` | Route navigieren | `route` oder `routeMap+routeKeyFrom` |
| `waitForElement` | Element abwarten | `selector`, timeout 3s |
| `setValue` | Input-Wert setzen | `selector`, `value`/`valueFrom` |
| `setSelect` | Select-Wert setzen | `selector`, `value`/`valueFrom` |
| `click` | Element klicken | `selector` |
| `scrollTo` | Zum Element scrollen | `selector` |
| `delay` | Warten (ms) | `delay` (default 500ms) |
| `poll` | Bedingung abwarten | `pollCondition`, `timeout`, `pollInterval` |
| `readValue` | Wert lesen → results | `selector`, `resultKey` |
| `conditional` | Bedingte Verzweigung | `condition`, `thenSteps`, `elseSteps` |
| `search` | Globale Suche triggern | `route`, `value`/`valueFrom` |

### Selector-Typen

- Default `'id'` → `document.getElementById(selector)`
- `'css'` → `document.querySelector(selector)`
- **Dynamic Selectors:** `{paramName}` wird durch Parameter-Wert ersetzt

### Wert-Auflösung (Value Resolver)

| Expression | Auflösung |
|------------|-----------|
| `params.fieldName` | `context.params['fieldName']` |
| `results.fieldName` | `context.results['fieldName']` |
| Sonstiges | Literal-String |

### Conditional Steps

```json
{
  "action": "conditional",
  "condition": { "type": "paramExists", "key": "phone", "operator": "==" },
  "thenSteps": [
    { "action": "setValue", "selector": "tel-field", "valueFrom": "params.phone" }
  ]
}
```

### Dynamic Route Navigation

```json
{
  "action": "navigate",
  "routeMap": { "dashboard": "/workplace/dashboard", "employees": "/workplace/client" },
  "routeKeyFrom": "params.page",
  "appendParamFrom": "params.entityId"
}
```

### UiAction Context

```typescript
interface IUiActionContext {
  params: Record<string, unknown>;    // Function-Parameter vom LLM
  results: Record<string, unknown>;   // Ergebnisse von readValue-Steps
  callId: string;                     // Unique Call ID
}
```

### Konstanten

```typescript
DEFAULT_WAIT_TIMEOUT = 3000   // ms
POLL_INTERVAL = 200           // ms
DEFAULT_DELAY = 500           // ms
SEARCH_DELAY = 500            // ms
```

## Chat-Antwort mit UiAction

```
Backend: LLM wählt Skill → FunctionExecutor setzt UiActionSteps → Response
Frontend: parseStepsJSON → uiActionEngine.executeConfig(config, context)
  → Erfolg: Prefix ✅
  → Fehler: Prefix ❌
```

## Interface: IUiActionStep

**Pfad:** `domain/interfaces/ui-action-step.interface.ts`

Definiert Typen für alle Step-Konfigurationen.

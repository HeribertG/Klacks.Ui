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

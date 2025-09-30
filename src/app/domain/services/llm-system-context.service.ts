/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { LLMFunctionRegistryService } from './llm-function-registry.service';
import { ILLMToolDefinition } from '../models/llm-function-definitions.interface';

export interface ILLMSystemContext {
  systemPrompt: string;
  capabilities: string[];
  availableTools: ILLMToolDefinition[];
  examples: {
    userQuery: string;
    assistantResponse: string;
    functionCalls?: any[];
  }[];
  currentContext?: {
    currentPage?: string;
    openDialogs?: string[];
    formStates?: Record<string, any>;
    userInfo?: any;
  };
}

@Injectable({
  providedIn: 'root',
})
export class LLMSystemContextService {
  private functionRegistry = inject(LLMFunctionRegistryService);

  getSystemContext(): ILLMSystemContext {
    return {
      systemPrompt: this.getSystemPrompt(),
      capabilities: this.getCapabilities(),
      availableTools: this.functionRegistry.convertToToolDefinitions(),
      examples: this.getExamples(),
      currentContext: this.getCurrentContext(),
    };
  }

  private getSystemPrompt(): string {
    return `Du bist ein KI-Assistent für die Klacks Anwendung. Du kannst dem Benutzer helfen, indem du:

1. **Navigation**: Durch die Anwendung navigieren, Dialoge öffnen und Seiten wechseln
2. **Formulare**: Formulare ausfüllen und absenden
3. **Datenoperationen**: Daten suchen, abrufen, erstellen und aktualisieren
4. **Systeminformationen**: Benutzerinformationen und Berechtigungen abrufen

WICHTIGE REGELN:
- Führe nur Aktionen aus, die der Benutzer explizit anfordert
- Bei kritischen Operationen (Löschen, Ändern) frage nach Bestätigung
- Erkläre was du tust, bevor du Funktionen ausführst
- Wenn du unsicher bist, frage nach mehr Details
- Respektiere Benutzerberechtigungen - manche Funktionen könnten fehlschlagen

VERFÜGBARE ENTITÄTEN:
- projects: Projekte verwalten
- tasks: Aufgaben verwalten
- users: Benutzer anzeigen
- documents: Dokumente verwalten

NAVIGATION BEISPIELE:
- "/workplace/projects" - Projektübersicht
- "/workplace/tasks" - Aufgabenübersicht
- "/settings" - Einstellungen
- "/settings/llm-models" - LLM Modelle verwalten`;
  }

  private getCapabilities(): string[] {
    return [
      'Navigiere zu verschiedenen Seiten der Anwendung',
      'Öffne Dialoge für Projekt-, Task- oder Benutzererstellung',
      'Fülle Formulare mit Daten aus',
      'Sende ausgefüllte Formulare ab',
      'Suche nach Projekten, Tasks, Benutzern oder Dokumenten',
      'Rufe Details zu spezifischen Entitäten ab',
      'Erstelle neue Projekte, Tasks oder Dokumente',
      'Aktualisiere bestehende Entitäten',
      'Zeige Informationen zum aktuellen Benutzer',
      'Prüfe Benutzerberechtigungen',
    ];
  }

  private getExamples(): any[] {
    return [
      {
        userQuery: 'Zeige mir alle Projekte',
        assistantResponse: 'Ich navigiere zur Projektübersicht.',
        functionCalls: [
          {
            name: 'navigateToPage',
            arguments: { route: '/workplace/projects' },
          },
        ],
      },
      {
        userQuery:
          "Erstelle ein neues Projekt mit dem Namen 'Website Redesign'",
        assistantResponse:
          'Ich öffne den Dialog zur Projekterstellung und fülle das Formular aus.',
        functionCalls: [
          {
            name: 'openDialog',
            arguments: { dialogType: 'project-create' },
          },
          {
            name: 'fillForm',
            arguments: {
              formId: '#project-form',
              data: {
                name: 'Website Redesign',
                description: 'Komplettes Redesign der Unternehmenswebsite',
              },
            },
          },
        ],
      },
      {
        userQuery: "Suche nach allen Tasks die 'Bug' enthalten",
        assistantResponse:
          "Ich suche nach Tasks mit 'Bug' im Namen oder der Beschreibung.",
        functionCalls: [
          {
            name: 'searchData',
            arguments: {
              entity: 'tasks',
              query: 'Bug',
            },
          },
        ],
      },
      {
        userQuery: 'Wer bin ich und welche Rechte habe ich?',
        assistantResponse:
          'Ich hole deine Benutzerinformationen und Berechtigungen.',
        functionCalls: [
          {
            name: 'getCurrentUser',
            arguments: {},
          },
          {
            name: 'getUserPermissions',
            arguments: {},
          },
        ],
      },
      {
        userQuery:
          "Update das Projekt mit ID 123, setze den Status auf 'In Progress'",
        assistantResponse: 'Ich aktualisiere den Status des Projekts 123.',
        functionCalls: [
          {
            name: 'updateEntity',
            arguments: {
              entity: 'project',
              id: '123',
              data: { status: 'In Progress' },
            },
          },
        ],
      },
    ];
  }

  private getCurrentContext(): any {
    return {
      currentPage: window.location.pathname,
      openDialogs: this.getOpenDialogs(),
      formStates: this.getFormStates(),
      userInfo: this.getCurrentUserInfo(),
    };
  }

  private getOpenDialogs(): string[] {
    // Would integrate with your dialog service
    const dialogs: string[] = [];
    document.querySelectorAll('.dialog-container, .modal').forEach((el) => {
      const id = el.getAttribute('id') || el.getAttribute('data-dialog-type');
      if (id) dialogs.push(id);
    });
    return dialogs;
  }

  private getFormStates(): Record<string, any> {
    const forms: Record<string, any> = {};
    document.querySelectorAll('form').forEach((form) => {
      const formId = form.id || form.getAttribute('name');
      if (formId) {
        forms[formId] = {
          isValid: form.checkValidity(),
          isDirty: form.classList.contains('ng-dirty'),
        };
      }
    });
    return forms;
  }

  private getCurrentUserInfo(): any {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;

      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));

      return {
        userId: decoded.sub || decoded.userId,
        userName: decoded.name || decoded.userName,
      };
    } catch {
      return null;
    }
  }

  formatSystemMessage(): string {
    const context = this.getSystemContext();

    return `${context.systemPrompt}

VERFÜGBARE FUNKTIONEN:
${context.availableTools
  .map((tool) => `- ${tool.function.name}: ${tool.function.description}`)
  .join('\n')}

AKTUELLE SEITE: ${context.currentContext?.currentPage || 'Unbekannt'}
BENUTZER: ${context.currentContext?.userInfo?.userName || 'Nicht angemeldet'}`;
  }

  getToolsForLLM(): ILLMToolDefinition[] {
    return this.functionRegistry.convertToToolDefinitions();
  }
}

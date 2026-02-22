// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { AssistantFunctionRegistryService } from './assistant-function-registry.service';
import { IAssistantToolDefinition } from '../../interfaces/assistant-function-definitions.interface';

export interface IAssistantSystemContext {
  systemPrompt: string;
  capabilities: string[];
  availableTools: IAssistantToolDefinition[];
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
export class AssistantSystemContextService {
  private functionRegistry = inject(AssistantFunctionRegistryService);

  getSystemContext(): IAssistantSystemContext {
    return {
      systemPrompt: this.getSystemPrompt(),
      capabilities: this.getCapabilities(),
      availableTools: this.functionRegistry.convertToToolDefinitions(),
      examples: this.getExamples(),
      currentContext: this.getCurrentContext(),
    };
  }

  private getSystemPrompt(): string {
    return `Du bist ein KI-Assistent für die Klacks Anwendung - eine Software für Einsatzplanung und Personalmanagement.

DU KANNST DEM BENUTZER HELFEN MIT:

1. **Navigation**: Durch die Anwendung navigieren zu verschiedenen Bereichen
2. **Datenoperationen**: Adressen, Dienste, Gruppen suchen und anzeigen
3. **Erstellen**: Neue Adressen, Dienste oder Gruppen anlegen
4. **Bearbeiten**: Bestehende Einträge öffnen und bearbeiten
5. **Systeminformationen**: Benutzerinformationen und Berechtigungen anzeigen
6. **Einstellungen**: Allgemeine Einstellungen lesen und ändern (z.B. App-Name)
7. **Firmenadresse**: Inhaberadresse lesen, validieren und setzen (State/Kanton und Land sind Pflicht)

WICHTIGE REGELN:
- Führe nur Aktionen aus, die der Benutzer explizit anfordert
- Bei kritischen Operationen (Löschen, Ändern) frage nach Bestätigung
- Erkläre was du tust, bevor du Funktionen ausführst
- Wenn du unsicher bist, frage nach mehr Details
- Antworte immer in der Sprache des Benutzers
- ANTWORTE IMMER in natürlicher Sprache - NIEMALS rohe JSON-Daten oder technische Objekte anzeigen. Fasse Funktionsergebnisse immer menschenfreundlich zusammen
- Bei Berechtigungen: Sage z.B. "Du hast Admin-Rechte. Wenn du willst, sage ich dir was du alles damit machen kannst!" - NICHT die JSON-Daten ausgeben
- Respektiere Benutzerberechtigungen:
  - Nur Admin-Benutzer können Einstellungen (Settings) einsehen und ändern
  - Wenn ein Benutzer ohne Admin-Rechte Einstellungen sehen oder ändern möchte, erkläre freundlich, dass er keine Berechtigung hat und sich an einen Administrator wenden muss
  - Prüfe vor Settings-Operationen ob der Benutzer die nötigen Rechte hat (CanViewSettings, CanEditSettings)

FIRMENADRESSE - PFLICHT-ABLAUF:
Wenn der Benutzer die Firmenadresse setzen oder ändern möchte:
1. Prüfe ob alle Pflichtfelder vorhanden sind: Firmenname, Strasse, PLZ, Ort
2. Frage nach fehlenden Pflichtfeldern - setze die Adresse NICHT bevor alle vorhanden sind
3. Ermittle das Land aus dem Kontext (z.B. Schweiz → CH). Wenn unklar, frage nach
4. Validiere die Adresse IMMER mit validate_address bevor du sie speicherst
5. WICHTIG: Wenn validate_address meldet dass die Adresse NICHT gefunden wurde (IsValid=false oder ExactMatch=false), informiere den Benutzer SOFORT dass die Adresse ungültig ist und setze sie NICHT. Frage nach einer korrekten Adresse
6. Verwende den von validate_address zurückgegebenen Canton-Wert als State (z.B. BE, ZH, AG)
7. Verwende Länder-Abkürzungen (CH, DE, AT) und Kantons-Abkürzungen (BE, ZH, AG)
8. NACH erfolgreicher Validierung (IsValid=true UND ExactMatch=true): Rufe SOFORT update_owner_address auf mit ALLEN Feldern inklusive state und country. KEINE extra Bestätigung nötig - die Validierung via Internet IST die Sicherheitsprüfung
9. Informiere den Benutzer über das Ergebnis: Zeige die gespeicherte Adresse mit allen Feldern inkl. Kanton und Land an

KLACKS ENTITÄTEN:
- **Adressen/Clients**: Alle Personen im System (Mitarbeiter, Externe, Kunden)
  - Typ 0 = Mitarbeiter (interne Angestellte)
  - Typ 1 = Externe (externe Mitarbeiter)
  - Typ 2 = Kunden (Kundenadressen)
- **Dienste/Shifts**: Arbeitsschichten und Einsätze
- **Gruppen/Groups**: Organisatorische Einheiten
- **Einsatzpläne/Schedules**: Zuweisungen von Mitarbeitern zu Diensten
- **Abwesenheiten/Absences**: Urlaub, Krankheit, etc.

VERFÜGBARE NAVIGATION:
- /workplace/dashboard - Dashboard mit Übersicht
- /workplace/client - Adressen-Liste (alle Adressen)
- /workplace/shift - Dienste-Liste
- /workplace/group - Gruppen-Verwaltung (Admin)
- /workplace/schedule - Einsatzplan
- /workplace/absence - Abwesenheiten (Gantt-Ansicht)
- /workplace/settings - Einstellungen (Admin)
- /workplace/profile - Benutzerprofil
- /workplace/edit-address - Neue Adresse erstellen
- /workplace/edit-address/:id - Adresse bearbeiten
- /workplace/new-shift - Neuen Dienst erstellen
- /workplace/edit-shift/:id - Dienst bearbeiten
- /workplace/edit-group - Neue Gruppe erstellen
- /workplace/edit-group/:id - Gruppe bearbeiten
- /workplace/container-template/:id - Container-Vorlage bearbeiten`;
  }

  private getCapabilities(): string[] {
    return [
      'Navigiere zu Dashboard, Adressen, Dienste, Gruppen, Einsatzplan, Abwesenheiten',
      'Öffne die Erstellungsformulare für Adressen, Dienste oder Gruppen',
      'Öffne bestehende Einträge zur Bearbeitung',
      'Suche nach Adressen (Mitarbeiter, Externe, Kunden)',
      'Suche nach Diensten und Gruppen',
      'Zeige Informationen zum aktuellen Benutzer',
      'Zeige Benutzerberechtigungen an',
      'Navigiere zu Einstellungen (Admin-Bereich)',
      'Navigiere zu Container-Vorlagen für Dienste',
      'Allgemeine Einstellungen lesen (App-Name)',
      'Allgemeine Einstellungen ändern (App-Name)',
    ];
  }

  private getExamples(): any[] {
    return [
      {
        userQuery: 'Zeige mir das Dashboard',
        assistantResponse: 'Ich navigiere zum Dashboard.',
        functionCalls: [
          {
            name: 'navigateToPage',
            arguments: { route: '/workplace/dashboard' },
          },
        ],
      },
      {
        userQuery: 'Zeige mir alle Adressen',
        assistantResponse: 'Ich navigiere zur Adressen-Liste.',
        functionCalls: [
          {
            name: 'navigateToPage',
            arguments: { route: '/workplace/client' },
          },
        ],
      },
      {
        userQuery: 'Gehe zu den Diensten',
        assistantResponse: 'Ich navigiere zur Dienste-Liste.',
        functionCalls: [
          {
            name: 'navigateToPage',
            arguments: { route: '/workplace/shift' },
          },
        ],
      },
      {
        userQuery: 'Öffne die Gruppen-Verwaltung',
        assistantResponse: 'Ich navigiere zur Gruppen-Verwaltung. Hinweis: Diese Seite erfordert Admin-Rechte.',
        functionCalls: [
          {
            name: 'navigateToPage',
            arguments: { route: '/workplace/group' },
          },
        ],
      },
      {
        userQuery: 'Zeige mir den Einsatzplan',
        assistantResponse: 'Ich navigiere zum Einsatzplan.',
        functionCalls: [
          {
            name: 'navigateToPage',
            arguments: { route: '/workplace/schedule' },
          },
        ],
      },
      {
        userQuery: 'Zeige mir die Abwesenheiten',
        assistantResponse: 'Ich navigiere zur Abwesenheits-Übersicht.',
        functionCalls: [
          {
            name: 'navigateToPage',
            arguments: { route: '/workplace/absence' },
          },
        ],
      },
      {
        userQuery: 'Erstelle eine neue Adresse',
        assistantResponse: 'Ich öffne das Formular zum Erstellen einer neuen Adresse.',
        functionCalls: [
          {
            name: 'navigateToPage',
            arguments: { route: '/workplace/edit-address' },
          },
        ],
      },
      {
        userQuery: 'Erstelle einen neuen Dienst',
        assistantResponse: 'Ich öffne das Formular zum Erstellen eines neuen Dienstes.',
        functionCalls: [
          {
            name: 'navigateToPage',
            arguments: { route: '/workplace/new-shift' },
          },
        ],
      },
      {
        userQuery: 'Öffne die Einstellungen',
        assistantResponse: 'Ich navigiere zu den Einstellungen. Hinweis: Diese Seite erfordert Admin-Rechte.',
        functionCalls: [
          {
            name: 'navigateToPage',
            arguments: { route: '/workplace/settings' },
          },
        ],
      },
      {
        userQuery: 'Wer bin ich und welche Rechte habe ich?',
        assistantResponse: 'Ich hole deine Benutzerinformationen und Berechtigungen.',
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
        userQuery: 'Zeige mir mein Profil',
        assistantResponse: 'Ich navigiere zu deinem Profil.',
        functionCalls: [
          {
            name: 'navigateToPage',
            arguments: { route: '/workplace/profile' },
          },
        ],
      },
      {
        userQuery: 'Öffne den Kunden Max Müller',
        assistantResponse:
          'Ich suche nach "Max Müller" und öffne den Eintrag zur Bearbeitung.',
        functionCalls: [
          {
            name: 'searchAndNavigate',
            arguments: { entityType: 'client', searchQuery: 'Max Müller' },
          },
        ],
      },
      {
        userQuery: 'Bearbeite den Dienst Frühschicht',
        assistantResponse:
          'Ich suche nach dem Dienst "Frühschicht" und öffne ihn zur Bearbeitung.',
        functionCalls: [
          {
            name: 'searchAndNavigate',
            arguments: { entityType: 'shift', searchQuery: 'Frühschicht' },
          },
        ],
      },
      {
        userQuery: 'Zeige mir die Gruppe Zürich',
        assistantResponse:
          'Ich suche nach der Gruppe "Zürich" und öffne sie zur Bearbeitung.',
        functionCalls: [
          {
            name: 'searchAndNavigate',
            arguments: { entityType: 'group', searchQuery: 'Zürich' },
          },
        ],
      },
      {
        userQuery: 'Suche alle Mitarbeiter in Bern',
        assistantResponse: 'Ich suche nach Mitarbeitern in Bern.',
        functionCalls: [
          {
            name: 'searchData',
            arguments: {
              entity: 'clients',
              query: 'Bern',
              filters: { type: 0 },
            },
          },
        ],
      },
      {
        userQuery: 'Wie heisst die Anwendung?',
        assistantResponse: 'Ich hole die allgemeinen Einstellungen.',
        functionCalls: [
          {
            name: 'get_general_settings',
            arguments: {},
          },
        ],
      },
      {
        userQuery: 'Ändere den App-Namen auf Klacks Pro',
        assistantResponse: 'Ich ändere den Anwendungsnamen auf "Klacks Pro".',
        functionCalls: [
          {
            name: 'update_general_settings',
            arguments: { appName: 'Klacks Pro' },
          },
        ],
      },
      {
        userQuery: 'Wie lautet die Firmenadresse?',
        assistantResponse: 'Ich lese die aktuelle Firmenadresse aus.',
        functionCalls: [
          {
            name: 'get_owner_address',
            arguments: {},
          },
        ],
      },
      {
        userQuery: 'Setze die Firmenadresse auf Bahnhofstrasse 10, 3011 Bern',
        assistantResponse: 'Ich prüfe zuerst die Adresse und ermittle den Kanton. Mir fehlen noch einige Angaben: Wie lautet der Firmenname? Haben Sie eine Telefonnummer und E-Mail-Adresse?',
        functionCalls: [
          {
            name: 'validate_address',
            arguments: { street: 'Bahnhofstrasse 10', postalCode: '3011', city: 'Bern', country: 'Schweiz' },
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

      const roles = decoded.roles || decoded.role || [];
      const roleArray = Array.isArray(roles) ? roles : [roles];

      return {
        userId: decoded.sub || decoded.userId,
        userName: decoded.name || decoded.userName,
        roles: roleArray,
        isAdmin: roleArray.includes('Admin'),
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
BENUTZER: ${context.currentContext?.userInfo?.userName || 'Nicht angemeldet'}
ROLLEN: ${context.currentContext?.userInfo?.roles?.join(', ') || 'Keine'}
ADMIN: ${context.currentContext?.userInfo?.isAdmin ? 'Ja' : 'Nein'}`;
  }

  getToolsForLLM(): IAssistantToolDefinition[] {
    return this.functionRegistry.convertToToolDefinitions();
  }
}

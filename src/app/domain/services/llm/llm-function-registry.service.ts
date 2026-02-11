/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  ILLMFunctionDefinition,
  ILLMFunctionCall,
  ILLMToolDefinition,
  ILlmFunctionDefinitionDto,
  ILLMFunctionParameter,
} from '../../interfaces/llm-function-definitions.interface';
import { LlmFunctionDefinitionApiService } from './llm-function-definition-api.service';

@Injectable({
  providedIn: 'root',
})
export class LLMFunctionRegistryService {
  private router = inject(Router);
  private functionDefinitionApi = inject(LlmFunctionDefinitionApiService);
  private registeredFunctions = new Map<string, ILLMFunctionDefinition>();
  private backendLoaded = false;

  constructor() {
    this.registerBuiltInFunctions();
  }

  loadFromBackend(): void {
    if (this.backendLoaded) return;

    this.functionDefinitionApi.loadFunctionDefinitions().subscribe({
      next: (definitions) => {
        for (const def of definitions) {
          this.registerFromBackendDefinition(def);
        }
        this.backendLoaded = true;
      },
      error: (err) => {
        console.error('Failed to load function definitions from backend:', err);
      },
    });
  }

  private registerFromBackendDefinition(dto: ILlmFunctionDefinitionDto): void {
    const parameters: ILLMFunctionParameter[] = JSON.parse(dto.parametersJson || '[]');
    const category = dto.category as ILLMFunctionDefinition['category'];

    this.registerFunction({
      name: dto.name,
      description: dto.description,
      parameters,
      category,
    });
  }

  private registerBuiltInFunctions(): void {
    this.registerFunction({
      name: 'navigateToPage',
      description: 'Navigate to a specific page or route in the Klacks application',
      parameters: [
        {
          name: 'route',
          type: 'string',
          description:
            'The route path to navigate to. Available routes: /workplace/dashboard (Dashboard), /workplace/client (Adressen/Kunden), /workplace/schedule (Einsatzplan), /workplace/absence (Abwesenheiten), /workplace/profile (Profil), /workplace/settings (Einstellungen), /workplace/group (Gruppen), /workplace/shift (Dienste), /workplace/edit-address (Neue Adresse), /workplace/edit-group (Neue Gruppe), /workplace/new-shift (Neuer Dienst)',
          required: true,
        },
        {
          name: 'params',
          type: 'object',
          description: 'Optional route parameters (e.g., { id: "guid" } for edit routes)',
          required: false,
        },
      ],
      category: 'navigation',
    });

    this.registerFunction({
      name: 'navigateToEntity',
      description: 'Navigate to view or edit a specific entity by ID',
      parameters: [
        {
          name: 'entityType',
          type: 'string',
          description: 'Type of entity to navigate to',
          required: true,
          enum: ['client', 'group', 'shift', 'container-template'],
        },
        {
          name: 'entityId',
          type: 'string',
          description: 'The GUID of the entity',
          required: true,
        },
        {
          name: 'action',
          type: 'string',
          description: 'Action to perform',
          required: false,
          enum: ['view', 'edit', 'cut'],
        },
      ],
      category: 'navigation',
    });

    this.registerFunction({
      name: 'openDialog',
      description: 'Open a specific dialog or modal window',
      parameters: [
        {
          name: 'dialogType',
          type: 'string',
          description: 'Type of dialog to open',
          required: true,
          enum: ['client-create', 'group-create', 'shift-create', 'settings'],
        },
        {
          name: 'data',
          type: 'object',
          description: 'Optional data to pass to the dialog',
          required: false,
        },
      ],
      category: 'navigation',
    });

    this.registerFunction({
      name: 'fillForm',
      description: 'Fill a form with provided data',
      parameters: [
        {
          name: 'formId',
          type: 'string',
          description: 'The ID or selector of the form to fill',
          required: true,
        },
        {
          name: 'data',
          type: 'object',
          description: 'Key-value pairs of form field names and values',
          required: true,
        },
      ],
      category: 'form',
    });

    this.registerFunction({
      name: 'submitForm',
      description: 'Submit a form after validation',
      parameters: [
        {
          name: 'formId',
          type: 'string',
          description: 'The ID or selector of the form to submit',
          required: true,
        },
      ],
      category: 'form',
    });

    this.registerFunction({
      name: 'searchData',
      description: 'Search for data in the Klacks application',
      parameters: [
        {
          name: 'entity',
          type: 'string',
          description: 'Type of entity to search: clients (Adressen), shifts (Dienste), groups (Gruppen), schedules (Einsatzpläne)',
          required: true,
          enum: ['clients', 'shifts', 'groups', 'schedules'],
        },
        {
          name: 'query',
          type: 'string',
          description: 'Search query string',
          required: true,
        },
        {
          name: 'filters',
          type: 'object',
          description: 'Additional filters: type (0=Employee, 1=External, 2=Customer), city, country',
          required: false,
        },
      ],
      category: 'data',
    });

    this.registerFunction({
      name: 'getData',
      description: 'Retrieve specific data by ID',
      parameters: [
        {
          name: 'entity',
          type: 'string',
          description: 'Type of entity to retrieve',
          required: true,
          enum: ['client', 'shift', 'group', 'schedule'],
        },
        {
          name: 'id',
          type: 'string',
          description: 'The GUID of the entity',
          required: true,
        },
      ],
      category: 'data',
    });

    this.registerFunction({
      name: 'createEntity',
      description: 'Create a new entity in the system (navigates to create form)',
      parameters: [
        {
          name: 'entity',
          type: 'string',
          description: 'Type of entity to create',
          required: true,
          enum: ['client', 'shift', 'group'],
        },
        {
          name: 'data',
          type: 'object',
          description: 'Initial entity data to pre-fill the form',
          required: false,
        },
      ],
      category: 'data',
    });

    this.registerFunction({
      name: 'updateEntity',
      description: 'Update an existing entity (navigates to edit form)',
      parameters: [
        {
          name: 'entity',
          type: 'string',
          description: 'Type of entity to update',
          required: true,
          enum: ['client', 'shift', 'group'],
        },
        {
          name: 'id',
          type: 'string',
          description: 'The GUID of the entity',
          required: true,
        },
        {
          name: 'data',
          type: 'object',
          description: 'Updated entity data',
          required: false,
        },
      ],
      category: 'data',
    });

    this.registerFunction({
      name: 'getCurrentUser',
      description: 'Get information about the current logged-in user',
      parameters: [],
      category: 'system',
    });

    this.registerFunction({
      name: 'getUserPermissions',
      description: 'Get the current user permissions',
      parameters: [],
      category: 'system',
    });

    this.registerFunction({
      name: 'get_user_permissions',
      description: 'Returns the current user permissions and role. Use this to understand what actions the user is allowed to perform.',
      parameters: [],
      category: 'system',
    });
  }

  registerFunction(definition: ILLMFunctionDefinition): void {
    this.registeredFunctions.set(definition.name, definition);
  }

  getFunction(name: string): ILLMFunctionDefinition | undefined {
    return this.registeredFunctions.get(name);
  }

  getAllFunctions(): ILLMFunctionDefinition[] {
    return Array.from(this.registeredFunctions.values());
  }

  getFunctionsByCategory(category: string): ILLMFunctionDefinition[] {
    return this.getAllFunctions().filter((f) => f.category === category);
  }

  convertToToolDefinitions(): ILLMToolDefinition[] {
    return this.getAllFunctions().map((func) => ({
      type: 'function',
      function: {
        name: func.name,
        description: func.description,
        parameters: {
          type: 'object',
          properties: func.parameters.reduce((props, param) => {
            props[param.name] = {
              type: param.type,
              description: param.description,
              enum: param.enum,
            };
            return props;
          }, {} as Record<string, any>),
          required: func.parameters
            .filter((p) => p.required)
            .map((p) => p.name),
        },
      },
    }));
  }

  validateFunctionCall(functionCall: ILLMFunctionCall): {
    valid: boolean;
    error?: string;
  } {
    const definition = this.getFunction(functionCall.name);
    if (!definition) {
      return { valid: false, error: `Function ${functionCall.name} not found` };
    }

    for (const param of definition.parameters) {
      if (param.required && !(param.name in functionCall.arguments)) {
        return {
          valid: false,
          error: `Missing required parameter: ${param.name}`,
        };
      }

      if (param.name in functionCall.arguments) {
        const value = functionCall.arguments[param.name];

        if (param.type === 'string' && typeof value !== 'string') {
          return {
            valid: false,
            error: `Parameter ${param.name} must be a string`,
          };
        }
        if (param.type === 'number' && typeof value !== 'number') {
          return {
            valid: false,
            error: `Parameter ${param.name} must be a number`,
          };
        }
        if (param.type === 'boolean' && typeof value !== 'boolean') {
          return {
            valid: false,
            error: `Parameter ${param.name} must be a boolean`,
          };
        }

        if (param.enum && !param.enum.includes(value)) {
          return {
            valid: false,
            error: `Parameter ${param.name} must be one of: ${param.enum.join(
              ', '
            )}`,
          };
        }
      }
    }

    return { valid: true };
  }
}

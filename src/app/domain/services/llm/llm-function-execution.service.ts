/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, forkJoin } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  ILLMFunctionCall,
  ILLMFunctionResult,
} from '../../models/llm-function-definitions.interface';
import { LLMFunctionRegistryService } from './llm-function-registry.service';
import { environment } from 'src/environments/environment';
import { Filter, IClient, ITruncatedClient } from '../../models/client-class';
import { ITruncatedShift, ShiftFilter } from '../../models/shift-data-class';
import { GroupFilter, ITruncatedGroup } from '../../models/group-class';

@Injectable({
  providedIn: 'root',
})
export class LLMFunctionExecutionService {
  private router = inject(Router);
  private httpClient = inject(HttpClient);
  private functionRegistry = inject(LLMFunctionRegistryService);
  private readonly apiBaseUrl = environment.baseUrl;

  executeFunction(
    functionCall: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    // Validate function call
    const validation = this.functionRegistry.validateFunctionCall(functionCall);
    if (!validation.valid) {
      return of({
        id: functionCall.id,
        success: false,
        error: validation.error,
      });
    }

    // Route to appropriate handler
    switch (functionCall.name) {
      // Navigation functions
      case 'navigateToPage':
        return this.executeNavigateToPage(functionCall);
      case 'navigateToEntity':
        return this.executeNavigateToEntity(functionCall);
      case 'openDialog':
        return this.executeOpenDialog(functionCall);

      // Form functions
      case 'fillForm':
        return this.executeFillForm(functionCall);
      case 'submitForm':
        return this.executeSubmitForm(functionCall);

      // Data functions
      case 'searchData':
        return this.executeSearchData(functionCall);
      case 'getData':
        return this.executeGetData(functionCall);
      case 'createEntity':
        return this.executeCreateEntity(functionCall);
      case 'updateEntity':
        return this.executeUpdateEntity(functionCall);

      // Combined convenience functions
      case 'searchAndNavigate':
        return this.executeSearchAndNavigate(functionCall);

      // System functions
      case 'getCurrentUser':
        return this.executeGetCurrentUser(functionCall);
      case 'getUserPermissions':
        return this.executeGetUserPermissions(functionCall);

      default:
        return of({
          id: functionCall.id,
          success: false,
          error: `Function ${functionCall.name} not implemented`,
        });
    }
  }

  executeFunctions(
    functionCalls: ILLMFunctionCall[]
  ): Observable<ILLMFunctionResult[]> {
    // Execute functions in sequence to maintain order
    return from(functionCalls).pipe(
      switchMap((call) => this.executeFunction(call)),
      map((result) => [result]),
      catchError((error) =>
        of([
          {
            id: 'error',
            success: false,
            error: error.message || 'Function execution failed',
          },
        ])
      )
    );
  }

  // Navigation implementations
  private executeNavigateToPage(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    try {
      const { route, params } = call.arguments;

      // Navigate using Angular router
      this.router.navigate([route], { queryParams: params });

      return of({
        id: call.id,
        success: true,
        result: { navigated: true, route, params },
      });
    } catch (error: any) {
      return of({
        id: call.id,
        success: false,
        error: error.message,
      });
    }
  }

  private executeNavigateToEntity(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    try {
      const { entityType, entityId, action } = call.arguments;

      let route = '';
      switch (entityType) {
        case 'client':
          route = action === 'edit' || !action
            ? `/workplace/edit-address/${entityId}`
            : `/workplace/client`;
          break;
        case 'group':
          route = action === 'edit' || !action
            ? `/workplace/edit-group/${entityId}`
            : `/workplace/group`;
          break;
        case 'shift':
          if (action === 'cut') {
            route = `/workplace/cut-shift/${entityId}`;
          } else {
            route = `/workplace/edit-shift/${entityId}`;
          }
          break;
        case 'container-template':
          route = `/workplace/container-template/${entityId}`;
          break;
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }

      this.router.navigate([route]);

      return of({
        id: call.id,
        success: true,
        result: { navigated: true, route, entityType, entityId, action },
      });
    } catch (error: any) {
      return of({
        id: call.id,
        success: false,
        error: error.message,
      });
    }
  }

  private executeOpenDialog(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    try {
      const { dialogType, data } = call.arguments;

      // This would integrate with your dialog service
      // For now, we'll simulate it
      console.log(`Opening dialog: ${dialogType}`, data);

      return of({
        id: call.id,
        success: true,
        result: { dialogOpened: true, type: dialogType },
      });
    } catch (error: any) {
      return of({
        id: call.id,
        success: false,
        error: error.message,
      });
    }
  }

  // Form implementations
  private executeFillForm(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    try {
      const { formId, data } = call.arguments;

      // Get form element
      const formElement = document.querySelector(formId) as HTMLFormElement;
      if (!formElement) {
        throw new Error(`Form ${formId} not found`);
      }

      // Fill form fields
      Object.keys(data).forEach((fieldName) => {
        const field = formElement.elements.namedItem(
          fieldName
        ) as HTMLInputElement;
        if (field) {
          field.value = data[fieldName];
          // Trigger change event for Angular forms
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      return of({
        id: call.id,
        success: true,
        result: { formFilled: true, fields: Object.keys(data) },
      });
    } catch (error: any) {
      return of({
        id: call.id,
        success: false,
        error: error.message,
      });
    }
  }

  private executeSubmitForm(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    try {
      const { formId } = call.arguments;

      const formElement = document.querySelector(formId) as HTMLFormElement;
      if (!formElement) {
        throw new Error(`Form ${formId} not found`);
      }

      // Trigger form submit
      formElement.dispatchEvent(new Event('submit', { bubbles: true }));

      return of({
        id: call.id,
        success: true,
        result: { formSubmitted: true },
      });
    } catch (error: any) {
      return of({
        id: call.id,
        success: false,
        error: error.message,
      });
    }
  }

  // Data implementations
  private executeSearchData(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    const { entity, query, filters } = call.arguments;

    switch (entity) {
      case 'clients':
        return this.searchClients(call.id, query, filters);
      case 'shifts':
        return this.searchShifts(call.id, query, filters);
      case 'groups':
        return this.searchGroups(call.id, query);
      default:
        return of({
          id: call.id,
          success: false,
          error: `Unknown entity type: ${entity}`,
        });
    }
  }

  private searchClients(
    callId: string,
    query: string,
    filters?: { type?: number; city?: string; country?: string }
  ): Observable<ILLMFunctionResult> {
    const filter = new Filter();
    filter.searchString = query;
    filter.numberOfItemsPerPage = 10;
    filter.requiredPage = 1;
    filter.includeAddress = true;

    if (filters?.type !== undefined) {
      filter.clientType = filters.type;
    }

    return this.httpClient
      .post<ITruncatedClient>(`${this.apiBaseUrl}Clients/GetSimpleList`, filter)
      .pipe(
        map((response) => ({
          id: callId,
          success: true,
          result: {
            totalCount: response.maxItems,
            items: response.clients.map((c) => ({
              id: c.id,
              name: `${c.firstName} ${c.name}`.trim(),
              company: c.company,
              type: c.type,
              typeLabel: this.getClientTypeLabel(c.type),
              city: c.addresses?.[0]?.city,
              country: c.addresses?.[0]?.country,
            })),
          },
        })),
        catchError((error) =>
          of({
            id: callId,
            success: false,
            error: error.message || 'Search failed',
          })
        )
      );
  }

  private searchShifts(
    callId: string,
    query: string,
    filters?: { includeClientName?: boolean }
  ): Observable<ILLMFunctionResult> {
    const filter = new ShiftFilter();
    filter.searchString = query;
    filter.numberOfItemsPerPage = 10;
    filter.requiredPage = 1;
    filter.includeClientName = filters?.includeClientName ?? true;

    return this.httpClient
      .post<ITruncatedShift>(`${this.apiBaseUrl}Shifts/GetSimpleList/`, filter)
      .pipe(
        map((response) => ({
          id: callId,
          success: true,
          result: {
            totalCount: response.maxItems,
            items: response.shifts.map((s) => ({
              id: s.id,
              name: s.name,
              addressName: s.addressName,
              startShift: s.startShift,
              endShift: s.endShift,
              fromDate: s.fromDate,
            })),
          },
        })),
        catchError((error) =>
          of({
            id: callId,
            success: false,
            error: error.message || 'Search failed',
          })
        )
      );
  }

  private searchGroups(
    callId: string,
    query: string
  ): Observable<ILLMFunctionResult> {
    const filter = new GroupFilter();
    filter.searchString = query;
    filter.numberOfItemsPerPage = 10;
    filter.requiredPage = 1;

    return this.httpClient
      .post<ITruncatedGroup>(`${this.apiBaseUrl}Groups/GetSimpleList/`, filter)
      .pipe(
        map((response) => ({
          id: callId,
          success: true,
          result: {
            totalCount: response.maxItems,
            items: response.groups.map((g) => ({
              id: g.id,
              name: g.name,
              description: g.description,
              clientsCount: g.clientsCount,
              shiftsCount: g.shiftsCount,
            })),
          },
        })),
        catchError((error) =>
          of({
            id: callId,
            success: false,
            error: error.message || 'Search failed',
          })
        )
      );
  }

  private getClientTypeLabel(type: number | string): string {
    const typeNum = typeof type === 'string' ? parseInt(type, 10) : type;
    switch (typeNum) {
      case 0:
        return 'Mitarbeiter';
      case 1:
        return 'Externe';
      case 2:
        return 'Kunde';
      default:
        return 'Unbekannt';
    }
  }

  private executeSearchAndNavigate(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    const { entityType, searchQuery, action } = call.arguments;

    switch (entityType) {
      case 'client':
        return this.searchAndNavigateClient(call.id, searchQuery, action);
      case 'shift':
        return this.searchAndNavigateShift(call.id, searchQuery, action);
      case 'group':
        return this.searchAndNavigateGroup(call.id, searchQuery, action);
      default:
        return of({
          id: call.id,
          success: false,
          error: `Unknown entity type: ${entityType}`,
        });
    }
  }

  private searchAndNavigateClient(
    callId: string,
    searchQuery: string,
    action?: string
  ): Observable<ILLMFunctionResult> {
    const filter = new Filter();
    filter.searchString = searchQuery;
    filter.numberOfItemsPerPage = 5;
    filter.requiredPage = 1;
    filter.includeAddress = true;

    return this.httpClient
      .post<ITruncatedClient>(`${this.apiBaseUrl}Clients/GetSimpleList`, filter)
      .pipe(
        map((response) => {
          if (response.clients.length === 0) {
            return {
              id: callId,
              success: false,
              error: `Keine Adresse gefunden für "${searchQuery}"`,
            };
          }

          if (response.clients.length === 1) {
            const client = response.clients[0];
            const route = `/workplace/edit-address/${client.id}`;
            this.router.navigate([route]);
            return {
              id: callId,
              success: true,
              result: {
                action: 'navigated',
                route,
                entity: {
                  id: client.id,
                  name: `${client.firstName} ${client.name}`.trim(),
                  company: client.company,
                },
              },
            };
          }

          return {
            id: callId,
            success: true,
            result: {
              action: 'multiple_results',
              message: `${response.clients.length} Adressen gefunden. Bitte wählen Sie:`,
              items: response.clients.map((c) => ({
                id: c.id,
                name: `${c.firstName} ${c.name}`.trim(),
                company: c.company,
                type: this.getClientTypeLabel(c.type),
                city: c.addresses?.[0]?.city,
              })),
            },
          };
        }),
        catchError((error) =>
          of({
            id: callId,
            success: false,
            error: error.message || 'Search failed',
          })
        )
      );
  }

  private searchAndNavigateShift(
    callId: string,
    searchQuery: string,
    action?: string
  ): Observable<ILLMFunctionResult> {
    const filter = new ShiftFilter();
    filter.searchString = searchQuery;
    filter.numberOfItemsPerPage = 5;
    filter.requiredPage = 1;
    filter.includeClientName = true;

    return this.httpClient
      .post<ITruncatedShift>(`${this.apiBaseUrl}Shifts/GetSimpleList/`, filter)
      .pipe(
        map((response) => {
          if (response.shifts.length === 0) {
            return {
              id: callId,
              success: false,
              error: `Kein Dienst gefunden für "${searchQuery}"`,
            };
          }

          if (response.shifts.length === 1) {
            const shift = response.shifts[0];
            const route =
              action === 'cut'
                ? `/workplace/cut-shift/${shift.id}`
                : `/workplace/edit-shift/${shift.id}`;
            this.router.navigate([route]);
            return {
              id: callId,
              success: true,
              result: {
                action: 'navigated',
                route,
                entity: {
                  id: shift.id,
                  name: shift.name,
                  addressName: shift.addressName,
                },
              },
            };
          }

          return {
            id: callId,
            success: true,
            result: {
              action: 'multiple_results',
              message: `${response.shifts.length} Dienste gefunden. Bitte wählen Sie:`,
              items: response.shifts.map((s) => ({
                id: s.id,
                name: s.name,
                addressName: s.addressName,
                startShift: s.startShift,
                endShift: s.endShift,
              })),
            },
          };
        }),
        catchError((error) =>
          of({
            id: callId,
            success: false,
            error: error.message || 'Search failed',
          })
        )
      );
  }

  private searchAndNavigateGroup(
    callId: string,
    searchQuery: string,
    action?: string
  ): Observable<ILLMFunctionResult> {
    const filter = new GroupFilter();
    filter.searchString = searchQuery;
    filter.numberOfItemsPerPage = 5;
    filter.requiredPage = 1;

    return this.httpClient
      .post<ITruncatedGroup>(`${this.apiBaseUrl}Groups/GetSimpleList/`, filter)
      .pipe(
        map((response) => {
          if (response.groups.length === 0) {
            return {
              id: callId,
              success: false,
              error: `Keine Gruppe gefunden für "${searchQuery}"`,
            };
          }

          if (response.groups.length === 1) {
            const group = response.groups[0];
            const route = `/workplace/edit-group/${group.id}`;
            this.router.navigate([route]);
            return {
              id: callId,
              success: true,
              result: {
                action: 'navigated',
                route,
                entity: {
                  id: group.id,
                  name: group.name,
                  description: group.description,
                },
              },
            };
          }

          return {
            id: callId,
            success: true,
            result: {
              action: 'multiple_results',
              message: `${response.groups.length} Gruppen gefunden. Bitte wählen Sie:`,
              items: response.groups.map((g) => ({
                id: g.id,
                name: g.name,
                description: g.description,
                clientsCount: g.clientsCount,
              })),
            },
          };
        }),
        catchError((error) =>
          of({
            id: callId,
            success: false,
            error: error.message || 'Search failed',
          })
        )
      );
  }

  private executeGetData(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    const { entity, id } = call.arguments;

    return this.httpClient.get(`${this.apiBaseUrl}${entity}/${id}`).pipe(
      map((data) => ({
        id: call.id,
        success: true,
        result: data,
      })),
      catchError((error) =>
        of({
          id: call.id,
          success: false,
          error: error.message,
        })
      )
    );
  }

  private executeCreateEntity(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    const { entity, data } = call.arguments;

    return this.httpClient.post(`${this.apiBaseUrl}${entity}`, data).pipe(
      map((created) => ({
        id: call.id,
        success: true,
        result: created,
      })),
      catchError((error) =>
        of({
          id: call.id,
          success: false,
          error: error.message,
        })
      )
    );
  }

  private executeUpdateEntity(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    const { entity, id, data } = call.arguments;

    return this.httpClient.put(`${this.apiBaseUrl}${entity}/${id}`, data).pipe(
      map((updated) => ({
        id: call.id,
        success: true,
        result: updated,
      })),
      catchError((error) =>
        of({
          id: call.id,
          success: false,
          error: error.message,
        })
      )
    );
  }

  // System implementations
  private executeGetCurrentUser(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    try {
      // Get user from token or session
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('User not authenticated');
      }

      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));

      return of({
        id: call.id,
        success: true,
        result: {
          userId: decoded.sub || decoded.userId,
          userName: decoded.name || decoded.userName,
          email: decoded.email,
        },
      });
    } catch (error: any) {
      return of({
        id: call.id,
        success: false,
        error: error.message,
      });
    }
  }

  private executeGetUserPermissions(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('User not authenticated');
      }

      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));

      return of({
        id: call.id,
        success: true,
        result: {
          roles: decoded.roles || [],
          permissions: decoded.permissions || [],
        },
      });
    } catch (error: any) {
      return of({
        id: call.id,
        success: false,
        error: error.message,
      });
    }
  }
}

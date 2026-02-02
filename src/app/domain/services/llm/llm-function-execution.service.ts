/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, timer } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { DataManagementClientService } from '../client/data-management-client.service';
import {
  ILLMFunctionCall,
  ILLMFunctionResult,
} from '../../interfaces/llm-function-definitions.interface';
import { LLMFunctionRegistryService } from './llm-function-registry.service';
import { environment } from 'src/environments/environment';
import {
  ClientContract,
  Filter,
  ITruncatedClient,
} from '../../models/client-class';
import { ITruncatedShift, ShiftFilter } from '../../models/shift-data-class';
import { GroupFilter, ITruncatedGroup } from '../../models/group-class';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { SearchStrategyService } from 'src/app/presentation/search/search-strategy.service';
import { DataManagementContractService } from '../contract/data-management-contract.service';
import { DataManagementGroupService } from '../group/data-management-group.service';
import { ClientGroupItem } from '../../models/client-group-item-class';

@Injectable({
  providedIn: 'root',
})
export class LLMFunctionExecutionService {
  private router = inject(Router);
  private httpClient = inject(HttpClient);
  private functionRegistry = inject(LLMFunctionRegistryService);
  private searchStateService = inject(SearchStateService);
  private searchStrategyService = inject(SearchStrategyService);
  private dataManagementClientService = inject(DataManagementClientService);
  private dataManagementContractService = inject(DataManagementContractService);
  private dataManagementGroupService = inject(DataManagementGroupService);
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

      // Client creation via UI flow
      case 'create_client':
        return this.executeCreateClient(functionCall);

      case 'navigate_to_page':
        return this.executeNavigateToPageLegacy(functionCall);

      // Backend-executed functions (pass through)
      case 'search_clients':
      case 'create_contract':
      case 'get_system_info':
        return this.executeBackendFunction(functionCall);

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

  private executeNavigateToPageLegacy(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    try {
      const { page } = call.arguments;
      let route = '/workplace/dashboard';

      switch (page?.toLowerCase()) {
        case 'dashboard':
          route = '/workplace/dashboard';
          break;
        case 'clients':
          route = '/workplace/client';
          break;
        case 'contracts':
          route = '/workplace/client'; // Contracts are typically managed via clients
          break;
        case 'settings':
          route = '/workplace/settings';
          break;
        case 'calendar':
          route = '/workplace/schedule';
          break;
        case 'reports':
          route = '/workplace/dashboard'; // Placeholder if no dedicated report route exists
          break;
      }

      this.router.navigate([route]);

      return of({
        id: call.id,
        success: true,
        result: { navigated: true, route, page },
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
          route =
            action === 'edit' || !action
              ? `/workplace/edit-address/${entityId}`
              : `/workplace/client`;
          break;
        case 'group':
          route =
            action === 'edit' || !action
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
    _action?: string
  ): Observable<ILLMFunctionResult> {
    const route = '/workplace/client';

    this.searchStateService.setRestoreSearch(searchQuery);

    this.router.navigate([route]).then(() => {
      setTimeout(() => {
        this.searchStrategyService.globalSearch(searchQuery, true, false);
      }, 500);
    });

    return of({
      id: callId,
      success: true,
      result: {
        action: 'navigated_with_search',
        route,
        searchQuery,
        message: `Navigiert zu Adressen und suche nach "${searchQuery}"`,
      },
    });
  }

  private searchAndNavigateShift(
    callId: string,
    searchQuery: string,
    _action?: string
  ): Observable<ILLMFunctionResult> {
    const route = '/workplace/shift';

    this.searchStateService.setRestoreSearch(searchQuery);

    this.router.navigate([route]).then(() => {
      setTimeout(() => {
        this.searchStrategyService.globalSearch(searchQuery, false, true);
      }, 500);
    });

    return of({
      id: callId,
      success: true,
      result: {
        action: 'navigated_with_search',
        route,
        searchQuery,
        message: `Navigiert zu Dienste und suche nach "${searchQuery}"`,
      },
    });
  }

  private searchAndNavigateGroup(
    callId: string,
    searchQuery: string,
    _action?: string
  ): Observable<ILLMFunctionResult> {
    const route = '/workplace/group';

    this.searchStateService.setRestoreSearch(searchQuery);

    this.router.navigate([route]).then(() => {
      setTimeout(() => {
        this.searchStrategyService.globalSearch(searchQuery, false, false);
      }, 500);
    });

    return of({
      id: callId,
      success: true,
      result: {
        action: 'navigated_with_search',
        route,
        searchQuery,
        message: `Navigiert zu Gruppen und suche nach "${searchQuery}"`,
      },
    });
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

  private executeBackendFunction(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    return this.httpClient
      .post<{
        success: boolean;
        result?: any;
        error?: string;
        message?: string;
      }>(`${this.apiBaseUrl}assistant/chat/execute-function`, {
        functionName: call.name,
        parameters: call.arguments,
      })
      .pipe(
        map((response) => ({
          id: call.id,
          success: response.success,
          result: response.result,
          error: response.error,
        })),
        catchError((error) =>
          of({
            id: call.id,
            success: false,
            error: error.message || 'Backend function execution failed',
          })
        )
      );
  }

  private async ensureServicesInitialized(): Promise<void> {
    if (this.dataManagementContractService.contracts.length === 0) {
      await this.dataManagementContractService.init();
    }
    if (this.dataManagementGroupService.flatNodeList.length === 0) {
      this.dataManagementGroupService.initTree();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  private executeCreateClient(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    const {
      firstName,
      lastName,
      gender,
      birthdate,
      street,
      postalCode,
      city,
      canton,
      country,
      contractType,
      groupPath,
    } = call.arguments;

    const clientEditService =
      this.dataManagementClientService.clientEditService;

    clientEditService.createClient();

    return from(this.ensureServicesInitialized()).pipe(
      switchMap(() => timer(500)),
      tap(() => {
        const editClient = clientEditService.editClient();
        if (editClient) {
          editClient.firstName = firstName || '';
          editClient.name = lastName || '';
          editClient.gender = this.parseGender(gender);

          if (birthdate) {
            const date = new Date(birthdate);
            if (!isNaN(date.getTime())) {
              editClient.birthdate = date;
            }
          }

          if (editClient.addresses && editClient.addresses.length > 0) {
            const address = editClient.addresses[0];
            address.street = street || '';
            address.zip = postalCode || '';
            address.city = city || '';
            address.state =
              canton || this.getCantonFromPostalCode(postalCode) || '';
            address.country = this.getCountryAbbreviation(country) || 'CH';
          }

          if (contractType) {
            this.assignContractToClient(editClient, contractType);
          }

          if (groupPath) {
            this.assignGroupToClient(editClient, groupPath);
          }

          clientEditService.editClient.set({ ...editClient });
        }
      }),
      switchMap(() => {
        return new Observable<ILLMFunctionResult>((observer) => {
          clientEditService.onSaveCompleted = () => {
            const savedClient = clientEditService.editClient();
            this.router.navigate(['/workplace/edit-address', savedClient?.id]);

            const assignedContract = savedClient?.clientContracts?.find((c) =>
              c.contract?.name?.includes(contractType)
            );
            const assignedGroup = savedClient?.groupItems?.find(
              (g) => g.groupName
            );

            let message = `Mitarbeiter ${firstName} ${lastName} wurde erfolgreich erstellt.`;
            if (assignedContract) {
              message += ` Vertrag "${assignedContract.contract?.name}" wurde zugewiesen.`;
            } else if (contractType) {
              message += ` Vertrag "${contractType}" wurde zugewiesen.`;
            }
            if (assignedGroup) {
              message += ` Gruppe "${assignedGroup.groupName}" wurde zugewiesen.`;
            } else if (groupPath) {
              message += ` Gruppe aus Pfad "${groupPath}" wurde zugewiesen.`;
            }

            observer.next({
              id: call.id,
              success: true,
              result: {
                id: savedClient?.id,
                firstName: savedClient?.firstName,
                lastName: savedClient?.name,
                canton: canton || this.getCantonFromPostalCode(postalCode),
                country: country || 'Schweiz',
                contractAssigned: !!assignedContract || !!contractType,
                groupAssigned: !!assignedGroup || !!groupPath,
                message,
              },
            });
            observer.complete();
          };

          clientEditService.saveEditClient();

          setTimeout(() => {
            if (!clientEditService.lastSaveError()) {
              return;
            }
            observer.next({
              id: call.id,
              success: false,
              error:
                clientEditService.lastSaveErrorMessage() ||
                'Error saving client',
            });
            observer.complete();
          }, 5000);
        });
      }),
      catchError((error) =>
        of({
          id: call.id,
          success: false,
          error: error.message || 'Error creating client',
        })
      )
    );
  }

  private assignContractToClient(client: any, contractType: string): void {
    const contracts = this.dataManagementContractService.contracts;

    const matchingContract = contracts.find(
      (c) =>
        c.name?.toLowerCase().includes(contractType.toLowerCase()) ||
        contractType.toLowerCase().includes(c.name?.toLowerCase() || '')
    );

    if (matchingContract && matchingContract.id) {
      const newClientContract: any = new ClientContract();
      newClientContract.clientId = client.id || '';
      newClientContract.contractId = matchingContract.id;
      newClientContract.contract = matchingContract;
      newClientContract.fromDate = new Date();
      newClientContract.isActive = true;

      if (!client.clientContracts) {
        client.clientContracts = [];
      }
      client.clientContracts.push(newClientContract);
    }
  }

  private assignGroupToClient(client: any, groupPath: string): void {
    const flatNodeList = this.dataManagementGroupService.flatNodeList;

    const pathParts = groupPath.split('->').map((p) => p.trim().toLowerCase());
    const lastPart = pathParts[pathParts.length - 1];

    let matchingGroup = flatNodeList.find(
      (g) => g.name?.toLowerCase() === lastPart
    );

    if (!matchingGroup) {
      matchingGroup = flatNodeList.find(
        (g) =>
          g.name?.toLowerCase().includes(lastPart) ||
          lastPart.includes(g.name?.toLowerCase() || '')
      );
    }

    if (matchingGroup) {
      const newGroupItem = new ClientGroupItem();
      newGroupItem.clientId = client.id || '';
      newGroupItem.groupId = matchingGroup.id;
      newGroupItem.groupName = matchingGroup.name;
      newGroupItem.validFrom = new Date();

      if (!client.groupItems) {
        client.groupItems = [];
      }
      client.groupItems.push(newGroupItem);
    }
  }

  private getCantonFromPostalCode(postalCode: string): string {
    if (!postalCode) return '';
    const plz = parseInt(postalCode, 10);
    if (isNaN(plz)) return '';

    if (plz >= 1000 && plz < 2000) return 'VD';
    if (plz >= 2000 && plz < 3000) return 'NE';
    if (plz >= 3000 && plz < 4000) return 'BE';
    if (plz >= 4000 && plz < 5000) return 'BS';
    if (plz >= 5000 && plz < 6000) return 'AG';
    if (plz >= 6000 && plz < 7000) return 'LU';
    if (plz >= 7000 && plz < 8000) return 'GR';
    if (plz >= 8000 && plz < 9000) return 'ZH';
    if (plz >= 9000 && plz < 10000) return 'SG';

    return '';
  }

  private getCountryAbbreviation(country: string): string {
    if (!country) return 'CH';

    const countryLower = country.toLowerCase().trim();

    const countryMap: Record<string, string> = {
      schweiz: 'CH',
      switzerland: 'CH',
      suisse: 'CH',
      svizzera: 'CH',
      ch: 'CH',
      deutschland: 'DE',
      germany: 'DE',
      de: 'DE',
      österreich: 'AT',
      oesterreich: 'AT',
      austria: 'AT',
      at: 'AT',
      frankreich: 'FR',
      france: 'FR',
      fr: 'FR',
      italien: 'IT',
      italy: 'IT',
      italia: 'IT',
      it: 'IT',
      liechtenstein: 'LI',
      li: 'LI',
    };

    return countryMap[countryLower] || country.toUpperCase().substring(0, 2);
  }

  private parseGender(gender: string): number {
    switch (gender?.toLowerCase()) {
      case 'male':
        return 1;
      case 'female':
        return 0;
      case 'intersexuality':
        return 2;
      case 'legalentity':
        return 3;
      default:
        return 1;
    }
  }
}

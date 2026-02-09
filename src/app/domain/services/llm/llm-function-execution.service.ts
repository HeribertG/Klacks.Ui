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
} from '../../models/client/client-class';
import { ITruncatedShift, ShiftFilter } from '../../models/shift/shift-data-class';
import { GroupFilter, ITruncatedGroup } from '../../models/group/group-class';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { SearchStrategyService } from 'src/app/presentation/search/search-strategy.service';
import { DataManagementContractService } from '../contract/data-management-contract.service';
import { DataManagementGroupService } from '../group/data-management-group.service';
import { ClientGroupItem } from '../../models/client/client-group-item-class';

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
      case 'get_current_user':
      case 'get_user_context':
        return this.executeGetCurrentUser(functionCall);
      case 'getUserPermissions':
      case 'get_user_permissions':
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

      // UI-Aktionen: Settings General
      case 'get_general_settings':
      case 'settings_general_read':
        return this.executeSettingsGeneralRead(functionCall);
      case 'update_general_settings':
      case 'settings_general_update':
        return this.executeSettingsGeneralUpdate(functionCall);

      // UI-Aktionen: Owner Address
      case 'get_owner_address':
        return this.executeOwnerAddressRead(functionCall);
      case 'update_owner_address':
        return this.executeOwnerAddressUpdate(functionCall);

      // Backend-Validation
      case 'validate_address':
        return this.executeBackendFunction(functionCall);

      // UI-Aktionen: User Administration
      case 'create_system_user':
        return this.executeCreateSystemUser(functionCall);
      case 'delete_system_user':
        return this.executeDeleteSystemUser(functionCall);
      case 'list_system_users':
        return this.executeListSystemUsers(functionCall);

      // UI-Aktionen: Branches
      case 'create_branch':
        return this.executeCreateBranch(functionCall);
      case 'delete_branch':
        return this.executeDeleteBranch(functionCall);
      case 'list_branches':
        return this.executeListBranches(functionCall);

      // UI-Aktionen: Group Scope
      case 'set_user_group_scope':
        return this.executeSetUserGroupScope(functionCall);

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
      const token = localStorage.getItem('JWT_TOKEN');
      if (!token) {
        throw new Error('User not authenticated');
      }

      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));

      return of({
        id: call.id,
        success: true,
        result: {
          userId: decoded.sub || decoded.nameid,
          userName: decoded.unique_name || decoded.name,
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
      const isAdmin = localStorage.getItem('JWT_TOKEN_ADMIN') === 'true';
      const isAuthorised = localStorage.getItem('JWT_AUTHORISED') === 'true';

      const roles: string[] = [];
      if (isAdmin) roles.push('Admin');
      if (isAuthorised) roles.push('Authorised');

      return of({
        id: call.id,
        success: true,
        result: {
          roles,
          isAdmin,
          isAuthorised,
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

  private waitForElement(id: string, maxWaitMs = 3000): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
      const existing = document.getElementById(id);
      if (existing) {
        resolve(existing);
        return;
      }
      const interval = 200;
      let elapsed = 0;
      const timer = setInterval(() => {
        elapsed += interval;
        const el = document.getElementById(id);
        if (el) {
          clearInterval(timer);
          resolve(el);
        } else if (elapsed >= maxWaitMs) {
          clearInterval(timer);
          resolve(null);
        }
      }, interval);
    });
  }

  private executeSettingsGeneralRead(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    return from(this.doSettingsGeneralRead(call));
  }

  private async doSettingsGeneralRead(call: ILLMFunctionCall): Promise<ILLMFunctionResult> {
    document.getElementById('open-settings')?.click();
    const input = await this.waitForElement('setting-general-name') as HTMLInputElement;
    if (!input) {
      return { id: call.id, success: false, error: 'Settings page not loaded' };
    }
    const appName = input.value;
    return {
      id: call.id,
      success: true,
      result: { appName, message: `Der aktuelle App-Name ist "${appName}"` },
    };
  }

  private executeSettingsGeneralUpdate(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    const { appName } = call.arguments;
    if (!appName) {
      return of({ id: call.id, success: false, error: 'appName parameter is required' });
    }
    return from(this.doSettingsGeneralUpdate(call, appName));
  }

  private async doSettingsGeneralUpdate(call: ILLMFunctionCall, appName: string): Promise<ILLMFunctionResult> {
    document.getElementById('open-settings')?.click();
    const input = await this.waitForElement('setting-general-name') as HTMLInputElement;
    if (!input) {
      return { id: call.id, success: false, error: 'Settings page not loaded' };
    }
    const previousName = input.value;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;
    nativeInputValueSetter?.call(input, appName);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return {
      id: call.id,
      success: true,
      result: { previousName, newName: appName, message: `App-Name wurde von "${previousName}" auf "${appName}" geändert` },
    };
  }

  private executeOwnerAddressRead(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    return from(this.doOwnerAddressRead(call));
  }

  private async doOwnerAddressRead(call: ILLMFunctionCall): Promise<ILLMFunctionResult> {
    document.getElementById('open-settings')?.click();
    const nameInput = await this.waitForElement('setting-owner-address-name', 5000) as HTMLInputElement;
    if (!nameInput) {
      return { id: call.id, success: false, error: 'Owner address form not loaded' };
    }
    await new Promise(resolve => setTimeout(resolve, 2000));

    const getValue = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement)?.value || '';
    const address = {
      addressName: getValue('setting-owner-address-name'),
      phone: getValue('setting-owner-address-tel'),
      supplementAddress: getValue('setting-owner-address-supplement'),
      email: getValue('setting-owner-address-email'),
      street: getValue('setting-owner-address-street'),
      zip: getValue('setting-owner-address-zip'),
      city: getValue('setting-owner-address-city'),
      country: getValue('setting-owner-address-country'),
      state: getValue('setting-owner-address-state'),
    };

    return {
      id: call.id,
      success: true,
      result: address,
    };
  }

  private executeOwnerAddressUpdate(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    return from(this.doOwnerAddressUpdate(call));
  }

  private async doOwnerAddressUpdate(call: ILLMFunctionCall): Promise<ILLMFunctionResult> {
    const args = call.arguments;

    document.getElementById('open-settings')?.click();
    const nameInput = await this.waitForElement('setting-owner-address-name', 5000) as HTMLInputElement;
    if (!nameInput) {
      return { id: call.id, success: false, error: 'Owner address form not loaded' };
    }
    await new Promise(resolve => setTimeout(resolve, 2000));

    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;

    const setInput = (id: string, value: string | undefined) => {
      if (!value) return;
      const input = document.getElementById(id) as HTMLInputElement;
      if (!input) return;
      nativeSetter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const setSelect = (id: string, value: string | undefined) => {
      if (!value) return;
      const select = document.getElementById(id) as HTMLSelectElement;
      if (!select) return;
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    };

    setInput('setting-owner-address-name', args['addressName']);
    setInput('setting-owner-address-tel', args['phone']);
    setInput('setting-owner-address-supplement', args['supplementAddress']);
    setInput('setting-owner-address-email', args['email']);
    setInput('setting-owner-address-street', args['street']);
    setInput('setting-owner-address-zip', args['zip']);
    setInput('setting-owner-address-city', args['city']);

    if (args['country']) {
      setSelect('setting-owner-address-country', args['country']);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (args['state']) {
      setSelect('setting-owner-address-state', args['state']);
    }

    return {
      id: call.id,
      success: true,
      result: { message: 'Firmenadresse wurde in der Maske aktualisiert' },
    };
  }

  private executeCreateSystemUser(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    return from(this.doCreateSystemUser(call));
  }

  private async doCreateSystemUser(call: ILLMFunctionCall): Promise<ILLMFunctionResult> {
    const { firstName, lastName, email } = call.arguments;

    let userAdminSection = document.getElementById('settings-user-administration');
    if (!userAdminSection) {
      document.getElementById('open-settings')?.click();
      userAdminSection = await this.waitForElement('settings-user-administration', 5000);
      if (!userAdminSection) {
        return { id: call.id, success: false, error: 'User administration section not loaded' };
      }
    }
    userAdminSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    document.getElementById('user-admin-add-user-btn')?.click();
    await new Promise(resolve => setTimeout(resolve, 1500));

    const modalForm = document.getElementById('user-admin-modal-form');
    if (!modalForm) {
      return { id: call.id, success: false, error: 'User creation modal did not open' };
    }

    const userAdminEl = document.querySelector('app-user-administration');
    const ngGetComponent = (window as any).ng?.getComponent;
    const component = ngGetComponent ? ngGetComponent(userAdminEl) : null;

    if (component?.formModel) {
      component.formModel.set({ firstName, lastName, userName: '', email });
      component.onNameChange();
    } else {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set;

      const setAngularInput = (id: string, value: string) => {
        const input = document.getElementById(id) as HTMLInputElement;
        if (!input) return;
        input.focus();
        nativeSetter?.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      setAngularInput('user-firstname', firstName);
      await new Promise(resolve => setTimeout(resolve, 500));
      setAngularInput('user-name', lastName);
      await new Promise(resolve => setTimeout(resolve, 500));
      document.getElementById('user-firstname')?.dispatchEvent(new FocusEvent('blur'));
      document.getElementById('user-name')?.dispatchEvent(new FocusEvent('blur'));
      setAngularInput('setting-user-email', email);
    }

    let username = '';
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const el = document.getElementById('user-userName') as HTMLInputElement;
      username = el?.value || '';
      if (username) break;
    }

    const saveBtn = document.getElementById('user-admin-modal-save-btn') as HTMLButtonElement;
    if (!saveBtn || saveBtn.disabled) {
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (saveBtn && !saveBtn.disabled) break;
      }
    }

    if (saveBtn?.disabled) {
      return {
        id: call.id,
        success: false,
        error: `Form not valid. Username: '${username}', formModel may not have synced.`,
      };
    }

    saveBtn?.click();

    let userId = '';
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const nameInputs = document.querySelectorAll('input[id^="user-admin-row-name-"]');
      const fullName = `${firstName} ${lastName}`;
      for (const input of Array.from(nameInputs)) {
        const value = (input as HTMLInputElement).value;
        if (value.toLowerCase().includes(fullName.toLowerCase())) {
          userId = input.id.replace('user-admin-row-name-', '');
          break;
        }
      }
      if (userId) break;
    }

    if (!userId) {
      return {
        id: call.id,
        success: false,
        error: `Benutzer '${firstName} ${lastName}' konnte nicht erstellt werden. Username: '${username}'`,
      };
    }

    return {
      id: call.id,
      success: true,
      result: {
        userId,
        username: username || '',
        firstName,
        lastName,
        email,
        message: `Benutzer '${firstName} ${lastName}' wurde erfolgreich erstellt. User-ID: ${userId}`,
      },
    };
  }

  private executeDeleteSystemUser(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    return from(this.doDeleteSystemUser(call));
  }

  private async doDeleteSystemUser(call: ILLMFunctionCall): Promise<ILLMFunctionResult> {
    const { userId } = call.arguments;

    for (let i = 0; i < 10; i++) {
      const backdrop = document.querySelector('ngb-modal-backdrop, .modal-backdrop');
      if (!backdrop) break;
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    document.getElementById('open-settings')?.click();
    const userAdminSection = await this.waitForElement('settings-user-administration', 8000);
    if (!userAdminSection) {
      return { id: call.id, success: false, error: 'User administration section not loaded' };
    }
    userAdminSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 1500));

    let deleteBtn: HTMLElement | null = null;
    for (let i = 0; i < 20; i++) {
      deleteBtn = document.getElementById(`user-admin-row-delete-${userId}`);
      if (deleteBtn) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!deleteBtn) {
      return { id: call.id, success: false, error: `Delete button for user ${userId} not found. Available rows: ${Array.from(document.querySelectorAll('input[id^="user-admin-row-name-"]')).map(e => e.id).join(', ')}` };
    }
    deleteBtn.click();

    let confirmBtn: HTMLElement | null = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      confirmBtn = document.getElementById('modal-delete-confirm');
      if (confirmBtn) break;
    }
    if (!confirmBtn) {
      return { id: call.id, success: false, error: 'Delete confirmation modal not found after 6s' };
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    confirmBtn.click();

    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const stillExists = document.getElementById(`user-admin-row-name-${userId}`);
      if (!stillExists) {
        return {
          id: call.id,
          success: true,
          result: { userId, message: `Benutzer mit ID ${userId} wurde erfolgreich gelöscht.` },
        };
      }
    }

    return { id: call.id, success: false, error: `User ${userId} still exists after deletion (10s timeout)` };
  }

  private executeListSystemUsers(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    return from(this.doListSystemUsers(call));
  }

  private async doListSystemUsers(call: ILLMFunctionCall): Promise<ILLMFunctionResult> {
    let userAdminSection = document.getElementById('settings-user-administration');
    if (!userAdminSection) {
      document.getElementById('open-settings')?.click();
      userAdminSection = await this.waitForElement('settings-user-administration', 5000);
      if (!userAdminSection) {
        return { id: call.id, success: false, error: 'User administration section not loaded' };
      }
    }
    userAdminSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const nameInputs = document.querySelectorAll('input[id^="user-admin-row-name-"]');
    const users: { id: string; name: string; email: string }[] = [];

    for (const input of Array.from(nameInputs)) {
      const inputId = input.id;
      const userId = inputId.replace('user-admin-row-name-', '');
      const name = (input as HTMLInputElement).value;
      const emailInput = document.getElementById(`user-admin-row-email-${userId}`) as HTMLInputElement;
      const email = emailInput?.value || '';
      users.push({ id: userId, name, email });
    }

    const userList = users.map(u => `- ${u.name} (${u.email})`).join('\n');

    return {
      id: call.id,
      success: true,
      result: { users, count: users.length, message: `${users.length} Benutzer gefunden:\n${userList}` },
    };
  }

  private executeCreateBranch(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    return from(this.doCreateBranch(call));
  }

  private async doCreateBranch(call: ILLMFunctionCall): Promise<ILLMFunctionResult> {
    const { name, address, phone, email } = call.arguments;

    let branchHeader = document.getElementById('branches-table-header');
    if (!branchHeader) {
      document.getElementById('open-settings')?.click();
      branchHeader = await this.waitForElement('branches-table-header', 5000);
      if (!branchHeader) {
        return { id: call.id, success: false, error: 'Branch section not loaded' };
      }
    }

    const addBtn = document.getElementById('settings-list-add-btn');
    if (!addBtn) {
      return { id: call.id, success: false, error: 'Add branch button not found' };
    }
    addBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 500));

    addBtn.click();

    let modalName: HTMLInputElement | null = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      modalName = document.getElementById('branches-modal-name') as HTMLInputElement;
      if (modalName) break;
    }
    if (!modalName) {
      return { id: call.id, success: false, error: 'Branch modal did not open' };
    }

    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;

    const setInput = (id: string, value: string) => {
      if (!value) return;
      const input = document.getElementById(id) as HTMLInputElement;
      if (!input) return;
      nativeSetter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    setInput('branches-modal-name', name);
    setInput('branches-modal-address', address);
    if (phone) setInput('branches-modal-phone', phone);
    if (email) setInput('branches-modal-email', email);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const saveBtn = document.getElementById('branches-modal-save-btn');
    if (!saveBtn) {
      return { id: call.id, success: false, error: 'Save button not found in branch modal' };
    }
    saveBtn.click();

    let branchId = '';
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const nameInputs = document.querySelectorAll('input[id^="branches-row-name-"]');
      for (const input of Array.from(nameInputs)) {
        const value = (input as HTMLInputElement).value;
        if (value.toLowerCase().includes(name.toLowerCase())) {
          branchId = input.id.replace('branches-row-name-', '');
          break;
        }
      }
      if (branchId) break;
    }

    return {
      id: call.id,
      success: true,
      result: {
        branchId,
        name,
        address,
        phone: phone || '',
        email: email || '',
        message: `Filiale "${name}" wurde erfolgreich erstellt.${branchId ? ` ID: ${branchId}` : ''}`,
      },
    };
  }

  private executeDeleteBranch(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    return from(this.doDeleteBranch(call));
  }

  private async doDeleteBranch(call: ILLMFunctionCall): Promise<ILLMFunctionResult> {
    const { branchId } = call.arguments;

    for (let i = 0; i < 10; i++) {
      const backdrop = document.querySelector('ngb-modal-backdrop, .modal-backdrop');
      if (!backdrop) break;
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    let branchHeader = document.getElementById('branches-table-header');
    if (!branchHeader) {
      document.getElementById('open-settings')?.click();
      branchHeader = await this.waitForElement('branches-table-header', 5000);
      if (!branchHeader) {
        return { id: call.id, success: false, error: 'Branch section not loaded' };
      }
    }
    branchHeader.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 500));

    let deleteBtn: HTMLElement | null = null;
    for (let i = 0; i < 10; i++) {
      deleteBtn = document.getElementById(`branches-row-delete-${branchId}`);
      if (deleteBtn) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!deleteBtn) {
      return { id: call.id, success: false, error: `Delete button for branch ${branchId} not found` };
    }
    deleteBtn.click();

    let confirmBtn: HTMLElement | null = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      confirmBtn = document.getElementById('modal-delete-confirm');
      if (confirmBtn) break;
    }
    if (!confirmBtn) {
      return { id: call.id, success: false, error: 'Delete confirmation modal not found after 6s' };
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    confirmBtn.click();

    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const stillExists = document.getElementById(`branches-row-name-${branchId}`);
      if (!stillExists) {
        return {
          id: call.id,
          success: true,
          result: { branchId, message: `Filiale mit ID ${branchId} wurde erfolgreich gelöscht.` },
        };
      }
    }

    return { id: call.id, success: false, error: `Branch ${branchId} still exists after deletion (10s timeout)` };
  }

  private executeListBranches(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    return from(this.doListBranches(call));
  }

  private async doListBranches(call: ILLMFunctionCall): Promise<ILLMFunctionResult> {
    let branchHeader = document.getElementById('branches-table-header');
    if (!branchHeader) {
      document.getElementById('open-settings')?.click();
      branchHeader = await this.waitForElement('branches-table-header', 5000);
      if (!branchHeader) {
        return { id: call.id, success: false, error: 'Branch section not loaded' };
      }
    }
    branchHeader.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const nameInputs = document.querySelectorAll('input[id^="branches-row-name-"]');
    const branches: { id: string; name: string }[] = [];

    for (const input of Array.from(nameInputs)) {
      const inputId = input.id;
      const branchId = inputId.replace('branches-row-name-', '');
      const name = (input as HTMLInputElement).value;
      branches.push({ id: branchId, name });
    }

    const branchList = branches.map(b => `- ${b.name} (ID: ${b.id})`).join('\n');

    return {
      id: call.id,
      success: true,
      result: { branches, count: branches.length, message: `${branches.length} Filialen gefunden:\n${branchList}` },
    };
  }

  private executeSetUserGroupScope(
    call: ILLMFunctionCall
  ): Observable<ILLMFunctionResult> {
    return from(this.doSetUserGroupScope(call));
  }

  private async doSetUserGroupScope(call: ILLMFunctionCall): Promise<ILLMFunctionResult> {
    const { userId, groupNames } = call.arguments;

    document.getElementById('open-settings')?.click();
    const groupScopeSection = await this.waitForElement('settings-group-scope', 5000);
    if (!groupScopeSection) {
      return { id: call.id, success: false, error: 'Group scope section not loaded' };
    }
    groupScopeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const countBtnId = `group-scope-row-count-btn-${userId}`;
    const countBtn = await this.waitForElement(countBtnId, 3000);
    if (!countBtn) {
      return { id: call.id, success: false, error: `User with ID ${userId} not found in group scope list` };
    }
    countBtn.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    const requestedGroups = groupNames.split(',').map((g: string) => g.trim());
    const assignedGroups: string[] = [];

    const allLabels = document.querySelectorAll('[id^="group-scope-modal-group-label-"]');
    for (const label of Array.from(allLabels)) {
      const labelText = label.textContent?.trim() || '';
      for (const groupName of requestedGroups) {
        if (labelText.toLowerCase() === groupName.toLowerCase()) {
          const groupId = label.id.replace('group-scope-modal-group-label-', '');
          const checkbox = document.getElementById(`group-${groupId}`) as HTMLInputElement;
          if (checkbox && !checkbox.checked) {
            checkbox.click();
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          assignedGroups.push(labelText);
        }
      }
    }

    if (assignedGroups.length === 0) {
      return {
        id: call.id,
        success: false,
        error: `None of the requested groups found: ${groupNames}`,
      };
    }

    document.getElementById('group-scope-modal-save-btn')?.click();
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      id: call.id,
      success: true,
      result: {
        userId,
        assignedGroups,
        message: `Group scope für Benutzer wurde gesetzt auf: ${assignedGroups.join(', ')}`,
      },
    };
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

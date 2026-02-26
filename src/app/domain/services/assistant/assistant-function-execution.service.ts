// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  IAssistantFunctionCall,
  IAssistantFunctionResult,
} from '../../interfaces/assistant-function-definitions.interface';
import { AssistantExecutionDataService } from './assistant-execution-data.service';
import { AssistantExecutionUserAdminService } from './assistant-execution-user-admin.service';
import { AssistantExecutionMacroService } from './assistant-execution-macro.service';
import { Router } from '@angular/router';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { SEARCH_STRATEGY, ISearchStrategy } from '../../interfaces/search-strategy.interface';
import { environment } from 'src/environments/environment';

@Injectable()
export class AssistantFunctionExecutionService {
  private httpClient = inject(HttpClient);
  private router = inject(Router);
  private searchStateService = inject(SearchStateService);
  private searchStrategyService = inject<ISearchStrategy>(SEARCH_STRATEGY);
  private dataService = inject(AssistantExecutionDataService);
  private userAdminService = inject(AssistantExecutionUserAdminService);
  private macroService = inject(AssistantExecutionMacroService);
  private readonly apiBaseUrl = environment.baseUrl;

  executeFunction(
    functionCall: IAssistantFunctionCall
  ): Observable<IAssistantFunctionResult> {
    switch (functionCall.name) {
      case 'navigateToPage':
      case 'navigate_to':
      case 'navigate_to_page':
        return this.executeNavigate(functionCall);
      case 'navigateToEntity':
        return this.executeNavigateToEntity(functionCall);
      case 'searchAndNavigate':
        return this.executeSearchAndNavigate(functionCall);
      case 'openDialog':
        return this.executeBackendFunction(functionCall);

      case 'fillForm':
        return this.dataService.executeFillForm(functionCall);
      case 'submitForm':
        return this.dataService.executeSubmitForm(functionCall);
      case 'searchData':
        return this.dataService.executeSearchData(functionCall);
      case 'getData':
        return this.dataService.executeGetData(functionCall);
      case 'createEntity':
        return this.dataService.executeCreateEntity(functionCall);
      case 'updateEntity':
        return this.dataService.executeUpdateEntity(functionCall);
      case 'getCurrentUser':
      case 'get_current_user':
      case 'get_user_context':
        return this.dataService.executeGetCurrentUser(functionCall);
      case 'getUserPermissions':
      case 'get_user_permissions':
        return this.dataService.executeGetUserPermissions(functionCall);

      case 'create_employee':
      case 'create_client':
      case 'search_employees':
      case 'search_clients':
      case 'create_contract':
      case 'get_system_info':
      case 'validate_address':
      case 'validate_calendar_rule':
      case 'get_general_settings':
      case 'settings_general_read':
      case 'update_general_settings':
      case 'settings_general_update':
      case 'get_owner_address':
      case 'update_owner_address':
        return this.executeBackendFunction(functionCall);

      case 'create_system_user':
        return this.userAdminService.executeCreateSystemUser(functionCall);
      case 'delete_system_user':
        return this.userAdminService.executeDeleteSystemUser(functionCall);
      case 'list_system_users':
        return this.userAdminService.executeListSystemUsers(functionCall);
      case 'set_user_group_scope':
        return this.userAdminService.executeSetUserGroupScope(functionCall);

      case 'create_branch':
      case 'delete_branch':
      case 'list_branches':
        return this.executeBackendFunction(functionCall);

      case 'create_macro':
        return this.macroService.executeCreateMacro(functionCall);
      case 'delete_macro':
        return this.macroService.executeDeleteMacro(functionCall);
      case 'list_macros':
        return this.macroService.executeListMacros(functionCall);

      default:
        return of({
          id: functionCall.id,
          success: false,
          error: `Function ${functionCall.name} not implemented`,
        });
    }
  }

  executeFunctions(
    functionCalls: IAssistantFunctionCall[]
  ): Observable<IAssistantFunctionResult[]> {
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

  private executeNavigate(
    call: IAssistantFunctionCall
  ): Observable<IAssistantFunctionResult> {
    try {
      const route = call.arguments['route'] || call.arguments['Route']
        || `/workplace/${(call.arguments['page'] || 'dashboard').toLowerCase()}`;
      this.router.navigate([route], { queryParams: call.arguments['params'] });
      return of({
        id: call.id,
        success: true,
        result: { action: 'navigated', navigated: true, route },
      });
    } catch (error: any) {
      return of({ id: call.id, success: false, error: error.message });
    }
  }

  private executeNavigateToEntity(
    call: IAssistantFunctionCall
  ): Observable<IAssistantFunctionResult> {
    try {
      const { entityType, entityId, action } = call.arguments;
      const routeMap: Record<string, string> = {
        client: action === 'edit' || !action ? `/workplace/edit-address/${entityId}` : '/workplace/client',
        group: action === 'edit' || !action ? `/workplace/edit-group/${entityId}` : '/workplace/group',
        shift: action === 'cut' ? `/workplace/cut-shift/${entityId}` : `/workplace/edit-shift/${entityId}`,
        'container-template': `/workplace/container-template/${entityId}`,
      };
      const route = routeMap[entityType];
      if (!route) {
        return of({ id: call.id, success: false, error: `Unknown entity type: ${entityType}` });
      }
      this.router.navigate([route]);
      return of({
        id: call.id,
        success: true,
        result: { action: 'navigated', navigated: true, route, entityType, entityId },
      });
    } catch (error: any) {
      return of({ id: call.id, success: false, error: error.message });
    }
  }

  private executeSearchAndNavigate(
    call: IAssistantFunctionCall
  ): Observable<IAssistantFunctionResult> {
    const { entityType, searchQuery } = call.arguments;
    const routeMap: Record<string, string> = {
      client: '/workplace/client',
      shift: '/workplace/shift',
      group: '/workplace/group',
    };
    const route = routeMap[entityType];
    if (!route) {
      return of({ id: call.id, success: false, error: `Unknown entity type: ${entityType}` });
    }
    const isClient = entityType === 'client';
    const isShift = entityType === 'shift';
    this.searchStateService.setRestoreSearch(searchQuery);
    this.router.navigate([route]).then(() => {
      setTimeout(() => {
        this.searchStrategyService.globalSearch(searchQuery, isClient, isShift);
      }, 500);
    });
    return of({
      id: call.id,
      success: true,
      result: {
        action: 'navigated_with_search',
        route,
        searchQuery,
        message: `Navigated to ${entityType} and searching for "${searchQuery}"`,
      },
    });
  }

  private executeBackendFunction(
    call: IAssistantFunctionCall
  ): Observable<IAssistantFunctionResult> {
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
}

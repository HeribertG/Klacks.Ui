/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  IAssistantFunctionCall,
  IAssistantFunctionResult,
} from '../../interfaces/assistant-function-definitions.interface';
import { AssistantFunctionRegistryService } from './assistant-function-registry.service';
import { AssistantExecutionNavigationService } from './assistant-execution-navigation.service';
import { AssistantExecutionDataService } from './assistant-execution-data.service';
import { AssistantExecutionSettingsService } from './assistant-execution-settings.service';
import { AssistantExecutionUserAdminService } from './assistant-execution-user-admin.service';
import { AssistantExecutionBranchService } from './assistant-execution-branch.service';
import { AssistantExecutionMacroService } from './assistant-execution-macro.service';
import { AssistantExecutionClientService } from './assistant-execution-client.service';
import { environment } from 'src/environments/environment';

@Injectable()
export class AssistantFunctionExecutionService {
  private httpClient = inject(HttpClient);
  private functionRegistry = inject(AssistantFunctionRegistryService);
  private navigationService = inject(AssistantExecutionNavigationService);
  private dataService = inject(AssistantExecutionDataService);
  private settingsService = inject(AssistantExecutionSettingsService);
  private userAdminService = inject(AssistantExecutionUserAdminService);
  private branchService = inject(AssistantExecutionBranchService);
  private macroService = inject(AssistantExecutionMacroService);
  private clientService = inject(AssistantExecutionClientService);
  private readonly apiBaseUrl = environment.baseUrl;

  executeFunction(
    functionCall: IAssistantFunctionCall
  ): Observable<IAssistantFunctionResult> {
    switch (functionCall.name) {
      case 'navigateToPage':
        return this.navigationService.executeNavigateToPage(functionCall);
      case 'navigateToEntity':
        return this.navigationService.executeNavigateToEntity(functionCall);
      case 'openDialog':
        return this.navigationService.executeOpenDialog(functionCall);
      case 'navigate_to':
      case 'navigate_to_page':
        return this.navigationService.executeNavigateToPageLegacy(functionCall);
      case 'searchAndNavigate':
        return this.navigationService.executeSearchAndNavigate(functionCall);

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
        return this.clientService.executeCreateClient(functionCall);

      case 'search_employees':
      case 'search_clients':
      case 'create_contract':
      case 'get_system_info':
      case 'validate_address':
      case 'validate_calendar_rule':
        return this.executeBackendFunction(functionCall);

      case 'get_general_settings':
      case 'settings_general_read':
        return this.settingsService.executeSettingsGeneralRead(functionCall);
      case 'update_general_settings':
      case 'settings_general_update':
        return this.settingsService.executeSettingsGeneralUpdate(functionCall);
      case 'get_owner_address':
        return this.settingsService.executeOwnerAddressRead(functionCall);
      case 'update_owner_address':
        return this.settingsService.executeOwnerAddressUpdate(functionCall);

      case 'create_system_user':
        return this.userAdminService.executeCreateSystemUser(functionCall);
      case 'delete_system_user':
        return this.userAdminService.executeDeleteSystemUser(functionCall);
      case 'list_system_users':
        return this.userAdminService.executeListSystemUsers(functionCall);
      case 'set_user_group_scope':
        return this.userAdminService.executeSetUserGroupScope(functionCall);

      case 'create_branch':
        return this.branchService.executeCreateBranch(functionCall);
      case 'delete_branch':
        return this.branchService.executeDeleteBranch(functionCall);
      case 'list_branches':
        return this.branchService.executeListBranches(functionCall);

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

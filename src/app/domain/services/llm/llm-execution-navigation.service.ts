/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { ILLMFunctionCall, ILLMFunctionResult } from '../../interfaces/llm-function-definitions.interface';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { SearchStrategyService } from 'src/app/presentation/search/search-strategy.service';

@Injectable()
export class LlmExecutionNavigationService {
  private router = inject(Router);
  private searchStateService = inject(SearchStateService);
  private searchStrategyService = inject(SearchStrategyService);

  executeNavigateToPage(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
    try {
      const { route, params } = call.arguments;
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

  executeNavigateToPageLegacy(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
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
          route = '/workplace/client';
          break;
        case 'settings':
          route = '/workplace/settings';
          break;
        case 'calendar':
          route = '/workplace/schedule';
          break;
        case 'reports':
          route = '/workplace/dashboard';
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

  executeNavigateToEntity(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
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

  executeOpenDialog(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
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

  executeSearchAndNavigate(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
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
        message: `Navigated to clients and searching for "${searchQuery}"`,
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
        message: `Navigated to shifts and searching for "${searchQuery}"`,
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
        message: `Navigated to groups and searching for "${searchQuery}"`,
      },
    });
  }
}

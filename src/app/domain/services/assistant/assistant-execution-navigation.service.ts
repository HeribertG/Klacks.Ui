// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { IAssistantFunctionCall, IAssistantFunctionResult } from '../../interfaces/assistant-function-definitions.interface';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { SEARCH_STRATEGY, ISearchStrategy } from '../../interfaces/search-strategy.interface';

@Injectable()
export class AssistantExecutionNavigationService {
  private router = inject(Router);
  private searchStateService = inject(SearchStateService);
  private searchStrategyService = inject<ISearchStrategy>(SEARCH_STRATEGY);

  executeNavigateToPage(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
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

  executeNavigateToPageLegacy(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
    try {
      const { page, Route: backendRoute } = call.arguments;
      const route = backendRoute || `/workplace/${page?.toLowerCase() || 'dashboard'}`;

      this.router.navigate([route]);
      return of({
        id: call.id,
        success: true,
        result: { action: 'navigated', navigated: true, route, page },
      });
    } catch (error: any) {
      return of({
        id: call.id,
        success: false,
        error: error.message,
      });
    }
  }

  executeNavigateToEntity(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
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

  executeOpenDialog(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
    try {
      const { dialogType } = call.arguments;
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

  executeSearchAndNavigate(call: IAssistantFunctionCall): Observable<IAssistantFunctionResult> {
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
  ): Observable<IAssistantFunctionResult> {
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
  ): Observable<IAssistantFunctionResult> {
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
  ): Observable<IAssistantFunctionResult> {
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

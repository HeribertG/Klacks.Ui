// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, from, Observable, of } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import {
  IAssistantFunctionCall,
  IAssistantFunctionResult,
} from '../../interfaces/assistant-function-definitions.interface';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { KLACKSY_PAGE_KEYS_BY_KEY } from 'src/app/domain/constants/klacksy-page-keys';
import { KlacksyNavigationService } from 'src/app/domain/services/klacksy/klacksy-navigation.service';

@Injectable()
export class AssistantFunctionExecutionService {
  private httpClient = inject(HttpClient);
  private router = inject(Router);
  private readonly klacksyNavigation = inject(KlacksyNavigationService);
  private readonly apiBaseUrl = environment.baseUrl;

  executeFunction(
    functionCall: IAssistantFunctionCall
  ): Observable<IAssistantFunctionResult> {
    switch (functionCall.name) {
      case 'navigateToPage':
      case 'navigate_to':
      case 'navigate_to_page':
        return this.executeNavigate(functionCall);
      default:
        return this.executeBackendFunction(functionCall);
    }
  }

  private static readonly ALLOWED_ROUTE_PREFIX = '/workplace/';

  private executeNavigate(
    call: IAssistantFunctionCall
  ): Observable<IAssistantFunctionResult> {
    try {
      const page = ((call.arguments['page'] as string) || 'dashboard').toLowerCase();
      const entityId = call.arguments['entityId'] as string;
      const scrollTarget = (call.arguments['target'] as string) || (call.arguments['Target'] as string) || undefined;
      const pageEntry = KLACKSY_PAGE_KEYS_BY_KEY.get(page);

      let route =
        call.arguments['route'] as string ||
        call.arguments['Route'] as string ||
        pageEntry?.route ||
        `/workplace/${page}`;

      let queryParams = (call.arguments['params'] as Record<string, unknown>) || {};
      const queryIndex = route.indexOf('?');
      if (queryIndex >= 0) {
        const parsed = Object.fromEntries(new URLSearchParams(route.substring(queryIndex + 1)));
        queryParams = { ...parsed, ...queryParams };
        route = route.substring(0, queryIndex);
      }

      if (entityId && (pageEntry?.hasEntityParam ?? true)) {
        route += `/${entityId}`;
      }

      if (!route.startsWith(AssistantFunctionExecutionService.ALLOWED_ROUTE_PREFIX)) {
        return of({ id: call.id, success: false, error: 'Navigation target not allowed' });
      }

      const queryString = new URLSearchParams(
        Object.entries(queryParams).map(([key, value]) => [key, String(value)])
      ).toString();
      const url = queryString ? `${route}?${queryString}` : route;
      return from(
        this.klacksyNavigation.navigateAndScroll(url, scrollTarget).then((navResult) => ({
          id: call.id,
          success: navResult.success,
          result: { action: 'navigated', navigated: navResult.success, route },
          error: navResult.success ? undefined : navResult.reason,
        }))
      );
    } catch (error: any) {
      return of({ id: call.id, success: false, error: error.message });
    }
  }

  executeFunctionsBatch(
    calls: IAssistantFunctionCall[]
  ): Promise<IAssistantFunctionResult[]> {
    const requests = calls.map(call => ({
      functionName: call.name,
      parameters: call.arguments,
    }));

    return firstValueFrom(
      this.httpClient
        .post<{ success: boolean; result?: any; error?: string; message?: string }[]>(
          `${this.apiBaseUrl}assistant/chat/execute-functions-batch`,
          requests
        )
        .pipe(
          retry(1),
          map((responses) =>
            responses.map((response, index) => ({
              id: calls[index].id,
              success: response.success,
              result: response.result,
              error: response.error,
            }))
          ),
          catchError(() =>
            of(
              calls.map(call => ({
                id: call.id,
                success: false,
                error: 'Batch function execution failed',
              }))
            )
          )
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

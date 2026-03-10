// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, of } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import {
  IAssistantFunctionCall,
  IAssistantFunctionResult,
} from '../../interfaces/assistant-function-definitions.interface';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Injectable()
export class AssistantFunctionExecutionService {
  private httpClient = inject(HttpClient);
  private router = inject(Router);
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

  private executeNavigate(
    call: IAssistantFunctionCall
  ): Observable<IAssistantFunctionResult> {
    try {
      const route =
        call.arguments['route'] ||
        call.arguments['Route'] ||
        `/workplace/${(call.arguments['page'] || 'dashboard').toLowerCase()}`;
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

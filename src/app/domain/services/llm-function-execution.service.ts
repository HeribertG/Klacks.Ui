/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  ILLMFunctionCall,
  ILLMFunctionResult,
} from '../models/llm-function-definitions.interface';
import { LLMFunctionRegistryService } from './llm-function-registry.service';
import { environment } from 'src/environments/environment';

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

    return this.httpClient
      .get(`${this.apiBaseUrl}${entity}/search`, {
        params: { q: query, ...filters },
      })
      .pipe(
        map((results) => ({
          id: call.id,
          success: true,
          result: results,
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

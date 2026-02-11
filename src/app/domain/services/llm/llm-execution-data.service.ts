/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ILLMFunctionCall, ILLMFunctionResult } from '../../interfaces/llm-function-definitions.interface';
import { environment } from 'src/environments/environment';
import { Filter, ITruncatedClient } from '../../models/client/client-class';
import { ITruncatedShift, ShiftFilter } from '../../models/shift/shift-data-class';
import { GroupFilter, ITruncatedGroup } from '../../models/group/group-class';

@Injectable()
export class LlmExecutionDataService {
  private httpClient = inject(HttpClient);
  private readonly apiBaseUrl = environment.baseUrl;

  executeFillForm(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
    try {
      const { formId, data } = call.arguments;
      const formElement = document.querySelector(formId) as HTMLFormElement;
      if (!formElement) {
        throw new Error(`Form ${formId} not found`);
      }

      Object.keys(data).forEach((fieldName) => {
        const field = formElement.elements.namedItem(fieldName) as HTMLInputElement;
        if (field) {
          field.value = data[fieldName];
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

  executeSubmitForm(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
    try {
      const { formId } = call.arguments;
      const formElement = document.querySelector(formId) as HTMLFormElement;
      if (!formElement) {
        throw new Error(`Form ${formId} not found`);
      }

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

  executeSearchData(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
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

  executeGetData(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
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

  executeCreateEntity(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
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

  executeUpdateEntity(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
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

  executeGetCurrentUser(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
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

  executeGetUserPermissions(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
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

  getClientTypeLabel(type: number | string): string {
    const typeNum = typeof type === 'string' ? parseInt(type, 10) : type;
    switch (typeNum) {
      case 0:
        return 'Employee';
      case 1:
        return 'External';
      case 2:
        return 'Customer';
      default:
        return 'Unknown';
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
}

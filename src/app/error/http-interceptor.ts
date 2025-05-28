/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { MessageLibrary } from '../helpers/string-constants';
import { catchError } from 'rxjs/operators';
import { DataManagementSwitchboardService } from '../data/management/data-management-switchboard.service';
import { ToastShowService } from '../toast/toast-show.service';
import { NavigationService } from '../services/navigation.service';

@Injectable()
export class ResponseInterceptor implements HttpInterceptor {
  private dataManagementSwitchboardService = inject(
    DataManagementSwitchboardService
  );
  private toastShowService = inject(ToastShowService);
  private navigationService = inject(NavigationService);

  private static readonly ERROR_PATTERNS = {
    POSTCODE: 'PostcodeCH',
    CHANGE_PASSWORD: 'Accounts/ChangePassword',
    REGISTER: 'Accounts/Register',
    DOWNLOAD_IMAGE: 'LoadFile/DownLoadImage',
    SIMPLE_IMAGE: 'LoadFile/GetSimpleImage',
    CLIENT_LIST: 'Clients/GetSimpleList',
    ABSENCES: 'Absences/',
    ASSIGNED_GROUPS: 'AssignedGroups/',
    BANK_DETAILS: 'Settings/BankDetails/',
    BREAKS: 'Breaks/',
    CALENDAR_RULES: 'Settings/CalendarRule/',
    CALENDAR_SELECTIONS: 'CalendarSelections/',
    SELECTED_CALENDARS: 'SelectedCalendars/',
    CLIENTS: 'Clients/',
    COUNTRIES: 'Countries/',
    STATES: 'States/',
    GROUPS: 'Groups/',
    LOAD_FILE: 'LoadFile/',
    MACROS: 'Settings/Macros/',
    WORKS: 'Works/',
    SHIFTS: 'Shifts/',
    SETTINGS: 'Settings/',
    ADDRESSES: 'Addresses/',
    COMMUNICATIONS: 'Communications/',
  };

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        this.resetUIState();
        return this.handleSpecificErrors(error, req);
      })
    );
  }

  private resetUIState(): void {
    this.dataManagementSwitchboardService.isDirty = false;
    this.dataManagementSwitchboardService.showProgressSpinner(false);
    this.dataManagementSwitchboardService.isSavedOrReset = false;
  }

  private handleSpecificErrors(
    error: HttpErrorResponse,
    req: HttpRequest<any>
  ): Observable<never> {
    const url = error.url || '';
    const method = req.method.toUpperCase();

    // PostcodeCH - erwarteter "Fehler"
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.POSTCODE)) {
      return throwError(() => error);
    }

    // Account-spezifische Errors
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.CHANGE_PASSWORD)) {
      return this.handlePasswordChangeError(error);
    }

    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.REGISTER)) {
      return this.handleRegistrationError(error);
    }

    // API-spezifische Errors für alle Endpunkte
    if (this.isApiError(url, method)) {
      return this.handleApiError(error, method, url);
    }

    // Legacy Image Loading Errors (für Rückwärtskompatibilität)
    if (this.isImageLoadingError(url, error.status)) {
      return this.handleImageLoadingError();
    }

    // Client List Error (spezifischer 500er)
    if (
      url.includes(ResponseInterceptor.ERROR_PATTERNS.CLIENT_LIST) &&
      error.status === 500
    ) {
      return this.handleClientListError();
    }

    // Validation Errors
    if (error.error?.errors) {
      return this.handleValidationErrors(error);
    }

    // Generic Error Handling
    return this.handleGenericError(error);
  }

  private isApiError(url: string, method: string): boolean {
    const isModifyingOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(
      method
    );

    const apiEndpoints = [
      ResponseInterceptor.ERROR_PATTERNS.ABSENCES,
      ResponseInterceptor.ERROR_PATTERNS.ASSIGNED_GROUPS,
      ResponseInterceptor.ERROR_PATTERNS.BANK_DETAILS,
      ResponseInterceptor.ERROR_PATTERNS.BREAKS,
      ResponseInterceptor.ERROR_PATTERNS.CALENDAR_RULES,
      ResponseInterceptor.ERROR_PATTERNS.CALENDAR_SELECTIONS,
      ResponseInterceptor.ERROR_PATTERNS.SELECTED_CALENDARS,
      ResponseInterceptor.ERROR_PATTERNS.CLIENTS,
      ResponseInterceptor.ERROR_PATTERNS.COUNTRIES,
      ResponseInterceptor.ERROR_PATTERNS.STATES,
      ResponseInterceptor.ERROR_PATTERNS.GROUPS,
      ResponseInterceptor.ERROR_PATTERNS.LOAD_FILE,
      ResponseInterceptor.ERROR_PATTERNS.MACROS,
      ResponseInterceptor.ERROR_PATTERNS.WORKS,
      ResponseInterceptor.ERROR_PATTERNS.SHIFTS,
      ResponseInterceptor.ERROR_PATTERNS.ADDRESSES,
      ResponseInterceptor.ERROR_PATTERNS.COMMUNICATIONS,
    ];

    const isApiEndpoint = apiEndpoints.some((pattern) => url.includes(pattern));

    // Exkludiere spezielle GET-Endpunkte, die keine Fehlerbehandlung brauchen
    const isSpecialGet = this.isSpecialGetEndpoint(url);

    return isApiEndpoint && isModifyingOperation && !isSpecialGet;
  }

  private isSpecialGetEndpoint(url: string): boolean {
    const specialGetPatterns = [
      'GetSimpleList',
      'ChangeList',
      'GetClientTypeTemplate',
      'GetStateTokenList',
      'FindClient',
      'LastChangeMetaData',
      'Count',
      'NewEntries',
      'CreateExcelFile',
      'GetSimpleCalendarRuleList',
      'GetCalendarRuleList',
      'GetRuleTokenList',
      'GetClientList',
      'GetMacroFilterList',
      'GetSettingsList',
      'GetSetting',
      'DownLoad',
      'tree',
      'path',
      'refresh',
    ];

    return specialGetPatterns.some((pattern) => url.includes(pattern));
  }

  private handleApiError(
    error: HttpErrorResponse,
    method: string,
    url: string
  ): Observable<never> {
    const entityInfo = this.getEntityInfo(url);
    const operationType = this.getOperationType(method);

    const errorMessage = this.buildErrorMessage(
      `${entityInfo.name} ${operationType.toLowerCase()}`,
      error
    );
    const messageKey = `${operationType}_${entityInfo.key}_ERROR`;

    this.toastShowService.showError(errorMessage, messageKey);

    console.error(`${entityInfo.name} ${operationType} Error:`, {
      url,
      method,
      status: error.status,
      message: error.message,
      error: error.error,
    });

    return throwError(() => error);
  }

  private getEntityInfo(url: string): { name: string; key: string } {
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.ABSENCES)) {
      return { name: 'Absence', key: 'ABSENCE' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.ASSIGNED_GROUPS)) {
      return { name: 'Assigned Group', key: 'ASSIGNED_GROUP' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.BANK_DETAILS)) {
      return { name: 'Bank Detail', key: 'BANK_DETAIL' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.BREAKS)) {
      return { name: 'Break', key: 'BREAK' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.CALENDAR_RULES)) {
      return { name: 'Calendar Rule', key: 'CALENDAR_RULE' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.CALENDAR_SELECTIONS)) {
      return { name: 'Calendar Selection', key: 'CALENDAR_SELECTION' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.SELECTED_CALENDARS)) {
      return { name: 'Selected Calendar', key: 'SELECTED_CALENDAR' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.CLIENTS)) {
      return { name: 'Client', key: 'CLIENT' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.COUNTRIES)) {
      return { name: 'Country', key: 'COUNTRY' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.STATES)) {
      return { name: 'State', key: 'STATE' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.GROUPS)) {
      return { name: 'Group', key: 'GROUP' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.LOAD_FILE)) {
      return { name: 'File', key: 'FILE' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.MACROS)) {
      return { name: 'Macro', key: 'MACRO' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.WORKS)) {
      return { name: 'Working Time', key: 'WORK' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.SHIFTS)) {
      return { name: 'Shift', key: 'SHIFT' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.ADDRESSES)) {
      return { name: 'Address', key: 'ADDRESS' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.COMMUNICATIONS)) {
      return { name: 'Communication', key: 'COMMUNICATION' };
    }
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.SETTINGS)) {
      return { name: 'Setting', key: 'SETTING' };
    }
    // ggf. Default-Fallback
    return { name: 'Unknown Entity', key: 'UNKNOWN' };
  }

  private getOperationType(method: string): string {
    switch (method) {
      case 'DELETE':
        return 'DELETE';
      case 'POST':
        return 'ADD';
      case 'PUT':
        return 'UPDATE';
      case 'PATCH':
        return 'MODIFY';
      default:
        return 'MODIFY';
    }
  }

  private buildErrorMessage(
    operation: string,
    error: HttpErrorResponse
  ): string {
    let errorMessage = '';

    switch (error.status) {
      case 400:
        errorMessage = `Error during ${operation}: Invalid data`;
        break;
      case 401:
        errorMessage = `Error during ${operation}: Unauthorized`;
        break;
      case 403:
        errorMessage = `Error during ${operation}: Access denied`;
        break;
      case 404:
        errorMessage = `Error during ${operation}: Entry not found`;
        break;
      case 409:
        errorMessage = `Error during ${operation}: Conflict with existing data`;
        break;
      case 422:
        errorMessage = `Error during ${operation}: Validation error`;
        break;
      case 500:
        errorMessage = `Error during ${operation}: Server error`;
        break;
      default:
        errorMessage = `Unknown error during ${operation}`;
    }

    // Zusätzliche Details aus der Server-Response wenn verfügbar
    if (error.error?.message) {
      errorMessage += `\nDetails: ${error.error.message}`;
    }

    return errorMessage;
  }

  private handlePasswordChangeError(
    error: HttpErrorResponse
  ): Observable<never> {
    let msg = MessageLibrary.NOT_REGISTER + '\n\r';

    const passwordError =
      error.error?.modelState?.PasswordMismatch?.errors?.[0];
    if (passwordError) {
      msg += passwordError.errorMessage + '\n\r';
    }

    this.toastShowService.showInfo(msg, 'Not registered');
    return throwError(() => error);
  }

  private handleRegistrationError(error: HttpErrorResponse): Observable<never> {
    let msg = MessageLibrary.NOT_REGISTER + '\n\r';

    try {
      const modelState = error.error?.modelState;
      const errorMappings = [
        {
          check: modelState?.PasswordRequiresDigit?.errors?.length > 0,
          message: MessageLibrary.NOT_REGISTER_DIGIT,
        },
        {
          check: modelState?.PasswordRequiresUpper?.errors?.length > 0,
          message: MessageLibrary.NOT_REGISTER_UPERCASECHARACTER,
        },
        {
          check:
            modelState?.PasswordRequiresNonAlphanumeric?.errors?.length > 0,
          message: MessageLibrary.NOT_REGISTER_ALPHANUMERICCHARACTER,
        },
      ];

      errorMappings.forEach((mapping) => {
        if (mapping.check) {
          msg += mapping.message + '\n\r';
        }
      });
    } catch (e) {
      console.error('Error parsing registration validation errors:', e);
    }

    this.toastShowService.showInfo(msg, 'wrong passwordCharacter');
    return throwError(() => error);
  }

  private isImageLoadingError(url: string, status: number): boolean {
    return (
      (url.includes(ResponseInterceptor.ERROR_PATTERNS.DOWNLOAD_IMAGE) &&
        status === 500) ||
      url.includes(ResponseInterceptor.ERROR_PATTERNS.SIMPLE_IMAGE)
    );
  }

  private handleImageLoadingError(): Observable<never> {
    const msg = MessageLibrary.ERROR_LOADIMAGE_HTTP500 + '\n\r';
    this.toastShowService.showInfo(msg, 'DownLoadImage');
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 500,
          statusText: 'Image Loading Error',
        })
    );
  }

  private handleClientListError(): Observable<never> {
    try {
      this.toastShowService.showError(
        MessageLibrary.CLIENTLIST_ERROR_500 + '\n\r',
        'CLIENTLIST_ERROR_500'
      );
    } catch (e) {
      console.error('Error handling client list error:', e);
    }
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 500,
          statusText: 'Client List Error',
        })
    );
  }

  private handleValidationErrors(error: HttpErrorResponse): Observable<never> {
    const validationErrors = error.error.errors;

    for (const key in validationErrors) {
      if (validationErrors.hasOwnProperty(key)) {
        const messages = validationErrors[key];
        console.log('Validation error for ' + key + ':', messages);
        this.toastShowService.showError(
          'Validation error for ' + key + ':',
          messages
        );
        break; // Nur ersten Fehler anzeigen
      }
    }

    return throwError(() => error);
  }

  private handleGenericError(error: HttpErrorResponse): Observable<never> {
    console.error('HTTP Error:', error);
    switch (error.status) {
      case 404:
        this.toastShowService.showError('404 Not Found');
        break;
      case 500:
        if (!this.isSpecific500Error(error.url || '')) {
          this.toastShowService.showError('500 Internal Server Error');
          this.navigationService.navigateToError();
        }
        break;
      case 0: // Network Error
        this.toastShowService.showError('Unknown Error');
        this.navigationService.navigateToError();
        break;
      default:
        // Für unbekannte Status-Codes
        if (error.status >= 400) {
          this.toastShowService.showError(error.status.toString());
        }
    }
    if (error.statusText === 'Unknown Error') {
      this.toastShowService.showError('Unknown Error');
    }

    return throwError(() => error);
  }

  private isSpecific500Error(url: string): boolean {
    return (
      url.includes('DownLoadImage') ||
      url.includes('GetSimpleImage') ||
      url.includes('GetSimpleList')
    );
  }
}

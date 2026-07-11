// Copyright (c) Heribert Gasparoli Private. All rights reserved.

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
import { DomainMessages } from 'src/app/domain/constants/messages';
import { catchError } from 'rxjs/operators';
import { WorkplaceStateService } from '../../application/services/workplace-state.service';
import { ToastShowService } from '../toast/toast-show.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { TranslateService } from '@ngx-translate/core';
import { DataTranslationService } from 'src/app/infrastructure/api/translation/data-translation.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements HttpInterceptor {
  private workplaceStateService = inject(
    WorkplaceStateService
  );
  private toastShowService = inject(ToastShowService);
  private navigationService = inject(NavigationService);
  private translateService = inject(TranslateService);
  private dataTranslationService = inject(DataTranslationService);

  private static readonly ERROR_PATTERNS = {
    POSTCODE: 'PostcodeCh',
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
    this.workplaceStateService.isDirty = false;
    this.workplaceStateService.showProgressSpinner(false);
    this.workplaceStateService.isSavedOrReset = false;
  }

  private handleSpecificErrors(
    error: HttpErrorResponse,
    req: HttpRequest<any>
  ): Observable<never> {
    const url = error.url || '';
    const method = req.method.toUpperCase();

    if (url.includes('Addresses/Validate')) {
      return throwError(() => error);
    }

    if (url.includes('Containers/') && url.includes('/overrides') && error.status === 404) {
      return throwError(() => error);
    }

    // PostcodeCH - erwarteter "Fehler"
    if (url.includes(ResponseInterceptor.ERROR_PATTERNS.POSTCODE)) {
      return throwError(() => error);
    }

    // GeneralSettings ist Admin-only; ein 403 für Nicht-Admins ist erwartet und wird
    // vom aufrufenden Code (z.B. loadSettingsAsync) bereits sauber behandelt.
    if (url.includes('GeneralSettings/') && error.status === 403) {
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

    if (url.includes('RouteOptimization/')) {
      return throwError(() => error);
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

    if (this.isAddressValidationError(error)) {
      return throwError(() => error);
    }

    const errorMessage = this.buildErrorMessage(
      `${entityInfo.name} ${operationType.toLowerCase()}`,
      error
    );
    const messageKey = `${operationType}_${entityInfo.key}_ERROR`;

    this.showTranslatedError(errorMessage, messageKey);

    console.error(`${entityInfo.name} ${operationType} Error:`, {
      url,
      method,
      status: error.status,
      message: error.message,
      error: error.error,
    });

    return throwError(() => error);
  }

  private async showTranslatedError(errorMessage: string, messageKey: string): Promise<void> {
    const currentLang = this.translateService.currentLang || DomainMessages.DEFAULT_LANG;

    if (currentLang === 'en') {
      this.toastShowService.showError(errorMessage, messageKey);
      return;
    }

    try {
      const response = await firstValueFrom(
        this.dataTranslationService.translateToAll(errorMessage, 'en')
      );
      const translated = response[currentLang as keyof typeof response] || errorMessage;
      this.toastShowService.showError(translated, messageKey);
    } catch {
      this.toastShowService.showError(errorMessage, messageKey);
    }
  }

  private static readonly ENTITY_INFO_MAP: readonly { pattern: string; name: string; key: string }[] = [
    { pattern: ResponseInterceptor.ERROR_PATTERNS.ABSENCES, name: 'Absence', key: 'ABSENCE' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.ASSIGNED_GROUPS, name: 'Assigned Group', key: 'ASSIGNED_GROUP' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.BANK_DETAILS, name: 'Bank Detail', key: 'BANK_DETAIL' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.BREAKS, name: 'Break', key: 'BREAK' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.CALENDAR_RULES, name: 'Calendar Rule', key: 'CALENDAR_RULE' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.CALENDAR_SELECTIONS, name: 'Calendar Selection', key: 'CALENDAR_SELECTION' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.SELECTED_CALENDARS, name: 'Selected Calendar', key: 'SELECTED_CALENDAR' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.CLIENTS, name: 'Client', key: 'CLIENT' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.COUNTRIES, name: 'Country', key: 'COUNTRY' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.STATES, name: 'State', key: 'STATE' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.GROUPS, name: 'Group', key: 'GROUP' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.LOAD_FILE, name: 'File', key: 'FILE' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.MACROS, name: 'Macro', key: 'MACRO' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.WORKS, name: 'Working Time', key: 'WORK' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.SHIFTS, name: 'Shift', key: 'SHIFT' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.ADDRESSES, name: 'Address', key: 'ADDRESS' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.COMMUNICATIONS, name: 'Communication', key: 'COMMUNICATION' },
    { pattern: ResponseInterceptor.ERROR_PATTERNS.SETTINGS, name: 'Setting', key: 'SETTING' },
  ];

  private getEntityInfo(url: string): { name: string; key: string } {
    const match = ResponseInterceptor.ENTITY_INFO_MAP.find(entry => url.includes(entry.pattern));
    return match
      ? { name: match.name, key: match.key }
      : { name: 'Unknown Entity', key: 'UNKNOWN' };
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
      case 0:
        errorMessage = `Error during ${operation}: Connection problem, CORS or server not reachable`;
        break;
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

    const detail = error.error?.detail || error.error?.message;
    if (detail) {
      errorMessage += `\nDetails: ${detail}`;
    }

    return errorMessage;
  }

  private isAddressValidationError(error: HttpErrorResponse): boolean {
    const errors = error.error?.errors;
    if (!errors) return false;
    return Object.values(errors).flat()
      .some((msg) => typeof msg === 'string' && msg.startsWith('address.validation.failed'));
  }

  private handlePasswordChangeError(
    error: HttpErrorResponse
  ): Observable<never> {
    let msg = DomainMessages.NOT_REGISTER + '\n\r';

    const passwordError =
      error.error?.modelState?.PasswordMismatch?.errors?.[0];
    if (passwordError) {
      msg += passwordError.errorMessage + '\n\r';
    }

    this.toastShowService.showInfo(msg, 'Not registered');
    return throwError(() => error);
  }

  private handleRegistrationError(error: HttpErrorResponse): Observable<never> {
    let msg = DomainMessages.NOT_REGISTER + '\n\r';

    try {
      const modelState = error.error?.modelState;
      const errorMappings = [
        {
          check: modelState?.PasswordRequiresDigit?.errors?.length > 0,
          message: DomainMessages.NOT_REGISTER_DIGIT,
        },
        {
          check: modelState?.PasswordRequiresUpper?.errors?.length > 0,
          message: DomainMessages.NOT_REGISTER_UPERCASECHARACTER,
        },
        {
          check:
            modelState?.PasswordRequiresNonAlphanumeric?.errors?.length > 0,
          message: DomainMessages.NOT_REGISTER_ALPHANUMERICCHARACTER,
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
    const msg = DomainMessages.ERROR_LOADIMAGE_HTTP500 + '\n\r';
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
        DomainMessages.CLIENTLIST_ERROR_500 + '\n\r',
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
    switch (error.status) {
      case 401: // wird vom TokenRefreshInterceptor behandelt
        break;
      case 404:
        this.toastShowService.showError(this.translateService.instant('HTTP_ERROR_404'), '404');
        break;
      case 500:
        if (!this.isSpecific500Error(error.url || '')) {
          this.toastShowService.showError(
            this.translateService.instant('HTTP_ERROR_500'),
            '500',
            error.message
          );
          this.navigationService.navigateToError();
        }
        break;
      case 0: // Network Error
        this.toastShowService.showError(
          DomainMessages.CONNECTION_ERROR,
          'CONNECTION_ERROR',
          error.message
        );
        this.navigationService.navigateToError();
        break;
      default:
        // Für unbekannte Status-Codes
        if (error.status >= 400) {
          this.toastShowService.showError(
            this.translateService.instant('HTTP_ERROR_UNKNOWN', { status: error.status })
          );
        }
    }
    if (error.statusText === 'Unknown Error') {
      this.toastShowService.showError(
        DomainMessages.CONNECTION_ERROR,
        'CONNECTION_ERROR',
        error.message
      );
      this.navigationService.navigateToError();
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

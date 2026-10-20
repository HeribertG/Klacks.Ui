// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpResponse,
  HttpStatusCode,
} from '@angular/common/http';
import { Injectable, Injector, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { catchError, tap } from 'rxjs/operators';
import { WorkplaceStateService } from '../../application/services/workplace-state.service';
import { ToastShowService } from '../toast/toast-show.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { TranslateService } from '@ngx-translate/core';
import { TranslationService } from 'src/app/domain/services/translation/translation.service';
import { BackendAvailabilityService } from 'src/app/application/services/backend-availability.service';
import { environment } from 'src/environments/environment';
import { KLACKSY_LEARNING_INTERCEPTOR_PASS_THROUGH_PATHS } from 'src/app/domain/constants/klacksy-learning.constants';
import { CLIENT_IMPORT_API_SEGMENT } from 'src/app/domain/constants/client-import.constants';
import { GEO_SERVICES_INTERCEPTOR_PASS_THROUGH_PATHS } from 'src/app/domain/constants/geo-services-api.constants';
import { AUTOFILL_RUNS_ACTIVE_PATH } from 'src/app/domain/constants/autofill-run-presence.constants';
import { EXPLAIN_OFFERS_PATH } from 'src/app/domain/constants/explain-offer.constants';
import { ERP_DROP_POINT_FILES_PATH } from 'src/app/domain/constants/erp-import-file.constants';
import { WORK_CONFLICT } from 'src/app/domain/constants/work-conflict.constants';
import { WORK_REFUSAL_EXPLAIN } from 'src/app/domain/constants/work-refusal-explain.constants';
import { WorkConflictMessageService, WorkConflictTarget, readWorkConflictProblem } from './work-conflict-message.service';
import { WorkRefusalExplainService } from 'src/app/presentation/services/work-refusal-explain.service';
import { IToastAction } from '../toast/toast-action.interface';
import {
  SETUP_COMPLETE_OWN_ADMIN_API_SEGMENT,
  SETUP_STATUS_API_SEGMENT,
} from 'src/app/domain/constants/setup.constants';
import {
  accountRegistrationReasonKeys,
  readAccountRegistrationRejectionReasons,
} from 'src/app/domain/helpers/account-registration-rejection.helper';

@Injectable()
export class ResponseInterceptor implements HttpInterceptor {
  private workplaceStateService = inject(
    WorkplaceStateService
  );
  private toastShowService = inject(ToastShowService);
  private navigationService = inject(NavigationService);
  private translateService = inject(TranslateService);
  private translationService = inject(TranslationService);
  private backendAvailabilityService = inject(BackendAvailabilityService);
  private injector = inject(Injector);

  private static readonly GATEWAY_FAILURE_STATUS_CODES = [502, 504];
  private static readonly API_PATH_PREFIX = '/api/';
  private static readonly KNOWLEDGE_INDEX_SYNC_STATUS_PATH = 'knowledge-index/sync-status';
  private static readonly QUIET_CALLER_HANDLED_PATHS: readonly string[] = [
    ResponseInterceptor.KNOWLEDGE_INDEX_SYNC_STATUS_PATH,
    AUTOFILL_RUNS_ACTIVE_PATH,
    EXPLAIN_OFFERS_PATH,
    ERP_DROP_POINT_FILES_PATH,
  ];
  private static readonly KLACKSY_LEARNING_PASS_THROUGH_STATUS_CODES = [
    HttpStatusCode.BadRequest,
    HttpStatusCode.NotFound,
    HttpStatusCode.Conflict,
  ];
  private static readonly SETUP_OWN_ADMIN_PASS_THROUGH_STATUS_CODES = [
    HttpStatusCode.BadRequest,
    HttpStatusCode.Conflict,
    HttpStatusCode.InternalServerError,
  ];
  private static readonly SETUP_STATUS_PASS_THROUGH_STATUS_CODES = [
    HttpStatusCode.NotFound,
    HttpStatusCode.InternalServerError,
  ];
  private static readonly REGISTRATION_TOAST_NAME = 'ACCOUNT_REGISTRATION';
  private static readonly TOAST_LINE_BREAK = '\n';

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
    MACROS: 'Macros/Macros/',
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
      tap((event) => {
        if (event instanceof HttpResponse) {
          this.backendAvailabilityService.reportReachable(event.url);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        if (!this.isQuietCallerHandledRequest(error) && !this.isGeoServicesPassThrough(error.url || '')) {
          this.resetUIState(error);
        }
        return this.handleSpecificErrors(error, req);
      })
    );
  }

  // Requests whose caller reports failures itself must not touch UI state on failure: background polls (the
  // knowledge-index sync status, checked every 10s for up to ~20 minutes, the autofill run presence the schedule
  // reads after each load, and the ERP import file list the settings page polls while imports run) as well as user
  // actions handled by their page (the explain-offer state and reactions, read and sent while the shift form is open
  // with unsaved changes, and the ERP file upload, retry and delete, which the settings page reports as translated
  // toasts). Their error has nothing to do with whatever the user is editing elsewhere on the page, so it must not
  // clear the unsaved-changes flag or the spinner/save-state out from under them, nor add a generic toast. The
  // geo service proxies follow the same rule: an address search or route lookup may fail while an unsaved
  // client form is open.
  private isQuietCallerHandledRequest(error: HttpErrorResponse): boolean {
    const url = error.url || '';
    return ResponseInterceptor.QUIET_CALLER_HANDLED_PATHS.some((path) => url.includes(path));
  }

  private resetUIState(error: HttpErrorResponse): void {
    if (!this.isBackendUnreachable(error)) {
      this.workplaceStateService.isDirty = false;
    }
    this.workplaceStateService.showProgressSpinner(false);
    this.workplaceStateService.isSavedOrReset = false;
  }

  private handleSpecificErrors(
    error: HttpErrorResponse,
    req: HttpRequest<any>
  ): Observable<never> {
    const url = error.url || '';
    const method = req.method.toUpperCase();

    if (this.isBackendUnreachable(error)) {
      this.backendAvailabilityService.reportUnavailable();
      return throwError(() => error);
    }

    if (url.includes('Addresses/Validate')) {
      return throwError(() => error);
    }

    if (this.isGeoServicesPassThrough(url)) {
      return throwError(() => error);
    }

    // Background polls and page-handled user actions: the caller reports or ignores the failure itself.
    if (this.isQuietCallerHandledRequest(error)) {
      return throwError(() => error);
    }

    if (url.includes('Containers/') && url.includes('/overrides') && error.status === 404) {
      return throwError(() => error);
    }

    // Etappe 1 of the stop-turn design calls this before the Etappe 2 Api endpoint exists; a 404 is
    // the expected degrade-to-hard-abort path (see ChatTurnControlService.stop()), not a real error.
    if (url.includes('chat/turns/') && url.includes('/cancel') && error.status === 404) {
      return throwError(() => error);
    }

    if (url.includes('IndustryTemplates/GetCustomRulesSummary') && error.status === 404) {
      return throwError(() => error);
    }

    if (url.includes('AnalyseScenarios/') && url.includes('/Accept') && error.status === 409) {
      return throwError(() => error);
    }

    if (url.includes('AnalyseScenarios/') && url.includes('/Summary') && error.status === 404) {
      return throwError(() => error);
    }

    if (this.isKlacksyLearningPassThroughError(url, error.status)) {
      return throwError(() => error);
    }

    // The import page shows every failure of its own endpoints inline or as a translated toast; the
    // generic 500 handling would navigate to the error page and throw away the whole import wizard.
    if (url.includes(`${CLIENT_IMPORT_API_SEGMENT}/`)) {
      return throwError(() => error);
    }

    // The own-admin setup page shows every failure of its submit inline (a rolled-back 500 included, so the operator
    // can retry without losing the form), and both the setup gate and the page treat a failed status read as "no
    // policy known"; a toast or the error page here would throw the setup form away.
    if (this.isSetupOwnAdminPassThroughError(url, error.status)) {
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

    const workConflictMessage = this.buildWorkConflictMessage(error, req);
    if (workConflictMessage !== null) {
      const actions = this.buildAskKlacksyActions(error, req);
      if (actions) {
        this.toastShowService.showError(workConflictMessage, WORK_CONFLICT.TOAST_NAME, { actions });
      } else {
        this.toastShowService.showError(workConflictMessage, WORK_CONFLICT.TOAST_NAME);
      }
      return throwError(() => error);
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

  // A refused work booking carries codes and ids only; the message with employee, qualification and
  // shift names is built from the loaded schedule data, looked up lazily because that service graph
  // itself depends on HttpClient and therefore on this interceptor.
  private buildWorkConflictMessage(error: HttpErrorResponse, req: HttpRequest<any>): string | null {
    if (!readWorkConflictProblem(error)) {
      return null;
    }
    return this.injector.get(WorkConflictMessageService).buildMessage(error, this.workConflictTarget(req));
  }

  private buildAskKlacksyActions(error: HttpErrorResponse, req: HttpRequest<any>): IToastAction[] | undefined {
    if (!this.isSingleBooking(req) || this.isScenarioBooking(req)) {
      return undefined;
    }
    const subject = this.injector
      .get(WorkConflictMessageService)
      .resolveDiagnosisSubject(error, this.workConflictTarget(req));
    const action = subject ? this.injector.get(WorkRefusalExplainService).buildAskAction(subject) : null;
    return action ? [action] : undefined;
  }

  private isSingleBooking(req: HttpRequest<any>): boolean {
    const path = req.url.split('?')[0];
    return req.method === WORK_REFUSAL_EXPLAIN.SINGLE_BOOKING_METHOD && path.endsWith(WORK_REFUSAL_EXPLAIN.SINGLE_BOOKING_PATH);
  }

  private isScenarioBooking(req: HttpRequest<any>): boolean {
    const analyseToken = req.body?.analyseToken;
    return typeof analyseToken === 'string' && analyseToken.trim() !== '';
  }

  private workConflictTarget(req: HttpRequest<any>): WorkConflictTarget {
    return {
      clientId: req.body?.clientId,
      shiftId: req.body?.shiftId,
      date: typeof req.body?.currentDate === 'string' ? req.body.currentDate : undefined,
    };
  }

  private isGeoServicesPassThrough(url: string): boolean {
    return GEO_SERVICES_INTERCEPTOR_PASS_THROUGH_PATHS.some((path) => url.includes(path));
  }

  private isSetupOwnAdminPassThroughError(url: string, status: number): boolean {
    return (
      (url.includes(SETUP_COMPLETE_OWN_ADMIN_API_SEGMENT) &&
        ResponseInterceptor.SETUP_OWN_ADMIN_PASS_THROUGH_STATUS_CODES.includes(status)) ||
      (url.includes(SETUP_STATUS_API_SEGMENT) &&
        ResponseInterceptor.SETUP_STATUS_PASS_THROUGH_STATUS_CODES.includes(status))
    );
  }

  private isKlacksyLearningPassThroughError(url: string, status: number): boolean {
    return (
      KLACKSY_LEARNING_INTERCEPTOR_PASS_THROUGH_PATHS.some((path) => url.includes(path)) &&
      ResponseInterceptor.KLACKSY_LEARNING_PASS_THROUGH_STATUS_CODES.includes(status)
    );
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

    if (this.translationService.isConfigured === null) {
      await this.translationService.checkStatus();
    }

    if (this.translationService.isConfigured === false) {
      this.toastShowService.showError(errorMessage, messageKey);
      return;
    }

    const translated = await this.translationService.translateToMultiLanguage(errorMessage, 'en');
    this.toastShowService.showError(translated?.[currentLang] || errorMessage, messageKey);
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
    const reasonTexts = accountRegistrationReasonKeys(readAccountRegistrationRejectionReasons(error) ?? []).map(
      (key) => this.translateService.instant(key)
    );
    const msg = [DomainMessages.NOT_REGISTER, ...reasonTexts].join(ResponseInterceptor.TOAST_LINE_BREAK);

    this.toastShowService.showInfo(msg, ResponseInterceptor.REGISTRATION_TOAST_NAME);
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
      default:
        // Für unbekannte Status-Codes
        if (error.status >= 400) {
          this.toastShowService.showError(
            this.translateService.instant('HTTP_ERROR_UNKNOWN', { status: error.status })
          );
        }
    }

    return throwError(() => error);
  }

  // Status 0 means the connection itself failed, which only happens when nothing answers at all.
  // Behind a reverse proxy the API is never silent: the proxy answers for it with a gateway status,
  // so those count as unreachable too - but only for our own API, never for a foreign host.
  // 503 is deliberately absent: the API itself returns it when a downstream service such as the
  // marketplace is unavailable, and treating that as a dead backend would hide the real error and
  // reload the page in a loop.
  private isBackendUnreachable(error: HttpErrorResponse): boolean {
    return error.status === 0 || this.isGatewayFailure(error);
  }

  private isGatewayFailure(error: HttpErrorResponse): boolean {
    return (
      ResponseInterceptor.GATEWAY_FAILURE_STATUS_CODES.includes(error.status) &&
      this.isOwnApiUrl(error.url || '')
    );
  }

  private isOwnApiUrl(url: string): boolean {
    if (!url) {
      return false;
    }
    if (url.startsWith(environment.baseUrl)) {
      return true;
    }
    try {
      const target = new URL(url, window.location.origin);
      return (
        target.origin === window.location.origin &&
        target.pathname.startsWith(ResponseInterceptor.API_PATH_PREFIX)
      );
    } catch {
      return false;
    }
  }

  private isSpecific500Error(url: string): boolean {
    return (
      url.includes('DownLoadImage') ||
      url.includes('GetSimpleImage') ||
      url.includes('GetSimpleList')
    );
  }
}

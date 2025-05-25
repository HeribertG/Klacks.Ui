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
    DOWNLOAD_IMAGE: 'v1/LoadFile/DownLoadImage',
    SIMPLE_IMAGE: 'v1/LoadFile/GetSimpleImage',
    CLIENT_LIST: 'v1/Clients/GetSimpleList',
  };

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        this.resetUIState();
        return this.handleSpecificErrors(error);
      })
    );
  }

  private resetUIState(): void {
    this.dataManagementSwitchboardService.isDirty = false;
    this.dataManagementSwitchboardService.showProgressSpinner(false);
    this.dataManagementSwitchboardService.isSavedOrReset = false;
  }

  private handleSpecificErrors(error: HttpErrorResponse): Observable<never> {
    const url = error.url || '';

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

    // File-Loading Errors
    if (this.isImageLoadingError(url, error.status)) {
      return this.handleImageLoadingError();
    }

    // Client List Error
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

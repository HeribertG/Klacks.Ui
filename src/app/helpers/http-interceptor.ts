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
import { MessageLibrary } from './string-constants';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { DataManagementSwitchboardService } from '../data/management/data-management-switchboard.service';

@Injectable()
export class ResponseInterceptor implements HttpInterceptor {
  private dataManagementSwitchboardService = inject(
    DataManagementSwitchboardService
  );
  private authService = inject(AuthService);

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // UI-State zurücksetzen
        this.dataManagementSwitchboardService.isDirty = false;
        this.dataManagementSwitchboardService.showProgressSpinner(false);
        this.dataManagementSwitchboardService.isSavedOrReset = false;

        // Spezifische Error-Behandlungen
        return this.handleSpecificErrors(error);
      })
    );
  }

  private handleSpecificErrors(error: HttpErrorResponse): Observable<never> {
    // PostcodeCH - kein Error
    if (error.url?.includes('PostcodeCH')) {
      return throwError(() => error);
    }

    // Password Change Errors
    if (error.url?.includes('Accounts/ChangePassword')) {
      let msg = MessageLibrary.NOT_REGISTER + '\n\r';
      if (error.error?.modelState?.PasswordMismatch?.errors?.length > 0) {
        msg +=
          error.error.modelState.PasswordMismatch.errors[0].errorMessage +
          '\n\r';
      }
      this.authService.showInfo(msg, 'Not registered');
      return throwError(() => error);
    }

    // Register Errors
    if (error.url?.includes('Accounts/Register')) {
      let msg = MessageLibrary.NOT_REGISTER + '\n\r';
      try {
        const modelState = error.error?.modelState;
        if (modelState?.PasswordRequiresDigit?.errors?.length > 0) {
          msg += MessageLibrary.NOT_REGISTER_DIGIT + '\n\r';
        }
        if (modelState?.PasswordRequiresUpper?.errors?.length > 0) {
          msg += MessageLibrary.NOT_REGISTER_UPERCASECHARACTER + '\n\r';
        }
        if (modelState?.PasswordRequiresNonAlphanumeric?.errors?.length > 0) {
          msg += MessageLibrary.NOT_REGISTER_ALPHANUMERICCHARACTER + '\n';
        }
      } catch (e) {
        console.error(e);
      }
      this.authService.showInfo(msg, 'wrong passwordCharacter');
      return throwError(() => error);
    }

    // Image Loading Errors
    if (
      (error.url?.includes('v1/LoadFile/DownLoadImage') &&
        error.status === 500) ||
      error.url?.includes('v1/LoadFile/GetSimpleImage')
    ) {
      const msg = MessageLibrary.ERROR_LOADIMAGE_HTTP500 + '\n\r';
      this.authService.showInfo(msg, 'DownLoadImage');
      return throwError(() => error);
    }

    // Client List Error
    if (
      error.url?.includes('v1/Clients/GetSimpleList') &&
      error.status === 500
    ) {
      try {
        this.authService.showError(
          MessageLibrary.CLIENTLIST_ERROR_500 + '\n\r',
          'CLIENTLIST_ERROR_500'
        );
      } catch (e) {
        console.error(e);
      }
      return throwError(() => error);
    }

    // Validation Errors
    if (error.error?.errors) {
      const validationErrors = error.error.errors;
      for (const key in validationErrors) {
        if (validationErrors.hasOwnProperty(key)) {
          const messages = validationErrors[key];
          console.log('Validation error for ' + key + ':', messages);
          this.authService.errorMessage(
            'Validation error for ' + key + ':',
            messages
          );
          return throwError(() => error);
        }
      }
    }

    // Generic Errors
    console.log(error);
    if (error.statusText === 'Unknown Error') {
      this.authService.errorMessage('Unknown Error');
    }

    return throwError(() => error);
  }
}

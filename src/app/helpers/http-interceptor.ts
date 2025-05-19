import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { MessageLibrary } from './string-constants';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { DataManagementSwitchboardService } from '../data/management/data-management-switchboard.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const token = localStorage.getItem(MessageLibrary.TOKEN);

    if (token !== undefined) {
      const modified = req.clone({
        headers: req.headers.set('Authorization', 'Bearer ' + token),
      });

      return next.handle(modified);
    } else {
      return next.handle(req);
    }
  }
}

@Injectable()
export class ResponseInterceptor implements HttpInterceptor {
  refreshtokenFlag = false;

  constructor(
    private dataManagementSwitchboardService: DataManagementSwitchboardService,
    @Inject(AuthService) private authService: AuthService
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      tap((x) => {
        this.refreshtokenFlag = false;
      }),
      catchError((error: HttpErrorResponse) => {
        // unauthorized -> refreshtoken
        if (error.status === 401 && !this.refreshtokenFlag) {
          this.refreshtokenFlag = true;
          this.authService.refreshToken().then((x) => {
            this.refreshtokenFlag = false;
          });
          return throwError(() => error);
        } else if (error.status === 401 && this.refreshtokenFlag) {
          return throwError(() => error);
        }

        this.dataManagementSwitchboardService.isDirty = false;
        this.dataManagementSwitchboardService.showProgressSpinner(false);
        this.dataManagementSwitchboardService.isSavedOrReset = false;

        // error in PostcodeCH occurs if no postcode is found-> IT IS NO ERROR
        if (error.url!.includes('PostcodeCH')) {
          return throwError(() => error);
        }

        if (error.url!.includes('Accounts/ChangePassword')) {
          let msg = MessageLibrary.NOT_REGISTER + '\n\r';

          if (
            error.error &&
            error.error.modelState &&
            error.error.modelState.PasswordMismatch.errors.length > 0
          ) {
            msg =
              msg +
              error.error.modelState.PasswordMismatch.errors[0].errorMessage +
              '\n\r';
          }
          this.authService.showInfo(msg, 'Not registered');

          return throwError(() => error);
        }

        if (error.url!.includes('Accounts/Register')) {
          let msg = MessageLibrary.NOT_REGISTER + '\n\r';
          try {
            if (
              error.error.modelState &&
              error.error.modelState.PasswordRequiresDigit.errors.length > 0
            ) {
              msg = msg + MessageLibrary.NOT_REGISTER_DIGIT + '\n\r';
            }
            if (
              error.error.modelState &&
              error.error.modelState.PasswordRequiresUpper.errors.length > 0
            ) {
              msg =
                msg + MessageLibrary.NOT_REGISTER_UPERCASECHARACTER + '\n\r';
            }
            if (
              error.error.modelState &&
              error.error.modelState.PasswordRequiresNonAlphanumeric.errors
                .length > 0
            ) {
              msg =
                msg + MessageLibrary.NOT_REGISTER_ALPHANUMERICCHARACTER + '\n';
            }
          } catch (e) {}
          this.authService.showInfo(msg, 'wrong passwordCharacter');

          return throwError(() => error);
        }

        if (
          error.url!.includes('v1/LoadFile/DownLoadImage') &&
          error.status === 500
        ) {
          const msg = MessageLibrary.ERROR_LOADIMAGE_HTTP500 + '\n\r';

          this.authService.showInfo(msg, 'DownLoadImage');

          return throwError(() => error);
        }

        if (error.url!.includes('v1/LoadFile/GetSimpleImage')) {
          const msg = MessageLibrary.ERROR_LOADIMAGE_HTTP500 + '\n\r';

          this.authService.showInfo(msg, 'DownLoadImage');

          return throwError(() => error);
        }

        if (
          error.url!.includes('v1/Clients/GetSimpleList') &&
          error.status === 500
        ) {
          try {
            this.authService.showError(
              MessageLibrary.CLIENTLIST_ERROR_500 + '\n\r',
              'CLIENTLIST_ERROR_500'
            );
          } catch (e) {}

          return throwError(() => error);
        }

        console.log(error);
        if (error.error.errors) {
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

        if (error.statusText === 'Unknown Error') {
          this.authService.errorMessage('Unknown Error');
        }

        return throwError(() => error);
      })
    );
  }
}

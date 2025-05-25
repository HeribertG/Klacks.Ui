import { ErrorHandler, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AppErrorHandler implements ErrorHandler {
  // Errors die ignoriert werden sollen
  private static readonly IGNORED_ERROR_PATTERNS = [
    'ExpressionChangedAfterItHasBeenCheckedError',
    'Unable to preventDefault inside passive event listener due to target being treated as passive',
    "Failed to execute 'removeChild' on 'Node'",
    "Cannot read property 'style' of null",
    "Cannot read property 'style' of undefined",
    "Cannot read property 'currentTarget' of undefined",
    "Cannot destructure property 'drake' of 'this.group' as it is undefined",
    "Cannot read property 'close' of undefined",
    "Cannot read property 'content' of undefined",
    "Cannot set property 'order' of null",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleError(error: any): void {
    console.log('handleError', error);

    // Basis-Validierung
    if (!error || typeof error !== 'object') {
      console.error('Invalid error object:', error);
      return;
    }

    // HTTP Errors werden bereits im ResponseInterceptor behandelt
    if (this.isHttpError(error)) {
      return;
    }

    // Ignorierte Errors prüfen
    if (this.shouldIgnoreError(error)) {
      return;
    }

    // Alle anderen Errors loggen
    console.error('Unhandled Application Error:', error);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isHttpError(error: any): boolean {
    return error?.rejection?.name === 'HttpErrorResponse';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private shouldIgnoreError(error: any): boolean {
    if (!error?.message || typeof error.message !== 'string') {
      return false;
    }

    return AppErrorHandler.IGNORED_ERROR_PATTERNS.some((pattern) =>
      error.message.includes(pattern)
    );
  }
}

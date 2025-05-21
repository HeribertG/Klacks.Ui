import { ErrorHandler, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AppErrorHandler implements ErrorHandler {
  constructor() {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleError(error: any): void {
    console.log('handleError', error);
    if (error && typeof error === 'object' && error.message) {
      // alle http Fehler sind in ResponseInterceptor schon behandelt
      if (error.rejection && error.rejection.name === 'HttpErrorResponse') {
        return; // deswegen Abbruch
      }
      // Fehler die nicht angezeigt werden müssen
      try {
        if (
          error &&
          error.message &&
          error.message.includes('ExpressionChangedAfterItHasBeenCheckedError')
        ) {
          return; // deswegen Abbruch
        }
      } catch (e) {
        return;
      }
      try {
        if (
          error &&
          error.message &&
          error.message.includes(
            'Unable to preventDefault inside passive event listener due to target being treated as passive'
          )
        ) {
          return; // deswegen Abbruch
        }
      } catch (e) {
        return;
      }
      try {
        if (
          error &&
          error.message &&
          error.message.includes(`Failed to execute 'removeChild' on 'Node'`)
        ) {
          return; // deswegen Abbruch
        }
      } catch (e) {
        return;
      }
      try {
        if (
          error &&
          error.message &&
          error.message.includes(`Cannot read property 'style' of null`)
        ) {
          return; // deswegen Abbruch
        }
      } catch (e) {
        return;
      }
      try {
        if (
          error &&
          error.message &&
          error.message.includes(`Cannot read property 'style' of undefined`)
        ) {
          return; // deswegen Abbruch
        }
      } catch (e) {
        return;
      }
      try {
        if (
          error &&
          error.message &&
          error.message.includes(
            `Cannot read property 'currentTarget' of undefined`
          )
        ) {
          return; // deswegen Abbruch
        }
      } catch (e) {
        return;
      }

      try {
        if (
          error &&
          error.message &&
          error.message.includes(
            `Cannot destructure property 'drake' of 'this.group' as it is undefined.`
          )
        ) {
          return; // deswegen Abbruch
        }
      } catch (e) {
        return;
      }

      try {
        if (
          error &&
          error.message &&
          error.message.includes(`Cannot read property 'close' of undefined`)
        ) {
          return; // deswegen Abbruch
        }
      } catch (e) {
        return;
      }

      try {
        if (
          error &&
          error.message &&
          error.message.includes(`Cannot read property 'content' of undefined`)
        ) {
          return; // deswegen Abbruch
        }
      } catch (e) {
        return;
      }

      try {
        if (
          error &&
          error.message &&
          error.message.includes(`Cannot set property 'order' of null`)
        ) {
          return; // deswegen Abbruch
        }
      } catch (e) {
        return;
      }
      // this.snackBar.openSnackBar(error.message, '', true, undefined);
    }

    console.log(error);
  }
}

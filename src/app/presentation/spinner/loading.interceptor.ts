// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SpinnerService } from './spinner.service';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private spinnerService = inject(SpinnerService);

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (req.context.get(SKIP_LOADING)) {
      return next.handle(req);
    }

    this.spinnerService.incrementRequests();

    return next.handle(req).pipe(
      finalize(() => {
        this.spinnerService.decrementRequests();
      })
    );
  }
}

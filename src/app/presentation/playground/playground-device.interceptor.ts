// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Adds the signed playground device token to HttpClient requests of the own API's budgeted LLM endpoints, but only
 * while the playground token limit is active. Requests to any other origin never receive the header. A request that
 * starts while the status is still loading waits for the answer, so it is never sent with a stale "inactive" state.
 * The native fetch calls of the chat stream attach the token themselves.
 */
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, switchMap } from 'rxjs';
import { isPlaygroundLlmUrl } from 'src/app/domain/helpers/playground-token-limit.helper';
import { PlaygroundDeviceService } from 'src/app/domain/services/playground/playground-device.service';
import { PlaygroundStatusGateService } from 'src/app/domain/services/playground/playground-status-gate.service';
import { environment } from 'src/environments/environment';

@Injectable()
export class PlaygroundDeviceInterceptor implements HttpInterceptor {
  private readonly playground = inject(PlaygroundDeviceService);
  private readonly statusGate = inject(PlaygroundStatusGateService);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.statusGate.statusResolved() && this.isBudgetedLlmRequest(req)) {
      return from(this.statusGate.whenResolved()).pipe(switchMap(() => this.forward(req, next)));
    }
    return this.forward(req, next);
  }

  private forward(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const headers = this.playground.deviceHeaders();
    if (Object.keys(headers).length === 0 || !this.isBudgetedLlmRequest(req)) {
      return next.handle(req);
    }
    return next.handle(req.clone({ setHeaders: headers }));
  }

  private isBudgetedLlmRequest(req: HttpRequest<unknown>): boolean {
    return isPlaygroundLlmUrl(req.url, environment.baseUrl, window.location.origin);
  }
}

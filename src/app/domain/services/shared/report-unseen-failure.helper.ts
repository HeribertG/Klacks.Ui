// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reports a failed write the user would otherwise not hear about. An exception while the payload is built never reached
 * the HTTP interceptor. A request that could not reach the server only started the silent outage watch there, and the
 * overlay comes much later or never, so it gets its own message that passes the silence. Every other failed request is
 * left alone: the interceptor reports it, or lets a refusal through for its caller to explain.
 * @param eventBus - Carries the report to the toast handler
 * @param error - The error of the write
 * @param code - Toast name of the report
 * @param context - Where the failure happened
 */

import { HttpErrorResponse } from '@angular/common/http';
import { DomainEventType } from 'src/app/domain/events/domain-event-type.enum';
import { isBackendUnreachableError } from 'src/app/domain/helpers/backend-unreachable.helper';
import { IEventBus } from 'src/app/domain/interfaces/event-bus.interface';
import { environment } from 'src/environments/environment';

const UNSEEN_FAILURE_KEY = 'HTTP_ERROR_UNKNOWN';
const UNREACHABLE_FAILURE_KEY = 'save.error.backendUnreachable';
const UNREACHABLE_TOAST_NAME = 'save-backend-unreachable';
const NO_HTTP_STATUS = 0;

export function reportUnseenFailure(eventBus: IEventBus, error: unknown, code: string, context: string): void {
  if (isBackendUnreachableError(error, environment.baseUrl)) {
    eventBus.emit(DomainEventType.ERROR, {
      message: UNREACHABLE_FAILURE_KEY,
      code: UNREACHABLE_TOAST_NAME,
      context,
      showDuringOutage: true,
    });
    return;
  }

  if (error instanceof HttpErrorResponse) {
    return;
  }

  eventBus.emit(DomainEventType.ERROR, {
    message: UNSEEN_FAILURE_KEY,
    messageParams: { status: NO_HTTP_STATUS },
    code,
    context,
  });
}

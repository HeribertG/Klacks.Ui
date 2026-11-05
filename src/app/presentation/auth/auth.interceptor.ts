// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Prepares every request to the Klacks API. The session lives in HttpOnly cookies, so each API request is sent with
 * credentials (needed when the Ui runs on another origin than the API, as in development) and with the CSRF marker
 * header X-Requested-With the backend demands of cookie-authenticated writes - also uploads, deletes and downloads.
 * No Authorization header is ever set. With a local session it also adds the SignalR connection id (so the sender's
 * own edits are not echoed back) and, while the access token is still valid, the selected group.
 */
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Injectable, Injector, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { X_REQUESTED_WITH_HEADER, X_REQUESTED_WITH_VALUE } from 'src/app/domain/constants/auth-request.constants';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { SessionStore } from 'src/app/infrastructure/storage/session-store.service';
import { environment } from 'src/environments/environment';
import { isInternalApiUrl } from 'src/app/domain/helpers/internal-api-url.helper';
import { INSTANCE_ID_HEADER } from 'src/app/domain/helpers/instance-id.helper';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private sessionStore = inject(SessionStore);
  private signalRService = inject(SignalRService);
  private injector = inject(Injector);

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (!isInternalApiUrl(req.url, environment.baseUrl)) {
      return next.handle(req);
    }

    const instanceId = this.getOrCreateInstanceId();

    let headers = req.headers
      .set(INSTANCE_ID_HEADER, instanceId)
      .set(X_REQUESTED_WITH_HEADER, X_REQUESTED_WITH_VALUE);

    if (this.sessionStore.hasSession()) {
      const connectionId = this.signalRService.connectionId;
      if (connectionId) {
        headers = headers.set('X-SignalR-ConnectionId', connectionId);
      }

      // Resolving the group constructs the whole GroupSelectionService -> DataManagementClient -> ClientConfig
      // chain, and ClientConfigService's constructor immediately fires four authenticated requests. During the
      // startup refresh those would go out with a dead access cookie and 401 in a batch, so the resolve waits until
      // the stored expiry says the access token is usable. Zero buffer on purpose: the default buffer treats a token
      // as expired 30s early, which would drop the group header from requests the server still accepts and silently
      // widen their scope.
      if (!this.sessionStore.isAccessExpired(0)) {
        const selectedGroupId = this.resolveSelectedGroupId();
        if (selectedGroupId) {
          headers = headers.set('X-Selected-Group', selectedGroupId);
        }
      }
    }

    const authReq = req.clone({ headers, withCredentials: true });
    return next.handle(authReq);
  }

  // Lazy resolve avoids a constructor-time DI cycle:
  // AuthInterceptor -> GroupSelectionService -> DataManagementClient ->
  // ClientEdit -> Communication -> ClientConfig -> HTTP -> AuthInterceptor.
  private resolveSelectedGroupId(): string | undefined {
    try {
      return this.injector.get(GroupSelectionService).selectedGroupId;
    } catch {
      return undefined;
    }
  }

  private getOrCreateInstanceId(): string {
    let id = sessionStorage.getItem(StorageKeys.CONTAINER_LOCK_INSTANCE_ID);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(StorageKeys.CONTAINER_LOCK_INSTANCE_ID, id);
    }
    return id;
  }
}

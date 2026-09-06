// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Injectable, Injector, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { environment } from 'src/environments/environment';
import { getApiRootUrl } from 'src/app/infrastructure/helpers/api-root-url.helper';
import { isJwtExpired } from 'src/app/shared/helpers/jwt.helper';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private localStorageService = inject(LocalStorageService);
  private signalRService = inject(SignalRService);
  private injector = inject(Injector);

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (!this.isInternalRequest(req.url)) {
      return next.handle(req);
    }

    const token = this.localStorageService.get(StorageKeys.TOKEN);
    const connectionId = this.signalRService.connectionId;
    const instanceId = this.getOrCreateInstanceId();

    let headers = req.headers.set('X-Instance-Id', instanceId);

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);

      if (connectionId) {
        headers = headers.set('X-SignalR-ConnectionId', connectionId);
      }

      // The token is still sent while expired so TokenRefreshInterceptor sees a 401 it can
      // refresh and replay. Resolving the group, however, constructs the whole
      // GroupSelectionService -> DataManagementClient -> ClientConfig chain, and
      // ClientConfigService's constructor immediately fires four authenticated requests. During
      // the startup refresh those would go out with the dead token and 401 in a batch, so the
      // resolve waits until the token is actually usable. Zero buffer on purpose: the default
      // buffer treats a token as expired 30s early, which would drop the group header from
      // requests the server still accepts and silently widen their scope.
      if (!isJwtExpired(token, 0)) {
        const selectedGroupId = this.resolveSelectedGroupId();
        if (selectedGroupId) {
          headers = headers.set('X-Selected-Group', selectedGroupId);
        }
      }
    }

    const authReq = req.clone({ headers });
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

  private isInternalRequest(url: string): boolean {
    const apiRoot = getApiRootUrl();
    return url.startsWith(environment.baseUrl) || url.startsWith(apiRoot) || url.startsWith('/api/');
  }
}

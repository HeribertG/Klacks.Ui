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

      const selectedGroupId = this.resolveSelectedGroupId();
      if (selectedGroupId) {
        headers = headers.set('X-Selected-Group', selectedGroupId);
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

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private localStorageService = inject(LocalStorageService);
  private signalRService = inject(SignalRService);

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const token = this.localStorageService.get(StorageKeys.TOKEN);
    const connectionId = this.signalRService.connectionId;

    if (token) {
      let headers = req.headers.set('Authorization', `Bearer ${token}`);

      if (connectionId) {
        headers = headers.set('X-SignalR-ConnectionId', connectionId);
      }

      const authReq = req.clone({ headers });
      return next.handle(authReq);
    }

    return next.handle(req);
  }
}

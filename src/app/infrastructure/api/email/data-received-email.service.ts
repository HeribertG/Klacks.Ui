// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  IReceivedEmail,
  IReceivedEmailListResponse,
} from 'src/app/domain/models/email/received-email.model';

const API_PATH = 'ReceivedEmail/';

@Injectable({
  providedIn: 'root',
})
export class DataReceivedEmailService {
  private httpClient = inject(HttpClient);

  getList(skip: number, take: number) {
    return this.httpClient
      .get<IReceivedEmailListResponse>(
        `${environment.baseUrl}${API_PATH}List?skip=${skip}&take=${take}`
      )
      .pipe(retry(3));
  }

  getById(id: string) {
    return this.httpClient
      .get<IReceivedEmail>(`${environment.baseUrl}${API_PATH}${id}`)
      .pipe(retry(3));
  }

  getUnreadCount() {
    return this.httpClient
      .get<number>(`${environment.baseUrl}${API_PATH}UnreadCount`)
      .pipe(retry(3));
  }

  markAsRead(id: string, isRead: boolean) {
    return this.httpClient
      .put<IReceivedEmail>(
        `${environment.baseUrl}${API_PATH}${id}/Read?isRead=${isRead}`,
        {}
      )
      .pipe(retry(3));
  }

  delete(id: string) {
    return this.httpClient
      .delete<void>(`${environment.baseUrl}${API_PATH}${id}`)
      .pipe(retry(3));
  }
}

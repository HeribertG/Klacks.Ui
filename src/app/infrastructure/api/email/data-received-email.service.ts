// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  IReceivedEmail,
  IReceivedEmailListResponse,
} from 'src/app/domain/models/email/received-email.model';
import { IEmailGroupNode } from 'src/app/domain/models/email/email-group-node.model';
import { Observable } from 'rxjs';

const API_PATH = 'ReceivedEmail/';

@Injectable({
  providedIn: 'root',
})
export class DataReceivedEmailService {
  private httpClient = inject(HttpClient);

  getList(skip: number, take: number, folder?: string, readFilter?: string, sortDirection?: string) {
    let url = `${environment.baseUrl}${API_PATH}List?skip=${skip}&take=${take}`;
    if (folder) {
      url += `&folder=${encodeURIComponent(folder)}`;
    }
    if (readFilter) {
      url += `&readFilter=${encodeURIComponent(readFilter)}`;
    }
    if (sortDirection) {
      url += `&sortDirection=${encodeURIComponent(sortDirection)}`;
    }
    return this.httpClient
      .get<IReceivedEmailListResponse>(url)
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

  restore(id: string) {
    return this.httpClient
      .put<boolean>(`${environment.baseUrl}${API_PATH}${id}/Restore`, {})
      .pipe(retry(3));
  }

  permanentlyDelete(id: string) {
    return this.httpClient
      .delete<boolean>(`${environment.baseUrl}${API_PATH}${id}/Permanent`)
      .pipe(retry(3));
  }

  moveToFolder(id: string, folder: string) {
    return this.httpClient
      .put<boolean>(`${environment.baseUrl}${API_PATH}${id}/MoveToFolder?folder=${encodeURIComponent(folder)}`, {})
      .pipe(retry(3));
  }

  fetchNow() {
    return this.httpClient
      .post<{ success: boolean; fetchedCount?: number; error?: string }>(
        `${environment.baseUrl}${API_PATH}FetchNow`,
        {}
      );
  }

  getEmailGroupTree(): Observable<IEmailGroupNode[]> {
    return this.httpClient.get<IEmailGroupNode[]>(`${environment.baseUrl}${API_PATH}GroupTree`).pipe(retry(3));
  }

  getEmailsByGroup(groupId: string, skip: number, take: number): Observable<IReceivedEmailListResponse> {
    return this.httpClient
      .get<IReceivedEmailListResponse>(
        `${environment.baseUrl}${API_PATH}ByGroup/${groupId}?skip=${skip}&take=${take}`
      )
      .pipe(retry(3));
  }

  getEmailsByClient(clientId: string, skip: number, take: number): Observable<IReceivedEmailListResponse> {
    return this.httpClient
      .get<IReceivedEmailListResponse>(
        `${environment.baseUrl}${API_PATH}ByClient/${clientId}?skip=${skip}&take=${take}`
      )
      .pipe(retry(3));
  }
}

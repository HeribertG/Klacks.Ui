// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IEmailFolder } from 'src/app/domain/models/email/email-folder.model';

const API_PATH = 'ReceivedEmail/Folders';

@Injectable({
  providedIn: 'root',
})
export class DataEmailFolderService {
  private httpClient = inject(HttpClient);

  getFolders(): Observable<IEmailFolder[]> {
    return this.httpClient
      .get<IEmailFolder[]>(`${environment.baseUrl}${API_PATH}`)
      .pipe(retry(3));
  }

  createFolder(name: string, imapFolderName: string): Observable<IEmailFolder> {
    return this.httpClient
      .post<IEmailFolder>(`${environment.baseUrl}${API_PATH}`, {
        name,
        imapFolderName,
      })
      .pipe(retry(3));
  }

  deleteFolder(id: string): Observable<boolean> {
    return this.httpClient
      .delete<boolean>(`${environment.baseUrl}${API_PATH}/${id}`)
      .pipe(retry(3));
  }
}

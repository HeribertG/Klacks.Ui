// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { IGroupItemRequest } from './group-item-request.interface';
import { environment } from 'src/environments/environment';
import { retryTransientHttpErrors } from 'src/app/infrastructure/helpers/http-retry.helper';

@Injectable({
  providedIn: 'root',
})
export class DataGroupItemService {
  private httpClient = inject(HttpClient);

  addGroupItem(value: IGroupItemRequest) {
    return this.httpClient
      .post(`${environment.baseUrl}GroupItems/`, value);
  }

  deleteGroupItem(clientId: string, groupId: string) {
    return this.httpClient
      .delete(`${environment.baseUrl}GroupItems/remove?clientId=${clientId}&groupId=${groupId}`)
      .pipe(retryTransientHttpErrors());
  }
}

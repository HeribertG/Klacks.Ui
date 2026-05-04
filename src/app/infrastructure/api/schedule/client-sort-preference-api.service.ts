// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for reading and saving the per-user, per-group client sort order.
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ClientSortOrderDto } from 'src/app/domain/models/schedule/client-sort-order.dto';

@Injectable({ providedIn: 'root' })
export class ClientSortPreferenceApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}clientsortpreferences`;

  getSortOrder(groupId: string): Promise<ClientSortOrderDto[]> {
    return firstValueFrom(
      this.http
        .get<ClientSortOrderDto[]>(`${this.baseUrl}/${groupId}`)
        .pipe(retry(2))
    );
  }

  saveSortOrder(groupId: string, order: ClientSortOrderDto[]): Promise<void> {
    return firstValueFrom(
      this.http.put<void>(`${this.baseUrl}/${groupId}`, order)
    );
  }
}

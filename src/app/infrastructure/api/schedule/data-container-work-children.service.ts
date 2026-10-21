// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * API service for loading and saving sub-works and sub-breaks of a container work entry.
 * @param workId - The ID of the parent container work entry
 * @param children - The ContainerWorkChildren payload for PUT requests
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ContainerWorkChildren } from '../../../domain/models/container/container-work-children.interface';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DataContainerWorkChildrenService {
  private httpClient = inject(HttpClient);

  loadChildren(workId: string, isHoliday = false): Observable<ContainerWorkChildren> {
    const params = new HttpParams().set('isHoliday', isHoliday.toString());
    return this.httpClient.get<ContainerWorkChildren>(`${environment.baseUrl}Works/${workId}/Children`, { params });
  }

  saveChildren(workId: string, children: ContainerWorkChildren): Observable<ContainerWorkChildren> {
    return this.httpClient.put<ContainerWorkChildren>(`${environment.baseUrl}Works/${workId}/Children`, children);
  }
}

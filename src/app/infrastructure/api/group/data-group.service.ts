// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';
import {
  GroupFilter,
  IGroup,
  IGroupTree,
  ITruncatedGroup,
} from 'src/app/domain/models/group/group-class';
import { companyToday, toCalendarDateWire } from 'src/app/shared/helpers/calendar-date.helper';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataGroupService {
  private httpClient = inject(HttpClient);

  readGroupList(filter: GroupFilter): Observable<ITruncatedGroup> {
    return this.httpClient
      .post<ITruncatedGroup>(
        `${environment.baseUrl}Groups/GetSimpleList/`,
        filter
      )
      .pipe();
  }

  getGroup(id: string): Observable<IGroup> {
    return this.httpClient
      .get<IGroup>(`${environment.baseUrl}Groups/` + id)
      .pipe(retry(3));
  }

  updateGroup(value: IGroup): Observable<IGroup> {
    const payload = this.toWirePayload(value);
    if (payload.groupItems) {
      payload.groupItems = payload.groupItems.filter(item => item.clientId != null);
    }

    return this.httpClient
      .put<IGroup>(`${environment.baseUrl}Groups/`, payload)
      .pipe(retry(3));
  }

  addGroup(value: IGroup): Observable<IGroup> {
    const { id: _id, ...rest } = value;
    return this.httpClient
      .post<IGroup>(`${environment.baseUrl}Groups/`, this.toWirePayload(rest))
      .pipe(retry(3));
  }

  deleteGroup(id: string): Observable<IGroup> {
    return this.httpClient
      .delete<IGroup>(`${environment.baseUrl}Groups/` + id)
      .pipe(retry(3));
  }

  getGroupTree(rootId?: string): Observable<IGroupTree> {
    let params = new HttpParams();
    if (rootId) {
      params = params.set('rootId', rootId);
    }

    return this.httpClient
      .get<IGroupTree>(`${environment.baseUrl}Groups/tree`, { params })
      .pipe(retry(3));
  }

  getPathToNode(id: string): Observable<IGroup[]> {
    return this.httpClient
      .get<IGroup[]>(`${environment.baseUrl}Groups/path/${id}`)
      .pipe(retry(3));
  }

  moveGroup(id: string, newParentId: string): Observable<IGroup> {
    const params = new HttpParams().set('newParentId', newParentId);

    return this.httpClient
      .post<IGroup>(`${environment.baseUrl}Groups/move/${id}`, null, {
        params,
      })
      .pipe(retry(3));
  }

  getRefreshTree(): Observable<void> {
    return this.httpClient
      .get<void>(`${environment.baseUrl}Groups/refresh`)
      .pipe(retry(3));
  }

  private toWirePayload(value: IGroup) {
    return {
      ...value,
      validFrom: toCalendarDateWire(value.validFrom || companyToday()),
      validUntil: value.validUntil ? toCalendarDateWire(value.validUntil) : undefined,
    };
  }
}

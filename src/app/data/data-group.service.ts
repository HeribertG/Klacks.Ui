import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';
import {
  GroupFilter,
  IGroup,
  IGroupTree,
  ITruncatedGroup,
} from '../core/group-class';
import {
  dateWithLocalTimeCorrection,
  isNgbDateStructOk,
  transformNgbDateStructToDate,
} from '../helpers/format-helper';
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
    this.setCorrectDate(value);
    return this.httpClient
      .put<IGroup>(`${environment.baseUrl}Groups/`, value)
      .pipe(retry(3));
  }

  addGroup(value: IGroup): Observable<IGroup> {
    delete value.id;

    this.setCorrectDate(value);
    return this.httpClient
      .post<IGroup>(`${environment.baseUrl}Groups/`, value)
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

  setCorrectDate(value: IGroup): void {
    if (isNgbDateStructOk(value!.internalValidFrom)) {
      value.validFrom = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(value!.internalValidFrom)
      )!;
    } else {
      value.validFrom = new Date();
    }
    value.validFrom = dateWithLocalTimeCorrection(value.validFrom)!;

    if (isNgbDateStructOk(value!.internalValidUntil)) {
      value.validUntil = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(value!.internalValidUntil)
      )!;
      value.validUntil = dateWithLocalTimeCorrection(value.validUntil)!;
    } else {
      value.validUntil = undefined;
    }
  }
}

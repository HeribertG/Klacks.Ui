import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { catchError, retry } from 'rxjs/operators';
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
import { Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataGroupService {
  constructor(private httpClient: HttpClient) {}

  readGroupList(filter: GroupFilter): Observable<ITruncatedGroup> {
    return this.httpClient
      .post<ITruncatedGroup>(
        `${environment.baseUrl}Groups/GetSimpleList/`,
        filter
      )
      .pipe(catchError(this.handleError));
  }

  getGroup(id: string): Observable<IGroup> {
    return this.httpClient
      .get<IGroup>(`${environment.baseUrl}Groups/` + id)
      .pipe(retry(3), catchError(this.handleError));
  }

  updateGroup(value: IGroup): Observable<IGroup> {
    this.setCorrectDate(value);
    return this.httpClient
      .put<IGroup>(`${environment.baseUrl}Groups/`, value)
      .pipe(retry(3), catchError(this.handleError));
  }

  addGroup(value: IGroup): Observable<IGroup> {
    delete value.id;

    this.setCorrectDate(value);
    return this.httpClient
      .post<IGroup>(`${environment.baseUrl}Groups/`, value)
      .pipe(retry(3), catchError(this.handleError));
  }

  deleteGroup(id: string): Observable<IGroup> {
    return this.httpClient
      .delete<IGroup>(`${environment.baseUrl}Groups/` + id)
      .pipe(retry(3), catchError(this.handleError));
  }

  getGroupTree(rootId?: string): Observable<IGroupTree> {
    let params = new HttpParams();
    if (rootId) {
      params = params.set('rootId', rootId);
    }

    return this.httpClient
      .get<IGroupTree>(`${environment.baseUrl}GroupTrees/tree`, { params })
      .pipe(retry(3), catchError(this.handleError));
  }

  getPathToNode(id: string): Observable<IGroup[]> {
    return this.httpClient
      .get<IGroup[]>(`${environment.baseUrl}GroupTrees/path/${id}`)
      .pipe(retry(3), catchError(this.handleError));
  }

  moveGroup(id: string, newParentId: string): Observable<IGroup> {
    let params = new HttpParams().set('newParentId', newParentId);

    return this.httpClient
      .post<IGroup>(`${environment.baseUrl}GroupTrees/move/${id}`, null, {
        params,
      })
      .pipe(retry(3), catchError(this.handleError));
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

  private handleError(error: any) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      // Client-seitiger Fehler
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-seitiger Fehler
      errorMessage = `Statuscode: ${error.status}\nMessage: ${error.message}`;
    }
    console.error('API-Fehler:', errorMessage);
    return throwError(() => errorMessage);
  }
}

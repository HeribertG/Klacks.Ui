/* eslint-disable @typescript-eslint/no-unused-vars */
import { inject, Injectable } from '@angular/core';
import { IGroup, IGroupVisibility } from '../core/group-class';
import { Observable, retry } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DataGroupVisibilityService {
  private httpClient = inject(HttpClient);

  getGroupVisibility(id: string): Observable<IGroupVisibility> {
    return this.httpClient
      .get<IGroupVisibility>(`${environment.baseUrl}GroupVisibilities/` + id)
      .pipe(retry(3));
  }

  updateGroupVisibility(value: IGroupVisibility): Observable<IGroupVisibility> {
    return this.httpClient
      .put<IGroupVisibility>(`${environment.baseUrl}GroupVisibilities/`, value)
      .pipe(retry(3));
  }

  addGroupVisibility(value: IGroupVisibility): Observable<IGroupVisibility> {
    delete value.id;

    return this.httpClient
      .post<IGroupVisibility>(`${environment.baseUrl}GroupVisibilities/`, value)
      .pipe(retry(3));
  }

  deleteGroupVisibility(id: string): Observable<IGroupVisibility> {
    return this.httpClient
      .delete<IGroupVisibility>(`${environment.baseUrl}GroupVisibilities/` + id)
      .pipe(retry(3));
  }

  getRoots(): Observable<IGroup[]> {
    return this.httpClient
      .get<IGroup[]>(`${environment.baseUrl}Groups/roots`)
      .pipe(retry(3));
  }

  getUserGroupVisibilities(id: string): Observable<IGroupVisibility[]> {
    return this.httpClient
      .get<IGroupVisibility[]>(
        `${environment.baseUrl}GroupVisibilities/GetSimpleList` + id
      )
      .pipe(retry(3));
  }

  getGroupVisibilities(): Observable<IGroupVisibility[]> {
    return this.httpClient
      .get<IGroupVisibility[]>(
        `${environment.baseUrl}GroupVisibilities/GetSimpleList`
      )
      .pipe(retry(3));
  }

  setGroupVisibilities(values: IGroupVisibility[]): Observable<void> {
    const valuesWithoutIds = values.map(({ id, ...rest }) => rest);
    return this.httpClient
      .post<void>(
        `${environment.baseUrl}GroupVisibilities/BulkList`,
        valuesWithoutIds
      )
      .pipe(retry(3));
  }
}

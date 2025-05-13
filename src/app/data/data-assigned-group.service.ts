import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, retry, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IAssignedGroup } from '../core/assigned-group-class';

Injectable({
  providedIn: 'root',
});
export class DataAssignedGroupService {
  private httpClient = inject(HttpClient);

  readAssignedGroupList(id: string | undefined) {
    return this.httpClient
      .get<IAssignedGroup[]>(`${environment.baseUrl}AssignedGroups/list/` + id)
      .pipe();
  }

  getAssignedGroup(id: string) {
    return this.httpClient
      .get<IAssignedGroup>(`${environment.baseUrl}AssignedGroups/` + id)
      .pipe(retry(3));
  }

  updateAssignedGroup(value: IAssignedGroup) {
    return this.httpClient
      .put<IAssignedGroup>(`${environment.baseUrl}AssignedGroups/`, value)
      .pipe(retry(3), catchError(this.handleError));
  }

  addAssignedGroup(value: IAssignedGroup) {
    delete value.id;

    return this.httpClient
      .post<IAssignedGroup>(`${environment.baseUrl}AssignedGroups/`, value)
      .pipe(retry(3), catchError(this.handleError));
  }

  deleteAssignedGroup(id: string) {
    return this.httpClient
      .delete<IAssignedGroup>(`${environment.baseUrl}AssignedGroups/` + id)
      .pipe(retry(3), catchError(this.handleError));
  }

  private handleError(error: any) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      // Client
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server
      errorMessage = `Statuscode: ${error.status}\nMessage: ${error.message}`;
    }
    return throwError(errorMessage);
  }
}

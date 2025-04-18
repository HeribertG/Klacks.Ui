import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, catchError, retry, throwError } from 'rxjs';
import {
  IGroupTree,
  IGroupCreate,
  IGroupUpdate,
  IGroup,
} from '../core/group-class';
import {
  dateWithLocalTimeCorrection,
  isNgbDateStructOk,
  transformNgbDateStructToDate,
} from '../helpers/format-helper';

@Injectable({
  providedIn: 'root',
})
export class DataGroupTreeService {
  constructor(private httpClient: HttpClient) {}

  /**
   * Holt den kompletten Gruppenbaum
   */
  getGroupTree(rootId?: string): Observable<IGroupTree> {
    let params = new HttpParams();
    if (rootId) {
      params = params.set('rootId', rootId);
    }

    return this.httpClient
      .get<IGroupTree>(`${environment.baseUrl}GroupTrees/tree`, { params })
      .pipe(retry(3), catchError(this.handleError));
  }

  /**
   * Holt Details zu einer spezifischen Gruppe
   */
  getGroupDetails(id: string): Observable<IGroup> {
    return this.httpClient
      .get<IGroup>(`${environment.baseUrl}GroupTrees/${id}`)
      .pipe(retry(3), catchError(this.handleError));
  }

  /**
   * Holt den Pfad von der Wurzel bis zum angegebenen Knoten
   */
  getPathToNode(id: string): Observable<IGroup[]> {
    return this.httpClient
      .get<IGroup[]>(`${environment.baseUrl}GroupTrees/path/${id}`)
      .pipe(retry(3), catchError(this.handleError));
  }

  /**
   * Erstellt eine neue Gruppe (als Wurzel oder als Kind einer bestehenden Gruppe)
   */
  createGroup(group: IGroupCreate, parentId?: string): Observable<IGroup> {
    let params = new HttpParams();
    if (parentId) {
      params = params.set('parentId', parentId);
    }

    return this.httpClient
      .post<IGroup>(`${environment.baseUrl}GroupTrees`, group, {
        params,
      })
      .pipe(retry(3), catchError(this.handleError));
  }

  /**
   * Aktualisiert eine bestehende Gruppe
   */
  updateGroup(id: string, group: IGroupUpdate): Observable<IGroup> {
    return this.httpClient
      .put<IGroup>(`${environment.baseUrl}GroupTrees/${id}`, group)
      .pipe(retry(3), catchError(this.handleError));
  }

  /**
   * Löscht eine Gruppe und all ihre Untergruppen
   */
  deleteGroup(id: string): Observable<void> {
    return this.httpClient
      .delete<void>(`${environment.baseUrl}GroupTrees/${id}`)
      .pipe(retry(3), catchError(this.handleError));
  }

  /**
   * Verschiebt eine Gruppe zu einem neuen Elternteil
   */
  moveGroup(id: string, newParentId: string): Observable<IGroup> {
    let params = new HttpParams().set('newParentId', newParentId);

    return this.httpClient
      .post<IGroup>(`${environment.baseUrl}GroupTrees/move/${id}`, null, {
        params,
      })
      .pipe(retry(3), catchError(this.handleError));
  }

  private prepareGroupForSending(group: any) {
    // Datumskonvertierung für die API
    if (isNgbDateStructOk(group.internalValidFrom)) {
      group.validFrom = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(group.internalValidFrom)
      )!;
    } else {
      group.validFrom = new Date();
    }
    group.validFrom = dateWithLocalTimeCorrection(group.validFrom)!;

    if (isNgbDateStructOk(group.internalValidUntil)) {
      group.validUntil = dateWithLocalTimeCorrection(
        transformNgbDateStructToDate(group.internalValidUntil)
      )!;
      group.validUntil = dateWithLocalTimeCorrection(group.validUntil)!;
    } else {
      group.validUntil = undefined;
    }

    return group;
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
    return throwError(() => errorMessage);
  }
}

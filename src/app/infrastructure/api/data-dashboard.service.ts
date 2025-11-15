import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { IGroupTree } from 'src/app/domain/models/group-class';
import { IClientLocationResource } from 'src/app/domain/models/dashboard-class';

@Injectable({
  providedIn: 'root',
})
export class DataDashboardService {
  private httpClient = inject(HttpClient);

  getClientsOverviewData(): Observable<IGroupTree> {
    return this.httpClient
      .get<IGroupTree>(`${environment.baseUrl}Groups/tree`)
      .pipe(retry(3));
  }

  getClientsLocationsData(): Observable<IClientLocationResource[]> {
    return this.httpClient
      .get<IClientLocationResource[]>(`${environment.baseUrl}Dashboard/ClientLocations`)
      .pipe(retry(3));
  }
}

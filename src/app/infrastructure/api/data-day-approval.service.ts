import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IDayApproval } from 'src/app/domain/models/day-approval-class';

@Injectable({
  providedIn: 'root',
})
export class DataDayApprovalService {
  private httpClient = inject(HttpClient);

  approveDay(approvalDate: string, groupId: string) {
    return this.httpClient
      .post<IDayApproval>(`${environment.baseUrl}DayApprovals`, {
        approvalDate,
        groupId,
      })
      .pipe(retry(3));
  }

  revokeApproval(id: string) {
    return this.httpClient
      .delete<boolean>(`${environment.baseUrl}DayApprovals/${id}`)
      .pipe(retry(3));
  }

  getApprovals(start: string, end: string, groupId?: string) {
    let params = new HttpParams().set('start', start).set('end', end);
    if (groupId) {
      params = params.set('groupId', groupId);
    }
    return this.httpClient
      .get<IDayApproval[]>(`${environment.baseUrl}DayApprovals`, { params })
      .pipe(retry(3));
  }
}

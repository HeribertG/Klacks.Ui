// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { IBranch } from 'src/app/domain/models/settings/branch';
import { retry } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DataBranchService {
  private httpClient = inject(HttpClient);

  getBranchList() {
    return this.httpClient
      .get<IBranch[]>(`${environment.baseUrl}Branch/GetBranchList`)
      .pipe(retry(3));
  }

  getBranch(id: string) {
    return this.httpClient
      .get<IBranch>(`${environment.baseUrl}Branch/GetBranch/` + id)
      .pipe(retry(3));
  }

  updateBranch(value: IBranch) {
    return this.httpClient
      .put<IBranch>(`${environment.baseUrl}Branch/PutBranch`, value)
      .pipe(retry(3));
  }

  addBranch(value: IBranch) {
    delete value.id;
    return this.httpClient
      .post<IBranch>(`${environment.baseUrl}Branch/AddBranch`, value)
      .pipe(retry(3));
  }

  deleteBranch(id: string) {
    return this.httpClient
      .delete<IBranch>(`${environment.baseUrl}Branch/DeleteBranch/` + id)
      .pipe(retry(3));
  }
}

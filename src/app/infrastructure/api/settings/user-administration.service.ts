// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  IAuthentication,
  ChangePassword,
  ChangeRole,
  ResponseAuthentication,
} from 'src/app/domain/models/authentification-class';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserAdministrationService {
  private httpClient = inject(HttpClient);

  readAccountsList(page = 0, pageSize = 1000): Observable<IAuthentication[]> {
    return this.httpClient
      .get<IAuthentication[]>(`${environment.baseUrl}Accounts/?page=${page}&pageSize=${pageSize}`)
      .pipe(retry(3));
  }

  getAccount(id: string): Observable<IAuthentication> {
    return this.httpClient
      .get<IAuthentication>(`${environment.baseUrl}Accounts/` + id)
      .pipe();
  }

  updateAccount(value: IAuthentication): Observable<IAuthentication> {
    return this.httpClient.put<IAuthentication>(
      `${environment.baseUrl}Accounts/`,
      value
    );
  }

  addAccount(value: IAuthentication): Observable<IAuthentication> {
    delete value.id;

    this.copyAccountData(value);

    return this.httpClient.post<IAuthentication>(
      `${environment.baseUrl}Accounts/RegisterUser/`,
      value
    );
  }

  deleteAccount(id: string): Observable<IAuthentication> {
    return this.httpClient.delete<IAuthentication>(
      `${environment.baseUrl}Accounts/` + id
    );
  }

  deactivateAccount(id: string): Observable<IAuthentication> {
    return this.httpClient.put<IAuthentication>(
      `${environment.baseUrl}Accounts/${id}/Deactivate`,
      {}
    );
  }

  reactivateAccount(id: string): Observable<IAuthentication> {
    return this.httpClient.put<IAuthentication>(
      `${environment.baseUrl}Accounts/${id}/Reactivate`,
      {}
    );
  }

  generateUsername(firstName: string, lastName: string): Observable<string> {
    return this.httpClient
      .get(`${environment.baseUrl}Accounts/GenerateUsername`, {
        params: { firstName, lastName },
        responseType: 'text'
      })
      .pipe(retry(1));
  }

  changePassword(value: ChangePassword): Observable<IAuthentication> {
    return this.httpClient
      .post<IAuthentication>(
        `${environment.baseUrl}Accounts/ChangePasswordUser/`,
        value
      )
      .pipe();
  }

  changeRole(value: ChangeRole) {
    return this.httpClient
      .put(`${environment.baseUrl}Accounts/ChangeRoleUser`, value)
      .pipe();
  }

  reorderAccounts(orderedUserIds: string[]) {
    return this.httpClient
      .put(`${environment.baseUrl}Accounts/Reorder`, { orderedUserIds })
      .pipe();
  }

  ChangePassword(value: ChangePassword): Observable<ResponseAuthentication> {
    return this.httpClient
      .put<ResponseAuthentication>(
        `${environment.baseUrl}Accounts/ChangePassword`,
        value
      )
      .pipe();
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.httpClient
      .post<any>(`${environment.baseUrl}Accounts/RequestPasswordReset`, {
        email,
      })
      .pipe();
  }

  copyAccountData(value: IAuthentication): void {
    let data = `${value.firstName} ${value.lastName}\n`;
    data = data + `Username: ${value.userName}\n`;
    data = data + `Email: ${value.email}\n`;
    data = data + `Password: ${value.password}\n`;

    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = data;
    document.body.appendChild(selBox);

    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
  }
}

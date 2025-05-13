import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  IAuthentication,
  ChangePassword,
  ChangeRole,
  ResponseAuthentication,
} from 'src/app/core/authentification-class';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserAdministrationService {
  private httpClient = inject(HttpClient);

  readAccountsList(): Observable<IAuthentication[]> {
    return this.httpClient
      .get<IAuthentication[]>(`${environment.baseUrl}Accounts/`)
      .pipe(retry(3));
  }

  getAccount(id: string): Observable<IAuthentication> {
    return this.httpClient
      .get<IAuthentication>(`${environment.baseUrl}Accounts/` + id)
      .pipe();
  }

  updateAccount(value: IAuthentication): Observable<IAuthentication> {
    return this.httpClient
      .put<IAuthentication>(`${environment.baseUrl}Accounts/`, value)
      .pipe(retry(3));
  }

  addAccount(value: IAuthentication): Observable<IAuthentication> {
    delete value.id;

    this.copyAccountData(value);

    return this.httpClient
      .post<IAuthentication>(
        `${environment.baseUrl}Accounts/RegisterUser/`,
        value
      )
      .pipe(retry(1));
  }

  deleteAccount(id: string): Observable<IAuthentication> {
    return this.httpClient
      .delete<IAuthentication>(`${environment.baseUrl}Accounts/` + id)
      .pipe(retry(3));
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

  ChangePassword(value: ChangePassword): Observable<ResponseAuthentication> {
    return this.httpClient
      .put<ResponseAuthentication>(
        `${environment.baseUrl}Accounts/ChangePassword`,
        value
      )
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

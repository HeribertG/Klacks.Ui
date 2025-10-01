/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { retry } from 'rxjs/operators';
import { ISetting } from 'src/app/domain/models/settings-various-class';
import {
  EmailTestRequest,
  EmailTestResult,
} from 'src/app/domain/models/email-test.interface';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataSettingsVariousService {
  private httpClient = inject(HttpClient);

  readSetting(value: string): Observable<ISetting> {
    return this.httpClient
      .get<ISetting>(`${environment.baseUrl}GeneralSettings/GetSetting/` + value)
      .pipe(retry(3));
  }

  updateSetting(value: ISetting): Observable<ISetting> {
    return this.httpClient
      .put<ISetting>(`${environment.baseUrl}GeneralSettings/PutSetting/`, value)
      .pipe(retry(3));
  }

  addSetting(value: ISetting): Observable<ISetting> {
    return this.httpClient
      .post<ISetting>(`${environment.baseUrl}GeneralSettings/AddSetting/`, value)
      .pipe(retry(3));
  }

  readSettingList(): Observable<ISetting[]> {
    return this.httpClient
      .get<ISetting[]>(`${environment.baseUrl}GeneralSettings/GetSettingsList`)
      .pipe();
  }

  testEmailConfiguration(config: any): Observable<EmailTestResult> {
    const emailTestRequest: EmailTestRequest = {
      server: config.server?.trim() || '',
      port: config.port?.trim() || '',
      username: config.username?.trim() || '',
      password: config.password || '', // Don't trim password
      enableSSL: config.enableSSL === 'true',
      authenticationType: config.authType?.trim() || '',
      timeout: 45000, // 45 seconds timeout for email test
    };

    return this.httpClient
      .post<EmailTestResult>(
        `${environment.baseUrl}GeneralSettings/TestEmailConfiguration`,
        emailTestRequest
      )
      .pipe(retry(1));
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { retry } from 'rxjs/operators';
import { ISetting } from '../core/settings-various-class';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataSettingsVariousService {
  constructor(private httpClient: HttpClient) {}

  readSetting(value: string): Observable<ISetting> {
    return this.httpClient
      .get<ISetting>(`${environment.baseUrl}Settings/GetSetting/` + value)
      .pipe(retry(3));
  }

  updateSetting(value: ISetting): Observable<ISetting> {
    return this.httpClient
      .put<ISetting>(`${environment.baseUrl}Settings/PutSetting/`, value)
      .pipe(retry(3));
  }

  addSetting(value: ISetting): Observable<ISetting> {
    return this.httpClient
      .post<ISetting>(`${environment.baseUrl}Settings/AddSetting/`, value)
      .pipe(retry(3));
  }

  readSettingList(): Observable<ISetting[]> {
    return this.httpClient
      .get<ISetting[]>(`${environment.baseUrl}Settings/GetSettingsList`)
      .pipe();
  }
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IContainerTemplate } from 'src/app/domain/models/container-template-class';
import { IShift } from 'src/app/domain/models/shift-class';

@Injectable({
  providedIn: 'root',
})
export class DataContainerTemplateService {
  private httpClient = inject(HttpClient);

  getAvailableTasks(
    containerId: string,
    weekdays: number[],
    fromTime: string,
    untilTime: string,
    searchString?: string,
    excludeContainerId?: string,
    isHoliday?: boolean,
    isWeekdayOrHoliday?: boolean
  ) {
    let params = new HttpParams();
    params = params.append('containerId', containerId);
    weekdays.forEach(day => {
      params = params.append('weekdays', day.toString());
    });
    params = params.append('fromTime', fromTime);
    params = params.append('untilTime', untilTime);
    if (searchString) {
      params = params.append('searchString', searchString);
    }
    if (excludeContainerId) {
      params = params.append('excludeContainerId', excludeContainerId);
    }
    if (isHoliday !== undefined) {
      params = params.append('isHoliday', isHoliday.toString());
    }
    if (isWeekdayOrHoliday !== undefined) {
      params = params.append('isWeekdayOrHoliday', isWeekdayOrHoliday.toString());
    }

    return this.httpClient
      .get<IShift[]>(`${environment.baseUrl}Containers/available-tasks`, { params })
      .pipe(retry(3));
  }

  getTemplates(containerId: string) {
    return this.httpClient
      .get<IContainerTemplate[]>(`${environment.baseUrl}Containers/${containerId}/templates`)
      .pipe(retry(3));
  }

  addTemplates(containerId: string, values: IContainerTemplate[]) {
    values.forEach(v => delete v.id);
    return this.httpClient
      .post<IContainerTemplate[]>(`${environment.baseUrl}Containers/${containerId}/templates`, values)
      .pipe(retry(3));
  }

  updateTemplates(containerId: string, values: IContainerTemplate[]) {
    return this.httpClient
      .put<IContainerTemplate[]>(`${environment.baseUrl}Containers/${containerId}/templates`, values)
      .pipe(retry(3));
  }

  deleteTemplates(containerId: string) {
    return this.httpClient
      .delete<IContainerTemplate[]>(`${environment.baseUrl}Containers/${containerId}/templates`)
      .pipe(retry(3));
  }
}

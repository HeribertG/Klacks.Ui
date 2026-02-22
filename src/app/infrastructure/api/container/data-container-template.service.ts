// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IContainerTemplate } from 'src/app/domain/models/container/container-template-class';
import { IShift } from 'src/app/domain/models/shift/shift-class';

@Injectable({
  providedIn: 'root',
})
export class DataContainerTemplateService {
  private httpClient = inject(HttpClient);

  getAvailableTasks(
    containerId: string,
    weekday: number,
    fromTime: string,
    untilTime: string,
    searchString?: string,
    excludeContainerId?: string,
    isHoliday?: boolean,
    isWeekdayAndHoliday?: boolean
  ) {
    let params = new HttpParams();
    params = params.append('containerId', containerId);
    params = params.append('weekday', weekday.toString());
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
    if (isWeekdayAndHoliday !== undefined) {
      params = params.append(
        'isWeekdayAndHoliday',
        isWeekdayAndHoliday.toString()
      );
    }

    return this.httpClient
      .get<IShift[]>(`${environment.baseUrl}Containers/available-tasks`, {
        params,
      })
      .pipe(retry(3));
  }

  getTemplates(containerId: string) {
    return this.httpClient
      .get<IContainerTemplate[]>(
        `${environment.baseUrl}Containers/${containerId}/templates`
      )
      .pipe(retry(3));
  }

  postTemplates(containerId: string, values: IContainerTemplate[]) {
    const cleanedValues = JSON.parse(JSON.stringify(values));
    this.deleteUnnecessaryShiftObject(cleanedValues);
    cleanedValues.forEach((v: IContainerTemplate) => delete v.id);
    return this.httpClient
      .post<IContainerTemplate[]>(
        `${environment.baseUrl}Containers/${containerId}/templates`,
        cleanedValues
      )
      .pipe(retry(3));
  }

  putTemplates(containerId: string, values: IContainerTemplate[]) {
    const cleanedValues = JSON.parse(JSON.stringify(values));
    this.deleteUnnecessaryShiftObjectForPut(cleanedValues);
    return this.httpClient
      .put<IContainerTemplate[]>(
        `${environment.baseUrl}Containers/${containerId}/templates`,
        cleanedValues
      )
      .pipe(retry(3));
  }

  deleteTemplates(containerId: string) {
    return this.httpClient
      .delete<IContainerTemplate[]>(
        `${environment.baseUrl}Containers/${containerId}/templates`
      )
      .pipe(retry(3));
  }

  private deleteUnnecessaryShiftObject(values: IContainerTemplate[]): void {
    values.forEach(template => {
      delete template.shift;
      template.containerTemplateItems?.forEach(containerTemplateItem => {
        delete containerTemplateItem.shift;
        delete containerTemplateItem.id;
        delete containerTemplateItem.containerTemplateId;
      });
    });
  }

  private deleteUnnecessaryShiftObjectForPut(values: IContainerTemplate[]): void {
    values.forEach(template => {
      delete template.shift;
      template.containerTemplateItems?.forEach(containerTemplateItem => {
        delete containerTemplateItem.shift;
      });
    });
  }
}

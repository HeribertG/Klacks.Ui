// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for loading and saving sub-works and sub-breaks of a container work entry.
 * @param workId - The ID of the parent container work entry
 * @param children - The ContainerWorkChildren payload for PUT requests
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface SubWorkResource {
  id: string;
  shiftId: string;
  clientId: string;
  currentDate: string;
  startTime: string;
  endTime: string;
  workTime: number;
  parentWorkId: string;
  information: string | null;
  transportMode: number | null;
  startBase: string | null;
  endBase: string | null;
  shift?: {
    id: string;
    name: string;
    abbreviation: string;
    startShift: string;
    endShift: string;
    workTime: number;
    clientId: string;
    isTimeRange: boolean;
    isSporadic: boolean;
    client?: {
      id: string;
      name: string | null;
      firstName: string | null;
      company: string | null;
      addresses?: {
        id: string;
        street: string | null;
        zip: string | null;
        city: string | null;
        latitude: number | null;
        longitude: number | null;
      }[];
    };
  };
}

export interface SubBreakResource {
  id: string;
  absenceId: string;
  clientId: string;
  currentDate: string;
  startTime: string;
  endTime: string;
  workTime: number;
  parentWorkId: string;
  absence?: {
    id: string;
    name: Record<string, string>;
    abbreviation: Record<string, string>;
    color: string;
    description: Record<string, string>;
    appliesToContainer: boolean;
    isUnpaid: boolean;
  };
}

export interface WorkChangeResource {
  id: string;
  workId: string;
  changeTime: number;
  surcharges: number;
  startTime: string;
  endTime: string;
  type: number;
  replaceClientId: string | null;
  description: string;
  toInvoice: boolean;
}

export interface ContainerWorkChildren {
  subWorks: SubWorkResource[];
  subBreaks: SubBreakResource[];
  subWorkChanges: WorkChangeResource[];
  parentStartBase?: string | null;
  parentEndBase?: string | null;
  parentTransportMode?: number | null;
  parentWorkTime?: number;
  parentStartTime?: string | null;
  parentEndTime?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class DataContainerWorkChildrenService {
  private httpClient = inject(HttpClient);

  loadChildren(workId: string, isHoliday = false): Observable<ContainerWorkChildren> {
    const params = new HttpParams().set('isHoliday', isHoliday.toString());
    return this.httpClient.get<ContainerWorkChildren>(`${environment.baseUrl}Works/${workId}/Children`, { params });
  }

  saveChildren(workId: string, children: ContainerWorkChildren): Observable<ContainerWorkChildren> {
    return this.httpClient.put<ContainerWorkChildren>(`${environment.baseUrl}Works/${workId}/Children`, children);
  }
}

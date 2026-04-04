// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for loading and saving sub-works and sub-breaks of a container work entry.
 * @param workId - The ID of the parent container work entry
 * @param children - The ContainerWorkChildren payload for PUT requests
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
}

export interface ContainerWorkChildren {
  subWorks: SubWorkResource[];
  subBreaks: SubBreakResource[];
}

@Injectable({
  providedIn: 'root',
})
export class DataContainerWorkChildrenService {
  private httpClient = inject(HttpClient);

  loadChildren(workId: string): Observable<ContainerWorkChildren> {
    return this.httpClient.get<ContainerWorkChildren>(`${environment.baseUrl}Works/${workId}/Children`);
  }

  saveChildren(workId: string, children: ContainerWorkChildren): Observable<ContainerWorkChildren> {
    return this.httpClient.put<ContainerWorkChildren>(`${environment.baseUrl}Works/${workId}/Children`, children);
  }
}

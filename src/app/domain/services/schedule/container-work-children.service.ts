// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Domain service for loading and saving children (sub-works and sub-breaks) of a container work entry.
 * @param workId - The ID of the parent container work entry
 * @param children - The full ContainerWorkChildren payload used for saving
 */

import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataContainerWorkChildrenService, ContainerWorkChildren } from 'src/app/infrastructure/api/schedule/data-container-work-children.service';

export { ContainerWorkChildren, SubWorkResource, SubBreakResource, WorkChangeResource } from 'src/app/infrastructure/api/schedule/data-container-work-children.service';

@Injectable({
  providedIn: 'root',
})
export class ContainerWorkChildrenService {
  private api = inject(DataContainerWorkChildrenService);

  loadChildren(workId: string, isHoliday = false): Observable<ContainerWorkChildren> {
    return this.api.loadChildren(workId, isHoliday);
  }

  saveChildren(workId: string, children: ContainerWorkChildren): Observable<ContainerWorkChildren> {
    return this.api.saveChildren(workId, children);
  }
}

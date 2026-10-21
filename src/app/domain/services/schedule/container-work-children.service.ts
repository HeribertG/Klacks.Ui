// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Domain service for loading and saving children (sub-works and sub-breaks) of a container work entry.
 * @param workId - The ID of the parent container work entry
 * @param children - The full ContainerWorkChildren payload used for saving
 */

import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DataContainerWorkChildrenService,
} from 'src/app/infrastructure/api/schedule/data-container-work-children.service';
import { ContainerWorkChildren } from 'src/app/domain/models/container/container-work-children.interface';

export { ContainerWorkChildren } from 'src/app/domain/models/container/container-work-children.interface';
export { SubWorkResource } from 'src/app/domain/models/container/sub-work-resource.interface';
export { SubBreakResource } from 'src/app/domain/models/container/sub-break-resource.interface';
export { WorkChangeResource } from 'src/app/domain/models/container/work-change-resource.interface';

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

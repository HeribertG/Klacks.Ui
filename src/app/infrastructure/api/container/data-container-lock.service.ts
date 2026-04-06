// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * API service for acquiring, refreshing and releasing container edit locks.
 * @param resourceType - "ContainerTemplate" or "ContainerWork"
 * @param resourceId - The id of the container resource
 */
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IContainerLock } from 'src/app/domain/models/container/container-lock';

@Injectable({ providedIn: 'root' })
export class DataContainerLockService {
  private httpClient = inject(HttpClient);

  acquire(resourceType: string, resourceId: string, instanceId: string): Observable<IContainerLock> {
    return this.httpClient.post<IContainerLock>(
      `${environment.baseUrl}ContainerLocks/Acquire`,
      { resourceType, resourceId, instanceId },
    );
  }

  heartbeat(lockId: string): Observable<IContainerLock> {
    return this.httpClient.post<IContainerLock>(
      `${environment.baseUrl}ContainerLocks/Heartbeat/${lockId}`,
      {},
    );
  }

  release(lockId: string): Observable<boolean> {
    return this.httpClient.delete<boolean>(`${environment.baseUrl}ContainerLocks/${lockId}`);
  }
}

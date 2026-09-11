// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Whether the realtime (SignalR) connection is up, as seen by the application layer, and the token
 * through which it is provided.
 */
import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export interface IRealtimeConnectionStatus {
  readonly connected$: Observable<boolean>;
}

export const REALTIME_CONNECTION_STATUS = new InjectionToken<IRealtimeConnectionStatus>(
  'IRealtimeConnectionStatus',
);

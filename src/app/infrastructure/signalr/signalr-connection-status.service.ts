// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Publishes whether the main SignalR hub is connected, as an Observable for the application layer,
 * which must not depend on the SignalR infrastructure itself. Emits the current value first and then
 * once per change.
 */
import { Injectable, computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { IRealtimeConnectionStatus } from 'src/app/domain/interfaces/realtime-connection-status.interface';
import { SignalRService } from './signalr.service';
import { SignalRConnectionState } from './signalr-connection-state';

const CONNECTED_STATE: SignalRConnectionState = 'Connected';

@Injectable({
  providedIn: 'root',
})
export class SignalRConnectionStatusService implements IRealtimeConnectionStatus {
  private readonly signalR = inject(SignalRService);

  readonly connected$ = toObservable(computed(() => this.signalR.state() === CONNECTED_STATE));
}

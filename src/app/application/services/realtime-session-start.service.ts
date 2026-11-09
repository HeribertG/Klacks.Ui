// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Opens the realtime connections of a session that has just been signed in (schedule hub and assistant hub), after
 * clearing a SignalR authentication failure left over from the previous session. Shared by every way into a session:
 * the login form, the OAuth2 callback and the own-admin setup, which signs the new admin in directly.
 * @param signalRService - Schedule hub connection
 * @param assistantSignalRService - Assistant hub connection
 */
import { inject, Injectable } from '@angular/core';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';

@Injectable({ providedIn: 'root' })
export class RealtimeSessionStartService {
  private readonly signalRService = inject(SignalRService);
  private readonly assistantSignalRService = inject(AssistantSignalRService);

  startAfterSignIn(): void {
    this.signalRService.resetAuthFailure();
    void this.signalRService.startConnection();
    void this.assistantSignalRService.startConnection();
  }
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { SignalRService } from 'src/app/infrastructure/signalr/signalr.service';
import { RealtimeSessionStartService } from './realtime-session-start.service';

describe('RealtimeSessionStartService', () => {
  it('clears the previous auth failure before it opens both hub connections', () => {
    const signalR: any = { resetAuthFailure: vi.fn(), startConnection: vi.fn().mockResolvedValue(undefined) };
    const assistantSignalR: any = { startConnection: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({
      providers: [
        { provide: SignalRService, useValue: signalR },
        { provide: AssistantSignalRService, useValue: assistantSignalR },
      ],
    });

    TestBed.inject(RealtimeSessionStartService).startAfterSignIn();

    expect(signalR.resetAuthFailure).toHaveBeenCalled();
    expect(signalR.resetAuthFailure.mock.invocationCallOrder[0]).toBeLessThan(
      signalR.startConnection.mock.invocationCallOrder[0]
    );
    expect(assistantSignalR.startConnection).toHaveBeenCalled();
  });
});

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SignalRConnectionStatusService } from './signalr-connection-status.service';
import { SignalRService } from './signalr.service';
import { SignalRConnectionState } from './signalr-connection-state';

describe('SignalRConnectionStatusService', () => {
  it('reports whether the main hub is connected, first the current value and then once per change', () => {
    const state = signal<SignalRConnectionState>('Idle');
    TestBed.configureTestingModule({ providers: [{ provide: SignalRService, useValue: { state } }] });
    const emitted: boolean[] = [];
    TestBed.inject(SignalRConnectionStatusService).connected$.subscribe((connected) => emitted.push(connected));

    TestBed.tick();
    state.set('Connecting');
    TestBed.tick();
    state.set('Connected');
    TestBed.tick();
    state.set('Reconnecting');
    TestBed.tick();
    state.set('Connected');
    TestBed.tick();

    expect(emitted).toEqual([false, true, false, true]);
  });
});

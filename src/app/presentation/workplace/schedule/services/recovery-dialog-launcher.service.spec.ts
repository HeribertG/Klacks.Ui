// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { IRecoveryDialogPreset, RecoveryDialogLauncherService } from './recovery-dialog-launcher.service';

describe('RecoveryDialogLauncherService', () => {
  let service: RecoveryDialogLauncherService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecoveryDialogLauncherService);
  });

  it('delivers the preset to the subscribed dialog', () => {
    const received: IRecoveryDialogPreset[] = [];
    service.requests$.subscribe((preset) => received.push(preset));

    const date = new Date(2026, 9, 6);
    service.requestOpen({ clientId: 'client-1', date });

    expect(received).toEqual([{ clientId: 'client-1', date }]);
  });

  it('delivers an empty preset when called without arguments', () => {
    const received: IRecoveryDialogPreset[] = [];
    service.requests$.subscribe((preset) => received.push(preset));

    service.requestOpen();

    expect(received).toEqual([{}]);
  });

  it('delivers two identical requests in a row as two events', () => {
    let count = 0;
    service.requests$.subscribe(() => count++);

    service.requestOpen({ clientId: 'client-1' });
    service.requestOpen({ clientId: 'client-1' });

    expect(count).toBe(2);
  });

  it('does not replay requests to a late subscriber', () => {
    service.requestOpen({ clientId: 'client-1' });

    let count = 0;
    service.requests$.subscribe(() => count++);

    expect(count).toBe(0);
  });
});

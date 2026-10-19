// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * A second bus instance behind EVENT_BUS_TOKEN swallowed every success/error toast emitted by the
 * services, because the domain event handler listens on the EventBus class instance.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { TestBed } from '@angular/core/testing';
import { EVENT_BUS_TOKEN } from '../../domain/interfaces/event-bus.interface';
import { DomainEventType } from '../../domain/events/domain-events';
import { EventBus } from './event-bus.service';
import { EVENT_BUS_PROVIDER } from './event-bus.provider';

const SPEC_DIR = dirname(fileURLToPath(import.meta.url));

describe('EVENT_BUS_PROVIDER', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [EVENT_BUS_PROVIDER] });
  });

  it('hands out the root EventBus instance for the token', () => {
    expect(TestBed.inject(EVENT_BUS_TOKEN)).toBe(TestBed.inject(EventBus));
  });

  it('delivers an event emitted through the token to a listener on EventBus', () => {
    const received: unknown[] = [];
    TestBed.inject(EventBus).on(DomainEventType.SUCCESS).subscribe((payload) => received.push(payload));

    TestBed.inject(EVENT_BUS_TOKEN).emit(DomainEventType.SUCCESS, { message: 'uploaded' });

    expect(received).toEqual([{ message: 'uploaded' }]);
  });

  it('is the provider the application config registers for the token', () => {
    const appConfigSource = readFileSync(resolve(SPEC_DIR, '../../app.config.ts'), 'utf8');

    expect(appConfigSource).toContain('EVENT_BUS_PROVIDER');
    expect(appConfigSource).not.toMatch(/provide:\s*EVENT_BUS_TOKEN/);
  });
});

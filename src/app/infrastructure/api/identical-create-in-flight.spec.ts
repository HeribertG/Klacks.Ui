// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from 'src/environments/environment';
import { IDEMPOTENCY_KEY_HEADER } from 'src/app/domain/constants/idempotency-key.constants';
import { Work } from 'src/app/domain/models/schedule/schedule-class';
import { Break } from 'src/app/domain/models/break/break-class';
import { BreakPlaceholder } from 'src/app/domain/models/break/break-placeholder-class';
import { WorkChangeRequest } from 'src/app/domain/models/workchange/work-change';
import { ExpensesRequest } from 'src/app/domain/models/expenses/expenses';
import { DataScheduleService } from './schedule/data-schedule.service';
import { DataBreakService } from './break/data-break.service';
import { DataBreakPlaceholderService } from './break/data-break-placeholder.service';
import { DataWorkChangeService } from './workchange/data-work-change.service';
import { DataExpensesService } from './expenses/data-expenses.service';

interface GuardedCreate {
  name: string;
  url: string;
  send: (variant: string) => Observable<unknown>;
}

function work(clientId: string): Work {
  const value = new Work();
  value.clientId = clientId;
  return value;
}

function absence(clientId: string): Break {
  const value = new Break();
  value.clientId = clientId;
  return value;
}

function ganttEntry(clientId: string): BreakPlaceholder {
  const value = new BreakPlaceholder();
  value.clientId = clientId;
  return value;
}

describe('an identical create while the first is in flight', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function guardedCreates(): GuardedCreate[] {
    const schedule = TestBed.inject(DataScheduleService);
    const breaks = TestBed.inject(DataBreakService);
    const placeholders = TestBed.inject(DataBreakPlaceholderService);
    const workChanges = TestBed.inject(DataWorkChangeService);
    const expenses = TestBed.inject(DataExpensesService);
    const base = environment.baseUrl;
    return [
      { name: 'work', url: `${base}Works/`, send: (v) => schedule.addWork(work(v)) },
      { name: 'absence (break)', url: `${base}Breaks/`, send: (v) => breaks.addBreak(absence(v)) },
      { name: 'absence gantt entry', url: `${base}BreakPlaceholders/`, send: (v) => placeholders.addBreak(ganttEntry(v)) },
      { name: 'work change', url: `${base}Works/Changes`, send: (v) => workChanges.create({ workId: v } as WorkChangeRequest) },
      { name: 'expenses', url: `${base}Expenses`, send: (v) => expenses.create({ workId: v } as ExpensesRequest) },
    ];
  }

  it('sends one request; the second caller completes without a value', () => {
    for (const call of guardedCreates()) {
      const firstValues: unknown[] = [];
      const secondValues: unknown[] = [];
      let secondCompleted = false;

      call.send('client-1').subscribe((value) => firstValues.push(value));
      call.send('client-1').subscribe({
        next: (value) => secondValues.push(value),
        complete: () => (secondCompleted = true),
      });

      const requests = http.match(call.url);
      expect(requests.length, call.name).toBe(1);
      requests[0].flush({ id: 'server-id' });

      expect(firstValues, call.name).toEqual([{ id: 'server-id' }]);
      expect(secondValues, call.name).toEqual([]);
      expect(secondCompleted, call.name).toBe(true);
    }
  });

  it('sends an identical create again once the first has answered, with a new key', () => {
    for (const call of guardedCreates()) {
      call.send('client-1').subscribe();
      const first = http.expectOne(call.url);
      const firstKey = first.request.headers.get(IDEMPOTENCY_KEY_HEADER);
      first.flush({ id: 'server-id' });

      call.send('client-1').subscribe();
      const second = http.expectOne(call.url);
      const secondKey = second.request.headers.get(IDEMPOTENCY_KEY_HEADER);
      second.flush({ id: 'server-id-2' });

      expect(secondKey, call.name).not.toBe(firstKey);
    }
  });

  it('sends an identical create again once the first has failed', () => {
    for (const call of guardedCreates()) {
      call.send('client-1').subscribe({ error: () => undefined });
      http.expectOne(call.url).flush({ title: 'Conflict' }, { status: 409, statusText: 'Conflict' });

      call.send('client-1').subscribe();
      http.expectOne(call.url).flush({ id: 'server-id' });
    }
  });

  it('sends an identical create again once the first was unsubscribed', () => {
    for (const call of guardedCreates()) {
      const subscription = call.send('client-1').subscribe();
      const cancelledRequest = http.expectOne(call.url);
      subscription.unsubscribe();
      expect(cancelledRequest.cancelled, call.name).toBe(true);

      call.send('client-1').subscribe();
      http.expectOne(call.url).flush({ id: 'server-id' });
    }
  });

  it('sends both creates when their payloads differ', () => {
    for (const call of guardedCreates()) {
      call.send('client-1').subscribe();
      call.send('client-2').subscribe();

      const requests = http.match(call.url);
      expect(requests.length, call.name).toBe(2);
      requests.forEach((request) => request.flush({}));
    }
  });
});

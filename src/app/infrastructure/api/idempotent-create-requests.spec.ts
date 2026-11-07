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
import { BulkAddWorksRequest } from 'src/app/domain/models/dtos/bulk-add-works-request.dto';
import { BulkAddBreaksRequest } from 'src/app/domain/models/dtos/bulk-add-breaks-request.dto';
import { WorkChangeRequest } from 'src/app/domain/models/workchange/work-change';
import { ExpensesRequest } from 'src/app/domain/models/expenses/expenses';
import { DataScheduleService } from './schedule/data-schedule.service';
import { DataBreakService } from './break/data-break.service';
import { DataBreakPlaceholderService } from './break/data-break-placeholder.service';
import { DataWorkChangeService } from './workchange/data-work-change.service';
import { DataExpensesService } from './expenses/data-expenses.service';

interface CreateCall {
  name: string;
  url: string;
  send: () => Observable<unknown>;
}

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('creating requests carry an Idempotency-Key', () => {
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

  function createCalls(): CreateCall[] {
    const schedule = TestBed.inject(DataScheduleService);
    const breaks = TestBed.inject(DataBreakService);
    const placeholders = TestBed.inject(DataBreakPlaceholderService);
    const workChanges = TestBed.inject(DataWorkChangeService);
    const expenses = TestBed.inject(DataExpensesService);
    const base = environment.baseUrl;
    return [
      { name: 'work', url: `${base}Works/`, send: () => schedule.addWork(new Work()) },
      {
        name: 'bulk works',
        url: `${base}Works/Bulk`,
        send: () => schedule.bulkAddWorks({ works: [], periodStart: '2026-01-01', periodEnd: '2026-01-31' } as BulkAddWorksRequest),
      },
      { name: 'absence (break)', url: `${base}Breaks/`, send: () => breaks.addBreak(new Break()) },
      {
        name: 'bulk absences (breaks)',
        url: `${base}Breaks/Bulk`,
        send: () => breaks.bulkAddBreaks({} as BulkAddBreaksRequest),
      },
      { name: 'absence gantt entry', url: `${base}BreakPlaceholders/`, send: () => placeholders.addBreak(new BreakPlaceholder()) },
      { name: 'work change', url: `${base}Works/Changes`, send: () => workChanges.create({} as WorkChangeRequest) },
      { name: 'expenses', url: `${base}Expenses`, send: () => expenses.create({} as ExpensesRequest) },
    ];
  }

  function keyOf(url: string): string | null {
    const request = http.expectOne(url);
    const key = request.request.headers.get(IDEMPOTENCY_KEY_HEADER);
    request.flush({});
    return key;
  }

  it('sends a GUID key with every creating request', () => {
    for (const call of createCalls()) {
      call.send().subscribe();
      expect(keyOf(call.url), call.name).toMatch(GUID_PATTERN);
    }
  });

  it('gives two user actions two different keys', () => {
    for (const call of createCalls()) {
      call.send().subscribe();
      const first = keyOf(call.url);
      call.send().subscribe();
      const second = keyOf(call.url);

      expect(second, call.name).not.toBe(first);
    }
  });

  it.each<[string, string, (s: DataScheduleService) => Observable<unknown>]>([
    ['work', 'Works/', (s) => s.addWork(new Work())],
    ['bulk works', 'Works/Bulk', (s) => s.bulkAddWorks({ works: [], periodStart: '', periodEnd: '' } as BulkAddWorksRequest)],
  ])('repeats a %s booking after a lost answer (status 0) with the same key', (_name, path, send) => {
    const url = `${environment.baseUrl}${path}`;
    let result: unknown;
    send(TestBed.inject(DataScheduleService)).subscribe((value: unknown) => (result = value));

    const lost = http.expectOne(url);
    const firstKey = lost.request.headers.get(IDEMPOTENCY_KEY_HEADER);
    lost.error(new ProgressEvent('error'), { status: 0 });
    const retried = http.expectOne(url);
    const retriedKey = retried.request.headers.get(IDEMPOTENCY_KEY_HEADER);
    retried.flush({ id: 'server-id' });

    expect(firstKey).toMatch(GUID_PATTERN);
    expect(retriedKey).toBe(firstKey);
    expect(result).toEqual({ id: 'server-id' });
  });

  it('repeats an absence gantt entry after a lost answer with the same key', () => {
    const url = `${environment.baseUrl}BreakPlaceholders/`;
    TestBed.inject(DataBreakPlaceholderService).addBreak(new BreakPlaceholder()).subscribe();

    const lost = http.expectOne(url);
    const firstKey = lost.request.headers.get(IDEMPOTENCY_KEY_HEADER);
    lost.error(new ProgressEvent('error'), { status: 0 });
    const retried = http.expectOne(url);
    const retriedKey = retried.request.headers.get(IDEMPOTENCY_KEY_HEADER);
    retried.flush({});

    expect(firstKey).toMatch(GUID_PATTERN);
    expect(retriedKey).toBe(firstKey);
  });
});

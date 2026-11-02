// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import { isBackendUnreachableError } from './backend-unreachable.helper';

const API_BASE_URL = 'https://localhost:5001/api/backend/';
const PAGE_ORIGIN = 'https://app.example.com';

describe('isBackendUnreachableError', () => {
  const check = (error: unknown): boolean => isBackendUnreachableError(error, API_BASE_URL, PAGE_ORIGIN);

  it('counts a request that got no answer, wherever it went', () => {
    expect(check(new HttpErrorResponse({ status: 0, url: 'https://third-party.example.com/route' }))).toBe(true);
  });

  it.each([[502], [504]])('counts status %i of the own api', (status) => {
    expect(check(new HttpErrorResponse({ status, url: `${API_BASE_URL}Shifts/` }))).toBe(true);
  });

  it.each([[502], [504]])('counts status %i of a relative api path on the own origin', (status) => {
    expect(check(new HttpErrorResponse({ status, url: '/api/backend/Shifts/' }))).toBe(true);
  });

  it.each([[502], [504]])('does not count status %i of a foreign host', (status) => {
    expect(check(new HttpErrorResponse({ status, url: 'https://third-party.example.com/api/route' }))).toBe(false);
  });

  it('does not count a gateway failure without a url', () => {
    expect(check(new HttpErrorResponse({ status: 502 }))).toBe(false);
  });

  it.each([[400], [404], [409], [500], [503]])('does not count status %i', (status) => {
    expect(check(new HttpErrorResponse({ status, url: `${API_BASE_URL}Shifts/` }))).toBe(false);
  });

  it('does not count an error that is no failed request', () => {
    expect(check(new TypeError('mapping failed'))).toBe(false);
  });
});

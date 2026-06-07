// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Tests for the single-flight refresh behaviour of DataAuthService.
 * Verifies that concurrent refresh callers share one in-flight HTTP request
 * (so the backend rotates the single-use refresh token only once) and that a
 * fresh request is issued once the previous refresh has completed.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DataAuthService } from './data-auth.service';
import { environment } from 'src/environments/environment';
import { MyToken } from 'src/app/domain/models/authentification-class';

const REFRESH_URL = `${environment.baseUrl}Accounts/RefreshToken`;

function createToken(jwt: string, refreshToken: string): MyToken {
  const token = new MyToken();
  token.token = jwt;
  token.refreshToken = refreshToken;
  token.expTime = new Date();
  return token;
}

describe('DataAuthService - single-flight refresh', () => {
  let service: DataAuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataAuthService],
    });
    service = TestBed.inject(DataAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shares one in-flight request across concurrent callers', () => {
    const results: MyToken[] = [];

    service.refreshToken({ refreshToken: 'rt-old' }).subscribe((t) => results.push(t));
    service.refreshToken({ refreshToken: 'rt-old' }).subscribe((t) => results.push(t));

    const req = httpMock.expectOne(REFRESH_URL);
    expect(req.request.method).toBe('POST');

    const token = createToken('jwt', 'rt-new');
    req.flush(token);

    expect(results.length).toBe(2);
    expect(results[0]).toEqual(token);
    expect(results[1]).toEqual(token);
  });

  it('issues a fresh request once the previous refresh completed', () => {
    service.refreshToken({ refreshToken: 'rt-old' }).subscribe();
    httpMock.expectOne(REFRESH_URL).flush(createToken('jwt-1', 'rt-1'));

    service.refreshToken({ refreshToken: 'rt-1' }).subscribe();
    httpMock.expectOne(REFRESH_URL).flush(createToken('jwt-2', 'rt-2'));
  });
});

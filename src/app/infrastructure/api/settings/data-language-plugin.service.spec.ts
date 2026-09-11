// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { getApiRootUrl } from 'src/app/infrastructure/helpers/api-root-url.helper';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { KnowledgeIndexSyncStatus } from 'src/app/domain/models/settings/knowledge-index-sync-status';
import { DataLanguagePluginService } from './data-language-plugin.service';

describe('DataLanguagePluginService', () => {
  let service: DataLanguagePluginService;
  let httpMock: HttpTestingController;
  const apiUrl = getApiRootUrl();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DataLanguagePluginService, provideHttpClient(withXhr(), withInterceptorsFromDi()), provideHttpClientTesting()],
    });
    service = TestBed.inject(DataLanguagePluginService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('fetches the knowledge index sync status without the global spinner', () => {
    // Arrange
    const status: KnowledgeIndexSyncStatus = {
      isRunning: true,
      isPending: false,
      lastCompletedUtc: null,
      lastFailedUtc: null,
      lastReason: 'language-plugin-installed',
      lastError: null,
    };
    let received: KnowledgeIndexSyncStatus | undefined;

    // Act
    service.getKnowledgeIndexSyncStatus().subscribe((s) => (received = s));
    const req = httpMock.expectOne(`${apiUrl}config/knowledge-index/sync-status`);
    req.flush(status);

    // Assert
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(SKIP_LOADING)).toBe(true);
    expect(received).toEqual(status);
  });
});

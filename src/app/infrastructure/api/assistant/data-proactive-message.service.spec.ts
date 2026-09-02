// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { DataProactiveMessageService } from './data-proactive-message.service';
import { PROACTIVE_REACTION } from 'src/app/domain/constants/proactive-reaction.constants';
import { IProactiveInboxItem, IProactiveUnreadCount } from 'src/app/domain/interfaces/proactive-inbox.interface';
import { environment } from 'src/environments/environment';

describe('DataProactiveMessageService', () => {
  let service: DataProactiveMessageService;
  let httpMock: HttpTestingController;
  let apiUrl: string;

  const mockItems: IProactiveInboxItem[] = [
    {
      id: 'dispatch-1',
      content: 'i18n:assistant-chat.proactive.curiosity.sport',
      contentParams: {},
      severity: 'medium',
      reaction: null,
      createdUtc: '2026-07-24T06:00:00Z',
      readAtUtc: null,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataProactiveMessageService],
    });
    service = TestBed.inject(DataProactiveMessageService);
    httpMock = TestBed.inject(HttpTestingController);
    apiUrl = `${environment.baseAssistantUrl}proactive-messages`;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('setReaction puts the reaction to proactive-messages/{id}/reaction', () => {
    service.setReaction('dispatch-1', PROACTIVE_REACTION.Helpful).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/dispatch-1/reaction`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ reaction: PROACTIVE_REACTION.Helpful });
    req.flush(null);
  });

  it('getUnreadMessages queries with unreadOnly and take', () => {
    service.getUnreadMessages(50).subscribe((items) => {
      expect(items).toEqual(mockItems);
    });

    const req = httpMock.expectOne(
      (candidate) =>
        candidate.url === apiUrl &&
        candidate.params.get('unreadOnly') === 'true' &&
        candidate.params.get('take') === '50',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockItems);
  });

  it('getUnreadCount gets proactive-messages/unread-count', () => {
    const mockCount: IProactiveUnreadCount = { count: 3 };

    service.getUnreadCount().subscribe((result) => {
      expect(result).toEqual(mockCount);
    });

    const req = httpMock.expectOne(`${apiUrl}/unread-count`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCount);
  });

  it('markRead puts to proactive-messages/{id}/read', () => {
    service.markRead('dispatch-1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/dispatch-1/read`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBeNull();
    req.flush(null);
  });

  it('acknowledge puts to proactive-messages/{id}/acknowledge', () => {
    service.acknowledge('dispatch-1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/dispatch-1/acknowledge`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBeNull();
    req.flush(null);
  });

  it('markManyRead puts the rendered ids to proactive-messages/read', () => {
    service.markManyRead(['dispatch-1', 'dispatch-2']).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/read`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ ids: ['dispatch-1', 'dispatch-2'] });
    req.flush(null);
  });

  it('markAllRead puts to proactive-messages/read-all', () => {
    service.markAllRead().subscribe();

    const req = httpMock.expectOne(`${apiUrl}/read-all`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBeNull();
    req.flush(null);
  });

  it('getUnreadMessages retries three times on failure', () => {
    let receivedError: unknown;
    service.getUnreadMessages(50).subscribe({
      error: (error) => {
        receivedError = error;
      },
    });

    for (let attempt = 0; attempt < 4; attempt++) {
      const req = httpMock.expectOne((candidate) => candidate.url === apiUrl);
      req.error(new ProgressEvent('error'));
    }
    expect(receivedError).toBeDefined();
  });

  it('markAllRead retries three times on failure', () => {
    let receivedError: unknown;
    service.markAllRead().subscribe({
      error: (error) => {
        receivedError = error;
      },
    });

    for (let attempt = 0; attempt < 4; attempt++) {
      const req = httpMock.expectOne(`${apiUrl}/read-all`);
      req.error(new ProgressEvent('error'));
    }
    expect(receivedError).toBeDefined();
  });
});

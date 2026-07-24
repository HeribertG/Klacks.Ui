// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { DataManagementProactiveInboxService } from './data-management-proactive-inbox.service';
import { DataProactiveMessageService } from 'src/app/infrastructure/api/assistant/data-proactive-message.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { IProactiveInboxChanged, IProactiveInboxItem } from 'src/app/domain/interfaces/proactive-inbox.interface';

describe('DataManagementProactiveInboxService', () => {
  let service: DataManagementProactiveInboxService;
  let dataServiceMock: {
    getUnreadMessages: ReturnType<typeof vi.fn>;
    getUnreadCount: ReturnType<typeof vi.fn>;
    markRead: ReturnType<typeof vi.fn>;
    markAllRead: ReturnType<typeof vi.fn>;
  };
  let inboxChanged$: Subject<IProactiveInboxChanged>;

  beforeEach(() => {
    inboxChanged$ = new Subject<IProactiveInboxChanged>();
    dataServiceMock = {
      getUnreadMessages: vi.fn().mockReturnValue(of([])),
      getUnreadCount: vi.fn().mockReturnValue(of({ count: 0 })),
      markRead: vi.fn().mockReturnValue(of(void 0)),
      markAllRead: vi.fn().mockReturnValue(of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        DataManagementProactiveInboxService,
        { provide: DataProactiveMessageService, useValue: dataServiceMock },
        { provide: AssistantSignalRService, useValue: { proactiveInboxChanged$: inboxChanged$ } },
      ],
    });

    service = TestBed.inject(DataManagementProactiveInboxService);
  });

  it('starts with zero unread and no badge', () => {
    expect(service.unreadCount()).toBe(0);
    expect(service.hasUnread()).toBe(false);
  });

  it('refreshUnreadCount sets the signal from the endpoint', () => {
    dataServiceMock.getUnreadCount.mockReturnValue(of({ count: 4 }));

    service.refreshUnreadCount();

    expect(service.unreadCount()).toBe(4);
    expect(service.hasUnread()).toBe(true);
  });

  it('refreshUnreadCount keeps the previous count on error', () => {
    dataServiceMock.getUnreadCount.mockReturnValue(of({ count: 2 }));
    service.refreshUnreadCount();
    dataServiceMock.getUnreadCount.mockReturnValue(throwError(() => new Error('offline')));

    service.refreshUnreadCount();

    expect(service.unreadCount()).toBe(2);
  });

  it('applies ProactiveInboxChanged pushes to the signal', () => {
    inboxChanged$.next({ unreadCount: 7 });

    expect(service.unreadCount()).toBe(7);
  });

  it('loadUnreadMessages delegates to the data service with the configured take', () => {
    const items: IProactiveInboxItem[] = [
      {
        id: 'dispatch-1',
        content: 'i18n:some.key',
        createdUtc: '2026-07-24T06:00:00Z',
      },
    ];
    dataServiceMock.getUnreadMessages.mockReturnValue(of(items));

    let received: IProactiveInboxItem[] = [];
    service.loadUnreadMessages().subscribe((result) => (received = result));

    expect(dataServiceMock.getUnreadMessages).toHaveBeenCalledWith(50);
    expect(received).toEqual(items);
  });

  it('markAllRead resets the unread count to zero', () => {
    inboxChanged$.next({ unreadCount: 5 });

    service.markAllRead().subscribe();

    expect(dataServiceMock.markAllRead).toHaveBeenCalledTimes(1);
    expect(service.unreadCount()).toBe(0);
  });

  it('markRead decrements the unread count but never below zero', () => {
    inboxChanged$.next({ unreadCount: 1 });

    service.markRead('dispatch-1').subscribe();
    service.markRead('dispatch-2').subscribe();

    expect(dataServiceMock.markRead).toHaveBeenCalledWith('dispatch-1');
    expect(service.unreadCount()).toBe(0);
  });

  it('does not touch the count when markAllRead fails', () => {
    inboxChanged$.next({ unreadCount: 3 });
    dataServiceMock.markAllRead.mockReturnValue(throwError(() => new Error('offline')));

    service.markAllRead().subscribe({ error: () => undefined });

    expect(service.unreadCount()).toBe(3);
  });
});

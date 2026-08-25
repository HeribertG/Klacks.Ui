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
    markManyRead: ReturnType<typeof vi.fn>;
    setReaction: ReturnType<typeof vi.fn>;
  };
  let inboxChanged$: Subject<IProactiveInboxChanged>;

  beforeEach(() => {
    inboxChanged$ = new Subject<IProactiveInboxChanged>();
    dataServiceMock = {
      getUnreadMessages: vi.fn().mockReturnValue(of([])),
      getUnreadCount: vi.fn().mockReturnValue(of({ count: 0 })),
      markRead: vi.fn().mockReturnValue(of(void 0)),
      markAllRead: vi.fn().mockReturnValue(of(void 0)),
      markManyRead: vi.fn().mockReturnValue(of(void 0)),
      setReaction: vi.fn().mockReturnValue(of(void 0)),
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

  it('markManyRead forwards exactly the given ids and leaves the count to a refresh', () => {
    inboxChanged$.next({ unreadCount: 63 });

    service.markManyRead(['a', 'b']).subscribe();

    expect(dataServiceMock.markManyRead).toHaveBeenCalledWith(['a', 'b']);
    expect(service.unreadCount()).toBe(63);
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

  describe('inbox block state', () => {
    it('starts with no heading, an empty block and expanded true', () => {
      expect(service.inboxHeadingMessageId()).toBeNull();
      expect(service.inboxMessageIds().size).toBe(0);
      expect(service.inboxExpanded()).toBe(true);
    });

    it('addToInboxBlock unions ids across repeated calls instead of replacing them', () => {
      service.addToInboxBlock(['a', 'b']);
      service.addToInboxBlock(['b', 'c']);

      expect([...service.inboxMessageIds()].sort()).toEqual(['a', 'b', 'c']);
    });

    it('setInboxHeadingIfUnset anchors the heading and expands the block on first call', () => {
      service.setInboxHeadingIfUnset('first-msg');

      expect(service.inboxHeadingMessageId()).toBe('first-msg');
      expect(service.inboxExpanded()).toBe(true);
    });

    it('setInboxHeadingIfUnset never moves an already-anchored heading', () => {
      service.setInboxHeadingIfUnset('first-msg');

      service.setInboxHeadingIfUnset('second-msg');

      expect(service.inboxHeadingMessageId()).toBe('first-msg');
    });

    it('toggleInboxExpanded flips the expanded flag', () => {
      expect(service.inboxExpanded()).toBe(true);

      service.toggleInboxExpanded();
      expect(service.inboxExpanded()).toBe(false);

      service.toggleInboxExpanded();
      expect(service.inboxExpanded()).toBe(true);
    });

    it('resetInboxBlock clears the heading and the block, and re-expands it', () => {
      service.setInboxHeadingIfUnset('first-msg');
      service.addToInboxBlock(['first-msg', 'second-msg']);
      service.toggleInboxExpanded();
      expect(service.inboxExpanded()).toBe(false);

      service.resetInboxBlock();

      expect(service.inboxHeadingMessageId()).toBeNull();
      expect(service.inboxMessageIds().size).toBe(0);
      expect(service.inboxExpanded()).toBe(true);
    });
  });

  describe('hiding rows', () => {
    it('starts with nothing hidden', () => {
      expect(service.hiddenMessageIds().size).toBe(0);
    });

    it('markHidden hides without calling the server', () => {
      service.markHidden(['a', 'b']);

      expect([...service.hiddenMessageIds()].sort()).toEqual(['a', 'b']);
      expect(dataServiceMock.markManyRead).not.toHaveBeenCalled();
      expect(dataServiceMock.setReaction).not.toHaveBeenCalled();
    });

    it('markHidden unions ids across repeated calls', () => {
      service.markHidden(['a']);
      service.markHidden(['b']);

      expect([...service.hiddenMessageIds()].sort()).toEqual(['a', 'b']);
    });

    it('hideMessages marks the rows read so a reload cannot bring them back', () => {
      service.hideMessages(['a', 'b']);

      expect([...service.hiddenMessageIds()].sort()).toEqual(['a', 'b']);
      expect(dataServiceMock.markManyRead).toHaveBeenCalledWith(['a', 'b']);
    });

    it('hideMessages keeps the row hidden even when the server call fails', () => {
      dataServiceMock.markManyRead.mockReturnValue(throwError(() => new Error('offline')));

      service.hideMessages(['a']);

      expect(service.hiddenMessageIds().has('a')).toBe(true);
    });

    it('hideMessages ignores an empty list', () => {
      service.hideMessages([]);

      expect(dataServiceMock.markManyRead).not.toHaveBeenCalled();
    });

    it('dismissMessage hides the row and records the dismissal', () => {
      service.dismissMessage('a');

      expect(service.hiddenMessageIds().has('a')).toBe(true);
      expect(dataServiceMock.setReaction).toHaveBeenCalledWith('a', 'dismissed', undefined);
      expect(dataServiceMock.markManyRead).toHaveBeenCalledWith(['a']);
    });

    it('dismissMessage forwards the reject reason the user picked', () => {
      service.dismissMessage('a', 'alreadyHandled');

      expect(dataServiceMock.setReaction).toHaveBeenCalledWith('a', 'dismissed', 'alreadyHandled');
    });

    it('dismissMessage still hides the row when recording the reaction fails', () => {
      dataServiceMock.setReaction.mockReturnValue(throwError(() => new Error('offline')));

      service.dismissMessage('a');

      expect(service.hiddenMessageIds().has('a')).toBe(true);
    });

    it('resetInboxBlock clears the hidden set as well', () => {
      service.hideMessages(['a']);

      service.resetInboxBlock();

      expect(service.hiddenMessageIds().size).toBe(0);
    });
  });
});

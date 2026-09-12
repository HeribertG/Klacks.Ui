// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { SyncNotificationToastService } from './sync-notification-toast.service';
import { DataSyncNotificationService } from 'src/app/infrastructure/api/assistant/data-sync-notification.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { TranslateService } from '@ngx-translate/core';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';

describe('SyncNotificationToastService', () => {
  let held: Set<string>;
  let dataSyncNotification: { fetchUnread: ReturnType<typeof vi.fn>; markRead: ReturnType<typeof vi.fn> };

  const createService = (): SyncNotificationToastService => {
    dataSyncNotification = {
      fetchUnread: vi.fn().mockResolvedValue([]),
      markRead: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DataSyncNotificationService, useValue: dataSyncNotification },
        { provide: ToastShowService, useValue: { showInfo: vi.fn() } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        {
          provide: AuthorizationService,
          useValue: { hasPermission: (permission: string) => held.has(permission) },
        },
      ],
    });

    return TestBed.inject(SyncNotificationToastService);
  };

  beforeEach(() => {
    held = new Set<string>();
  });

  it('never fetches sync notifications for a planer or a supervisor without the admin role', async () => {
    const service = createService();

    await service.checkAndShow();

    expect(dataSyncNotification.fetchUnread).not.toHaveBeenCalled();
  });

  it('fetches and marks sync notifications as read for an admin', async () => {
    held.add(ROLE_ADMIN);
    const service = createService();

    await service.checkAndShow();

    expect(dataSyncNotification.fetchUnread).toHaveBeenCalled();
  });
});

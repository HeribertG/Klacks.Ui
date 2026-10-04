// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { InboxService } from './inbox.service';
import { DataReceivedEmailService } from 'src/app/infrastructure/api/email/data-received-email.service';
import { DataEmailFolderService } from 'src/app/infrastructure/api/email/data-email-folder.service';
import { EmailSignalRService } from 'src/app/infrastructure/signalr/email-signalr.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ROLE_ADMIN, ROLE_AUTHORISED } from 'src/app/domain/constants/permissions.constants';

describe('InboxService.refreshUnreadCount', () => {
  let rights: string[];
  let receivedEmailSpy: { getUnreadCount: ReturnType<typeof vi.fn>; getEmailGroupTree: ReturnType<typeof vi.fn> };
  let folderSpy: { getFolders: ReturnType<typeof vi.fn> };

  const setup = (): InboxService => {
    TestBed.configureTestingModule({
      providers: [
        InboxService,
        { provide: DataReceivedEmailService, useValue: receivedEmailSpy },
        { provide: DataEmailFolderService, useValue: folderSpy },
        { provide: EmailSignalRService, useValue: {} },
        {
          provide: AuthorizationService,
          useValue: {
            hasPermission: (permission: string): boolean =>
              rights.includes(ROLE_ADMIN) || rights.includes(permission),
          },
        },
      ],
    });
    return TestBed.inject(InboxService);
  };

  beforeEach(() => {
    receivedEmailSpy = {
      getUnreadCount: vi.fn().mockReturnValue(of(3)),
      getEmailGroupTree: vi.fn().mockReturnValue(of([])),
    };
    folderSpy = { getFolders: vi.fn().mockReturnValue(of([])) };
  });

  it('asks nothing for a planner without a role, because every received-email endpoint would answer 403', () => {
    rights = ['CanViewClients', 'CanPlan'];
    const service = setup();

    service.refreshUnreadCount();

    expect(receivedEmailSpy.getUnreadCount).not.toHaveBeenCalled();
    expect(folderSpy.getFolders).not.toHaveBeenCalled();
    expect(receivedEmailSpy.getEmailGroupTree).not.toHaveBeenCalled();
    expect(service.inboxUnreadCount()).toBe(0);
  });

  it('loads the badge, the folders and the group tree for a supervisor (Authorised)', () => {
    rights = [ROLE_AUTHORISED];
    const service = setup();

    service.refreshUnreadCount();

    expect(receivedEmailSpy.getUnreadCount).toHaveBeenCalledTimes(1);
    expect(folderSpy.getFolders).toHaveBeenCalledTimes(1);
    expect(receivedEmailSpy.getEmailGroupTree).toHaveBeenCalledTimes(1);
    expect(service.inboxUnreadCount()).toBe(3);
  });

  it('loads the badge for an admin', () => {
    rights = [ROLE_ADMIN];
    const service = setup();

    service.refreshUnreadCount();

    expect(receivedEmailSpy.getUnreadCount).toHaveBeenCalledTimes(1);
  });
});

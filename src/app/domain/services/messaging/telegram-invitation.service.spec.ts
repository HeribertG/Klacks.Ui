// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { DataMessagingInvitationService } from 'src/app/infrastructure/api/messaging/data-messaging-invitation.service';
import { DataUserMessengerContactService } from 'src/app/infrastructure/api/messaging/data-user-messenger-contact.service';
import { TelegramInvitationService } from './telegram-invitation.service';
import { TELEGRAM_ADMIN_INVITE_ERROR_KEY, TELEGRAM_INVITATION_ERROR_KEY } from './telegram-invitation.constants';

describe('TelegramInvitationService', () => {
  let service: TelegramInvitationService;
  let contactApi: { sendAdminInvite: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    contactApi = { sendAdminInvite: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        TelegramInvitationService,
        { provide: DataMessagingInvitationService, useValue: {} },
        { provide: DataUserMessengerContactService, useValue: contactApi },
      ],
    });
    service = TestBed.inject(TelegramInvitationService);
  });

  describe('sendAdminInvite', () => {
    it('sends the invitation for the application user and returns the plugin answer', async () => {
      const answer = { result: 'Success' };
      contactApi.sendAdminInvite.mockReturnValue(of(answer));

      const response = await firstValueFrom(service.sendAdminInvite('user-1'));

      expect(contactApi.sendAdminInvite).toHaveBeenCalledWith('user-1');
      expect(response).toBe(answer);
    });
  });

  describe('adminInviteOutcomeOf', () => {
    it('marks only Success as sent', () => {
      expect(service.adminInviteOutcomeOf('Success')).toEqual({
        isSent: true,
        messageKey: 'messaging.sendUserTelegramInvite.success',
      });
      expect(service.adminInviteOutcomeOf('AlreadyLinked').isSent).toBe(false);
    });

    it.each([
      ['AlreadyLinked', 'messaging.sendUserTelegramInvite.alreadyLinked'],
      ['UserNotFound', 'messaging.sendUserTelegramInvite.userNotFound'],
      ['NoEmail', 'messaging.sendUserTelegramInvite.noEmail'],
      ['SendFailed', 'messaging.sendUserTelegramInvite.sendFailed'],
      ['NoTelegramProvider', 'messaging.sendUserTelegramInvite.noProvider'],
    ])('maps the result %s to its message key', (result, key) => {
      expect(service.adminInviteOutcomeOf(result).messageKey).toBe(key);
    });

    it('falls back to the generic key for an unknown or missing result', () => {
      expect(service.adminInviteOutcomeOf('Surprise').messageKey).toBe(TELEGRAM_ADMIN_INVITE_ERROR_KEY);
      expect(service.adminInviteOutcomeOf(undefined).messageKey).toBe(TELEGRAM_ADMIN_INVITE_ERROR_KEY);
    });
  });

  describe('adminInviteFailureOf', () => {
    it('reads the result code from the error body', () => {
      const error = new HttpErrorResponse({ status: 400, error: { result: 'NoEmail' } });

      expect(service.adminInviteFailureOf(error)).toEqual({
        isSent: false,
        messageKey: 'messaging.sendUserTelegramInvite.noEmail',
      });
    });

    it('uses the generic key when the error body has no result code', () => {
      const error = new HttpErrorResponse({ status: 500 });

      expect(service.adminInviteFailureOf(error).messageKey).toBe(TELEGRAM_ADMIN_INVITE_ERROR_KEY);
    });
  });

  it('keeps the employee invitation keys separate from the user invitation keys', () => {
    expect(service.failureOf(new HttpErrorResponse({ status: 500 })).messageKey).toBe(TELEGRAM_INVITATION_ERROR_KEY);
  });
});

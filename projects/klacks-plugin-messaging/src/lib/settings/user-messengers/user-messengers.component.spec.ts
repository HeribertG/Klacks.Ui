// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for UserMessengersComponent: loading the user's own channels, exposing the issued
 * pairing code, and removing a channel. What matters most here is that the card has no way to send a
 * foreign user id anywhere - every call goes out without one.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { PLUGIN_TOAST_SERVICE } from 'klacks-plugin-contracts';
import { UserMessengersComponent } from './user-messengers.component';
import { DataUserMessengerContactService } from '../../services/data-user-messenger-contact.service';
import { MessengerType } from '../../enums/messenger-type.enum';
import { UserMessengerContact } from '../../models/user-messenger-contact.model';

describe('UserMessengersComponent', () => {
  let dataServiceSpy: {
    getMyContacts: ReturnType<typeof vi.fn>;
    createPairingCode: ReturnType<typeof vi.fn>;
    deleteContact: ReturnType<typeof vi.fn>;
  };
  let toastSpy: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };

  const telegramChannel: UserMessengerContact = {
    id: 'a3c1f0d2-5b64-4e27-9f18-70c2d5a1b843',
    userId: '3f9a2b10-77c5-4de1-9a02-5b1c8e4d6a33',
    type: MessengerType.Telegram,
    value: '884411223',
    description: 'Messenger pairing',
    isPreferred: true,
  };

  function createComponent(): UserMessengersComponent {
    const fixture = TestBed.createComponent(UserMessengersComponent);
    return fixture.componentInstance;
  }

  beforeEach(() => {
    dataServiceSpy = {
      getMyContacts: vi.fn(),
      createPairingCode: vi.fn(),
      deleteContact: vi.fn(),
    };
    toastSpy = { showSuccess: vi.fn(), showError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: DataUserMessengerContactService, useValue: dataServiceSpy },
        { provide: PLUGIN_TOAST_SERVICE, useValue: toastSpy },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string) => key,
            get: (key: string) => of(key),
            onTranslationChange: of(),
            onLangChange: of(),
            onDefaultLangChange: of(),
          },
        },
      ],
    });
  });

  it('loads the own channels on init', () => {
    dataServiceSpy.getMyContacts.mockReturnValue(of([telegramChannel]));

    const component = createComponent();
    component.ngOnInit();

    expect(component.contacts()).toEqual([telegramChannel]);
    expect(component.isLoading()).toBe(false);
    expect(dataServiceSpy.getMyContacts).toHaveBeenCalledWith();
  });

  it('shows an error toast when the initial load fails', () => {
    dataServiceSpy.getMyContacts.mockReturnValue(throwError(() => new Error('boom')));

    const component = createComponent();
    component.ngOnInit();

    expect(toastSpy.showError).toHaveBeenCalledWith('settings.user-messengers.error.load');
    expect(component.contacts()).toEqual([]);
  });

  it('marks the preferred channel so the user can see where a wake-up call goes', () => {
    dataServiceSpy.getMyContacts.mockReturnValue(
      of([telegramChannel, { ...telegramChannel, id: 'second', isPreferred: false }]),
    );

    const component = createComponent();
    component.ngOnInit();

    expect(component.contacts().filter((c) => c.isPreferred).length).toBe(1);
    expect(component.contacts()[0].isPreferred).toBe(true);
  });

  it('exposes the issued pairing code and asks for it without any user id', async () => {
    dataServiceSpy.createPairingCode.mockReturnValue(
      of({ code: 'K7M4PQRS', expiresAt: '2026-08-16T10:15:00Z' }),
    );
    const component = createComponent();

    await component.onCreatePairingCode();

    expect(dataServiceSpy.createPairingCode).toHaveBeenCalledWith();
    expect(component.pairingCode()?.code).toBe('K7M4PQRS');
    expect(component.isIssuingCode()).toBe(false);
  });

  it('shows an error toast and no code when issuing fails', async () => {
    dataServiceSpy.createPairingCode.mockReturnValue(throwError(() => new Error('boom')));
    const component = createComponent();

    await component.onCreatePairingCode();

    expect(toastSpy.showError).toHaveBeenCalledWith('settings.user-messengers.error.create-code');
    expect(component.pairingCode()).toBeNull();
    expect(component.isIssuingCode()).toBe(false);
  });

  it('removes a deleted channel from the list', async () => {
    dataServiceSpy.getMyContacts.mockReturnValue(of([telegramChannel]));
    dataServiceSpy.deleteContact.mockReturnValue(of(undefined));
    const component = createComponent();
    component.ngOnInit();

    await component.onDelete(telegramChannel);

    expect(dataServiceSpy.deleteContact).toHaveBeenCalledWith(telegramChannel.id);
    expect(component.contacts()).toEqual([]);
    expect(toastSpy.showSuccess).toHaveBeenCalled();
  });

  it('keeps the channel in the list when the delete fails', async () => {
    dataServiceSpy.getMyContacts.mockReturnValue(of([telegramChannel]));
    dataServiceSpy.deleteContact.mockReturnValue(throwError(() => new Error('boom')));
    const component = createComponent();
    component.ngOnInit();

    await component.onDelete(telegramChannel);

    expect(toastSpy.showError).toHaveBeenCalledWith('settings.user-messengers.error.delete');
    expect(component.contacts()).toEqual([telegramChannel]);
  });

  it('resolves a readable channel label', () => {
    const component = createComponent();

    expect(component.channelLabel(telegramChannel).length).toBeGreaterThan(0);
  });
});

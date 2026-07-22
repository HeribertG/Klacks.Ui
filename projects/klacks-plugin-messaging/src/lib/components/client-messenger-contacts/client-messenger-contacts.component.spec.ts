// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for ClientMessengerContactsComponent: load-mapping, add/delete
 * of new versus persisted rows, and the create-vs-update save branch.
 */

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { PLUGIN_TOAST_SERVICE } from 'klacks-plugin-contracts';
import { ClientMessengerContactsComponent } from './client-messenger-contacts.component';
import { DataMessengerContactService } from '../../services/data-messenger-contact.service';
import { MessengerType } from '../../enums/messenger-type.enum';
import { MessengerContact } from '../../models/messenger-contact.model';

describe('ClientMessengerContactsComponent', () => {
  let dataServiceSpy: {
    getByClient: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let toastSpy: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };

  function createComponent(): ClientMessengerContactsComponent {
    const fixture = TestBed.createComponent(ClientMessengerContactsComponent);
    return fixture.componentInstance;
  }

  beforeEach(() => {
    dataServiceSpy = {
      getByClient: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    toastSpy = { showSuccess: vi.fn(), showError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: DataMessengerContactService, useValue: dataServiceSpy },
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

  it('loads and maps existing contacts on clientId change, defaulting a missing description to empty', () => {
    const contact: MessengerContact = {
      id: 'c-1',
      clientId: 'client-1',
      type: MessengerType.WhatsApp,
      value: '+41791234567',
      description: null,
    };
    dataServiceSpy.getByClient.mockReturnValue(of([contact]));

    const component = createComponent();
    component.clientId = 'client-1';
    component.ngOnChanges({ clientId: { currentValue: 'client-1', previousValue: null, firstChange: true, isFirstChange: () => true } });

    expect(dataServiceSpy.getByClient).toHaveBeenCalledWith('client-1');
    expect(component.contacts()).toEqual([
      { id: 'c-1', type: MessengerType.WhatsApp, value: '+41791234567', description: '', isNew: false },
    ]);
    expect(component.isLoading()).toBe(false);
  });

  it('shows an error toast when loading fails', () => {
    dataServiceSpy.getByClient.mockReturnValue(throwError(() => new Error('boom')));

    const component = createComponent();
    component.clientId = 'client-1';
    component.ngOnChanges({ clientId: { currentValue: 'client-1', previousValue: null, firstChange: true, isFirstChange: () => true } });

    expect(toastSpy.showError).toHaveBeenCalledWith('client.messenger-contacts.error.load');
    expect(component.isLoading()).toBe(false);
  });

  it('adds a new empty Telegram row without contacting the server', () => {
    const component = createComponent();

    component.onAdd();

    expect(component.contacts()).toEqual([
      { type: MessengerType.Telegram, value: '', description: '', isNew: true },
    ]);
    expect(dataServiceSpy.create).not.toHaveBeenCalled();
  });

  it('removes an unsaved row locally on delete without calling the server', async () => {
    const component = createComponent();
    component.onAdd();

    await component.onDelete(0);

    expect(component.contacts()).toEqual([]);
    expect(dataServiceSpy.delete).not.toHaveBeenCalled();
  });

  it('deletes a persisted row via the server and shows a success toast', async () => {
    dataServiceSpy.getByClient.mockReturnValue(
      of([{ id: 'c-1', clientId: 'client-1', type: MessengerType.Telegram, value: '123', description: null }]),
    );
    dataServiceSpy.delete.mockReturnValue(of(undefined));
    const component = createComponent();
    component.clientId = 'client-1';
    component.ngOnChanges({ clientId: { currentValue: 'client-1', previousValue: null, firstChange: true, isFirstChange: () => true } });

    await component.onDelete(0);

    expect(dataServiceSpy.delete).toHaveBeenCalledWith('c-1');
    expect(component.contacts()).toEqual([]);
    expect(toastSpy.showSuccess).toHaveBeenCalled();
  });

  it('shows an error toast when deleting a persisted row fails', async () => {
    dataServiceSpy.getByClient.mockReturnValue(
      of([{ id: 'c-1', clientId: 'client-1', type: MessengerType.Telegram, value: '123', description: null }]),
    );
    dataServiceSpy.delete.mockReturnValue(throwError(() => new Error('boom')));
    const component = createComponent();
    component.clientId = 'client-1';
    component.ngOnChanges({ clientId: { currentValue: 'client-1', previousValue: null, firstChange: true, isFirstChange: () => true } });

    await component.onDelete(0);

    expect(toastSpy.showError).toHaveBeenCalledWith('client.messenger-contacts.error.delete');
    expect(component.contacts().length).toBe(1);
  });

  it('rejects saving a row whose value is blank', async () => {
    const component = createComponent();
    component.clientId = 'client-1';
    component.onAdd();

    await component.onSaveRow(0);

    expect(toastSpy.showError).toHaveBeenCalledWith('client.messenger-contacts.error.value-required');
    expect(dataServiceSpy.create).not.toHaveBeenCalled();
  });

  it('creates a new contact through the server and replaces the local row with the saved result', async () => {
    const saved: MessengerContact = {
      id: 'c-9',
      clientId: 'client-1',
      type: MessengerType.Telegram,
      value: '999',
      description: 'note',
    };
    dataServiceSpy.create.mockReturnValue(of(saved));
    const component = createComponent();
    component.clientId = 'client-1';
    component.onAdd();
    component.contacts.update((list) => {
      const next = [...list];
      next[0] = { ...next[0], value: '  999  ', description: '  note  ' };
      return next;
    });

    await component.onSaveRow(0);

    expect(dataServiceSpy.create).toHaveBeenCalledWith({
      clientId: 'client-1',
      type: MessengerType.Telegram,
      value: '999',
      description: 'note',
    });
    expect(component.contacts()).toEqual([
      { id: 'c-9', type: MessengerType.Telegram, value: '999', description: 'note', isNew: false },
    ]);
    expect(toastSpy.showSuccess).toHaveBeenCalled();
  });

  it('updates an existing contact through the server instead of creating a new one', async () => {
    dataServiceSpy.getByClient.mockReturnValue(
      of([{ id: 'c-1', clientId: 'client-1', type: MessengerType.Telegram, value: '123', description: null }]),
    );
    const updated: MessengerContact = {
      id: 'c-1',
      clientId: 'client-1',
      type: MessengerType.Telegram,
      value: '456',
      description: null,
    };
    dataServiceSpy.update.mockReturnValue(of(updated));
    const component = createComponent();
    component.clientId = 'client-1';
    component.ngOnChanges({ clientId: { currentValue: 'client-1', previousValue: null, firstChange: true, isFirstChange: () => true } });
    component.contacts.update((list) => {
      const next = [...list];
      next[0] = { ...next[0], value: '456' };
      return next;
    });

    await component.onSaveRow(0);

    expect(dataServiceSpy.update).toHaveBeenCalledWith('c-1', {
      clientId: 'client-1',
      type: MessengerType.Telegram,
      value: '456',
      description: null,
    });
    expect(dataServiceSpy.create).not.toHaveBeenCalled();
  });

  it('shows an error toast when saving fails', async () => {
    dataServiceSpy.create.mockReturnValue(throwError(() => new Error('boom')));
    const component = createComponent();
    component.clientId = 'client-1';
    component.onAdd();
    component.contacts.update((list) => {
      const next = [...list];
      next[0] = { ...next[0], value: '999' };
      return next;
    });

    await component.onSaveRow(0);

    expect(toastSpy.showError).toHaveBeenCalledWith('client.messenger-contacts.error.save');
  });
});

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for OwnerMessengersComponent: load-mapping, dirty tracking on
 * add/delete/change, and the save payload filtering (blank entries dropped).
 */

import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { PLUGIN_TOAST_SERVICE } from 'klacks-plugin-contracts';
import { OwnerMessengersComponent } from './owner-messengers.component';
import { DataOwnerMessengerService } from '../../services/data-owner-messenger.service';
import { MessengerType } from '../../enums/messenger-type.enum';
import { OwnerMessengerEntry } from '../../models/owner-messenger-entry.model';

describe('OwnerMessengersComponent', () => {
  let dataServiceSpy: {
    getOwnerMessengers: ReturnType<typeof vi.fn>;
    saveOwnerMessengers: ReturnType<typeof vi.fn>;
  };
  let toastSpy: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };

  function createComponent(): OwnerMessengersComponent {
    const fixture = TestBed.createComponent(OwnerMessengersComponent);
    return fixture.componentInstance;
  }

  beforeEach(() => {
    dataServiceSpy = { getOwnerMessengers: vi.fn(), saveOwnerMessengers: vi.fn() };
    toastSpy = { showSuccess: vi.fn(), showError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: DataOwnerMessengerService, useValue: dataServiceSpy },
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

  it('loads existing entries on init, defaulting a missing description to empty and marking not dirty', () => {
    const entry: OwnerMessengerEntry = { type: MessengerType.Telegram, value: '12345', description: null };
    dataServiceSpy.getOwnerMessengers.mockReturnValue(of([entry]));

    const component = createComponent();
    component.ngOnInit();

    expect(component.entries()).toEqual([{ type: MessengerType.Telegram, value: '12345', description: '' }]);
    expect(component.isDirty()).toBe(false);
    expect(component.isLoading()).toBe(false);
  });

  it('shows an error toast when the initial load fails', () => {
    dataServiceSpy.getOwnerMessengers.mockReturnValue(throwError(() => new Error('boom')));

    const component = createComponent();
    component.ngOnInit();

    expect(toastSpy.showError).toHaveBeenCalledWith('settings.owner-messengers.error.load');
  });

  it('adding an entry marks the form dirty', () => {
    const component = createComponent();

    component.onAdd();

    expect(component.entries()).toEqual([{ type: MessengerType.Telegram, value: '', description: '' }]);
    expect(component.isDirty()).toBe(true);
  });

  it('deleting an entry marks the form dirty', () => {
    const component = createComponent();
    component.onAdd();
    component.onAdd();

    component.onDelete(0);

    expect(component.entries().length).toBe(1);
    expect(component.isDirty()).toBe(true);
  });

  it('onChange marks the form dirty', () => {
    const component = createComponent();
    expect(component.isDirty()).toBe(false);

    component.onChange();

    expect(component.isDirty()).toBe(true);
  });

  it('drops blank-value entries and trims the rest when saving', async () => {
    const saved: OwnerMessengerEntry[] = [{ type: MessengerType.Telegram, value: '999', description: 'note' }];
    dataServiceSpy.saveOwnerMessengers.mockReturnValue(of(saved));
    const component = createComponent();
    component.onAdd();
    component.entries.update((list) => [
      ...list,
      { type: MessengerType.Telegram, value: '  999  ', description: '  note  ' },
      { type: MessengerType.WhatsApp, value: '   ', description: 'unused' },
    ]);

    await component.onSave();

    expect(dataServiceSpy.saveOwnerMessengers).toHaveBeenCalledWith([
      { type: MessengerType.Telegram, value: '999', description: 'note' },
    ]);
    expect(component.entries()).toEqual([{ type: MessengerType.Telegram, value: '999', description: 'note' }]);
    expect(component.isDirty()).toBe(false);
    expect(toastSpy.showSuccess).toHaveBeenCalled();
  });

  it('sends an empty description as null when saving', async () => {
    dataServiceSpy.saveOwnerMessengers.mockReturnValue(of([]));
    const component = createComponent();
    component.entries.set([{ type: MessengerType.Signal, value: '+41791234567', description: '' }]);

    await component.onSave();

    expect(dataServiceSpy.saveOwnerMessengers).toHaveBeenCalledWith([
      { type: MessengerType.Signal, value: '+41791234567', description: null },
    ]);
  });

  it('shows an error toast and keeps the dirty flag when saving fails', async () => {
    dataServiceSpy.saveOwnerMessengers.mockReturnValue(throwError(() => new Error('boom')));
    const component = createComponent();
    component.onAdd();
    component.entries.update((list) => {
      const next = [...list];
      next[0] = { ...next[0], value: '999' };
      return next;
    });

    await component.onSave();

    expect(toastSpy.showError).toHaveBeenCalledWith('settings.owner-messengers.error.save');
    expect(component.isDirty()).toBe(true);
  });
});

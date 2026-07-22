// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for MessagingProviderEditComponent: internal-name derivation,
 * per-provider-type config field handling, existing-config parsing and the
 * Telegram bot token validation state machine.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { MessagingProviderEditComponent } from './messaging-provider-edit.component';
import { MessagingProvider } from '../../../models/messaging-provider.model';

function createComponent(): MessagingProviderEditComponent {
  const fixture = TestBed.createComponent(MessagingProviderEditComponent);
  return fixture.componentInstance;
}

describe('MessagingProviderEditComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
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
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to Telegram with an idle validation state and an auto-filled webhook URL', () => {
    const component = createComponent();

    component.ngOnInit();

    expect(component.providerType).toBe('Telegram');
    expect(component.telegramValidation()).toEqual({ state: 'idle' });
    expect(component.configFields['WebhookUrl']).toContain('/api/messaging/webhook/telegram');
  });

  it('populates the form from an existing provider and parses its config JSON', () => {
    const component = createComponent();
    component.provider = {
      id: 'p-1',
      name: 'telegram-main',
      displayName: 'Telegram Main',
      providerType: 'Signal',
      isEnabled: false,
      createdAt: '',
      updatedAt: '',
    } as MessagingProvider;
    component.existingConfigJson = JSON.stringify({ SignalNumber: '+41791234567', ApiUrl: 'http://localhost:8080' });

    component.ngOnInit();

    expect(component.name).toBe('Telegram Main');
    expect(component.providerType).toBe('Signal');
    expect(component.isEnabled).toBe(false);
    expect(component.configFields['SignalNumber']).toBe('+41791234567');
    expect(component.configFields['ApiUrl']).toBe('http://localhost:8080');
  });

  it('ignores invalid existing config JSON without throwing', () => {
    const component = createComponent();
    component.provider = {
      id: 'p-1',
      name: 'x',
      displayName: 'X',
      providerType: 'Signal',
      isEnabled: true,
      createdAt: '',
      updatedAt: '',
    } as MessagingProvider;
    component.existingConfigJson = '{not-valid-json';

    expect(() => component.ngOnInit()).not.toThrow();
    expect(component.configFields['SignalNumber']).toBe('');
  });

  it('returns an empty field list for an unknown provider type', () => {
    const component = createComponent();
    component.providerType = 'DoesNotExist';

    expect(component.getFieldDefinitions()).toEqual([]);
  });

  it('resets config fields and validation state on provider type change', () => {
    const component = createComponent();
    component.ngOnInit();
    component.configFields['BotToken'] = 'some-token';
    component.telegramValidation.set({ state: 'valid', botName: 'klacks_bot' });

    component.providerType = 'Threema';
    component.onProviderTypeChange();

    expect(component.telegramValidation()).toEqual({ state: 'idle' });
    expect(component.configFields['BotToken']).toBeUndefined();
    expect(component.configFields['GatewayId']).toBe('');
  });

  it('rejects the form when the display name is missing', () => {
    const component = createComponent();
    component.ngOnInit();
    component.name = '';

    expect(component.isFormValid()).toBe(false);
  });

  it('rejects the form while the Telegram token is marked invalid', () => {
    const component = createComponent();
    component.ngOnInit();
    component.name = 'My Bot';
    component.telegramValidation.set({ state: 'invalid' });

    expect(component.isFormValid()).toBe(false);
  });

  it('derives a lower-case, hyphenated internal name and trims empty fields on save', () => {
    const component = createComponent();
    component.ngOnInit();
    component.name = 'My Telegram Bot';
    component.configFields['BotToken'] = '  123456:ABC  ';
    component.configFields['WebhookUrl'] = '';

    const emitted: unknown[] = [];
    component.saved.subscribe((dto) => emitted.push(dto));

    component.onSave();

    expect(emitted).toEqual([
      {
        name: 'my-telegram-bot',
        displayName: 'My Telegram Bot',
        providerType: 'Telegram',
        configJson: JSON.stringify({ BotToken: '123456:ABC' }),
        isEnabled: true,
      },
    ]);
  });

  it('does not emit saved when the form is invalid', () => {
    const component = createComponent();
    component.ngOnInit();
    component.name = '';

    const emitted: unknown[] = [];
    component.saved.subscribe((dto) => emitted.push(dto));

    component.onSave();

    expect(emitted).toEqual([]);
  });

  it('emits cancelled on cancel', () => {
    const component = createComponent();
    let cancelled = false;
    component.cancelled.subscribe(() => { cancelled = true; });

    component.onCancel();

    expect(cancelled).toBe(true);
  });

  it('marks the Telegram token valid when the API confirms the bot', async () => {
    const component = createComponent();
    component.ngOnInit();
    component.configFields['BotToken'] = 'good-token';
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ ok: true, result: { username: 'klacks_bot' } }),
    });

    component.onFieldBlur('BotToken');
    await Promise.resolve();
    await Promise.resolve();

    expect(component.telegramValidation()).toEqual({ state: 'valid', botName: 'klacks_bot' });
  });

  it('marks the Telegram token invalid when the API rejects it', async () => {
    const component = createComponent();
    component.ngOnInit();
    component.configFields['BotToken'] = 'bad-token';
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ ok: false }),
    });

    component.onFieldBlur('BotToken');
    await Promise.resolve();
    await Promise.resolve();

    expect(component.telegramValidation()).toEqual({ state: 'invalid' });
  });

  it('marks the Telegram token invalid when the fetch call itself fails', async () => {
    const component = createComponent();
    component.ngOnInit();
    component.configFields['BotToken'] = 'network-issue';
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network down'));

    component.onFieldBlur('BotToken');
    await Promise.resolve();
    await Promise.resolve();

    expect(component.telegramValidation()).toEqual({ state: 'invalid' });
  });

  it('resets to idle when the token field is cleared on blur', () => {
    const component = createComponent();
    component.ngOnInit();
    component.telegramValidation.set({ state: 'valid', botName: 'klacks_bot' });
    component.configFields['BotToken'] = '   ';

    component.onFieldBlur('BotToken');

    expect(component.telegramValidation()).toEqual({ state: 'idle' });
  });

  it('clears a stale valid/invalid state as soon as the user edits the token again', () => {
    const component = createComponent();
    component.ngOnInit();
    component.telegramValidation.set({ state: 'invalid' });

    component.onTokenInput('BotToken');

    expect(component.telegramValidation()).toEqual({ state: 'idle' });
  });

  it('leaves a loading state untouched while the user keeps typing', () => {
    const component = createComponent();
    component.ngOnInit();
    component.telegramValidation.set({ state: 'loading' });

    component.onTokenInput('BotToken');

    expect(component.telegramValidation()).toEqual({ state: 'loading' });
  });
});

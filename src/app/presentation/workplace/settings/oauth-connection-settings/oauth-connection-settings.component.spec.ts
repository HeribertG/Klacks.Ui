// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { OAuthConnectionSettingsComponent } from './oauth-connection-settings.component';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { IOAuthConnectionSettings } from 'src/app/domain/models/settings/oauth-connection-settings.interface';
import { OAuthConnectionSettings } from 'src/app/domain/models/settings/oauth-connection-settings.model';
import {
  OAUTH_CUSTOM_TARGET_ERROR,
  OAUTH_CUSTOM_TARGET_MAX_ENTRIES,
} from 'src/app/domain/constants/oauth-connection.constants';

describe('OAuthConnectionSettingsComponent', () => {
  let fixture: ComponentFixture<OAuthConnectionSettingsComponent>;
  let root: HTMLElement;
  let settings: WritableSignal<IOAuthConnectionSettings>;
  let changeTrigger: WritableSignal<number>;

  const element = <T extends HTMLElement>(selector: string): T => root.querySelector(selector) as T;

  const typeTarget = (value: string): void => {
    const input = element<HTMLInputElement>('#oauthConnectionNewTarget');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const clickAdd = (): void => {
    element<HTMLButtonElement>('#oauth-connection-target-add-btn').click();
    fixture.detectChanges();
  };

  const errorText = (): string | null =>
    element('#oauth-connection-target-error-row')?.textContent?.trim() ?? null;

  const listedTargets = (): string[] =>
    Array.from(root.querySelectorAll('#oauth-connection-target-list .target-name')).map((node) => node.textContent?.trim() ?? '');

  beforeEach(async () => {
    settings = signal<IOAuthConnectionSettings>(new OAuthConnectionSettings());
    changeTrigger = signal(0);

    await TestBed.configureTestingModule({
      imports: [OAuthConnectionSettingsComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementSettingsService,
          useValue: { appSettings: { oauthConnectionSettings: settings }, settingsChangeTrigger: changeTrigger },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OAuthConnectionSettingsComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  it('shows the server defaults: trusted mode, both switches on, no own targets', () => {
    expect(element<HTMLSelectElement>('#oauthConnectionMode').value).toBe('trusted');
    expect(element<HTMLInputElement>('#oauthConnectionAllowLoopback').checked).toBe(true);
    expect(element<HTMLInputElement>('#oauthConnectionAllowWrite').checked).toBe(true);
    expect(element('#oauth-connection-targets-empty-row')).not.toBeNull();
    expect(element('#oauth-connection-target-list')).toBeNull();
  });

  it('writes the mode and both switches into the settings group and bumps the change trigger', () => {
    const select = element<HTMLSelectElement>('#oauthConnectionMode');
    select.value = 'off';
    select.dispatchEvent(new Event('change'));
    const loopback = element<HTMLInputElement>('#oauthConnectionAllowLoopback');
    loopback.checked = false;
    loopback.dispatchEvent(new Event('change'));
    const write = element<HTMLInputElement>('#oauthConnectionAllowWrite');
    write.checked = false;
    write.dispatchEvent(new Event('change'));

    expect(settings()).toEqual({ mode: 'off', allowLoopback: false, allowWrite: false, customTargets: [] });
    expect(changeTrigger()).toBe(3);
  });

  it('adds a valid target in its canonical form, clears the input and lists it', () => {
    typeTarget('  HTTPS://Tool.Example.com:443/oauth/callback ');
    clickAdd();

    expect(settings().customTargets).toEqual(['https://tool.example.com/oauth/callback']);
    expect(listedTargets()).toEqual(['https://tool.example.com/oauth/callback']);
    expect(element<HTMLInputElement>('#oauthConnectionNewTarget').value).toBe('');
    expect(errorText()).toBeNull();
    expect(changeTrigger()).toBe(1);
  });

  it('adds a target on Enter in the input field', () => {
    typeTarget('https://tool.example.com/cb');
    element<HTMLInputElement>('#oauthConnectionNewTarget').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(settings().customTargets).toEqual(['https://tool.example.com/cb']);
  });

  it.each([
    ['an http address', 'http://tool.example.com/cb', OAUTH_CUSTOM_TARGET_ERROR.NotHttps],
    ['an IP address', 'https://203.0.113.7/cb', OAUTH_CUSTOM_TARGET_ERROR.IpAddress],
    ['localhost', 'https://localhost/cb', OAUTH_CUSTOM_TARGET_ERROR.Localhost],
    ['a query', 'https://tool.example.com/cb?x=1', OAUTH_CUSTOM_TARGET_ERROR.ForbiddenCharacters],
    ['a fragment', 'https://tool.example.com/cb#x', OAUTH_CUSTOM_TARGET_ERROR.ForbiddenCharacters],
    ['a dot segment', 'https://tool.example.com/a/../cb', OAUTH_CUSTOM_TARGET_ERROR.Path],
    ['an empty input', '', OAUTH_CUSTOM_TARGET_ERROR.Empty],
  ])('refuses %s with its message and leaves the list unchanged', (_name, input, errorKey) => {
    typeTarget(input);
    clickAdd();

    expect(errorText()).toBe(errorKey);
    expect(settings().customTargets).toEqual([]);
    expect(changeTrigger()).toBe(0);
  });

  it('clears the message as soon as the input changes', () => {
    typeTarget('http://tool.example.com');
    clickAdd();
    expect(errorText()).not.toBeNull();

    typeTarget('https://tool.example.com');

    expect(errorText()).toBeNull();
  });

  it('refuses a duplicate of a listed target', () => {
    typeTarget('https://tool.example.com/cb');
    clickAdd();

    typeTarget('https://TOOL.example.com/cb');
    clickAdd();

    expect(errorText()).toBe(OAUTH_CUSTOM_TARGET_ERROR.Duplicate);
    expect(settings().customTargets).toHaveLength(1);
  });

  it('refuses further targets and disables the input once the list is full', () => {
    settings.set({
      ...new OAuthConnectionSettings(),
      customTargets: Array.from({ length: OAUTH_CUSTOM_TARGET_MAX_ENTRIES }, (_, index) => `https://t${index}.example.com`),
    });
    fixture.detectChanges();

    expect(element<HTMLInputElement>('#oauthConnectionNewTarget').disabled).toBe(true);
    expect(element<HTMLButtonElement>('#oauth-connection-target-add-btn').disabled).toBe(true);

    fixture.componentInstance.onTargetInput('https://new.example.com');
    fixture.componentInstance.addTarget();
    fixture.detectChanges();

    expect(errorText()).toBe(OAUTH_CUSTOM_TARGET_ERROR.LimitReached);
    expect(settings().customTargets).toHaveLength(OAUTH_CUSTOM_TARGET_MAX_ENTRIES);
  });

  it('removes a target from the list', () => {
    settings.set({ ...new OAuthConnectionSettings(), customTargets: ['https://a.example.com', 'https://b.example.com'] });
    fixture.detectChanges();

    element<HTMLButtonElement>('#oauth-connection-target-list .target-remove').click();
    fixture.detectChanges();

    expect(settings().customTargets).toEqual(['https://b.example.com']);
    expect(listedTargets()).toEqual(['https://b.example.com']);
    expect(changeTrigger()).toBe(1);
  });
});

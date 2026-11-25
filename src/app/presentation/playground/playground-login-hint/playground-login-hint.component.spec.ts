// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import {
  PLAYGROUND_DEMO_LOGIN_EMAIL,
  PLAYGROUND_DEMO_LOGIN_PASSWORD,
} from 'src/app/domain/constants/playground.constants';
import { PlaygroundDeviceService } from 'src/app/domain/services/playground/playground-device.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { PlaygroundLoginHintComponent } from './playground-login-hint.component';

describe('PlaygroundLoginHintComponent', () => {
  let fixture: ComponentFixture<PlaygroundLoginHintComponent>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const hint = (): HTMLElement | null => root().querySelector('.playground-login-hint');
  const button = (): HTMLButtonElement | null => root().querySelector('.playground-login-hint-fill');

  const activateLimit = (): void => {
    TestBed.inject(PlaygroundDeviceService).applyStatus({ limitActive: true, deviceToken: null });
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlaygroundLoginHintComponent, TranslateModule.forRoot()],
      providers: [{ provide: LocalStorageService, useValue: { get: vi.fn(() => null), set: vi.fn(), remove: vi.fn() } }],
    });
    fixture = TestBed.createComponent(PlaygroundLoginHintComponent);
    fixture.detectChanges();
  });

  it('renders nothing on an installation that is not the public playground', () => {
    expect(hint()).toBeNull();
  });

  it('shows the demo account once the backend reports the public playground', () => {
    activateLimit();

    expect(hint()).not.toBeNull();
    expect(root().querySelector('.playground-login-hint-email')?.textContent?.trim()).toBe(PLAYGROUND_DEMO_LOGIN_EMAIL);
    expect(root().querySelector('.playground-login-hint-password')?.textContent?.trim()).toBe(
      PLAYGROUND_DEMO_LOGIN_PASSWORD,
    );
  });

  it('asks the login page to fill in the demo account when the button is clicked', () => {
    const requested = vi.fn();
    fixture.componentInstance.useDemoLogin.subscribe(requested);
    activateLimit();

    button()?.click();

    expect(requested).toHaveBeenCalledTimes(1);
  });

  it('keeps the button out of the form submission', () => {
    activateLimit();

    expect(button()?.getAttribute('type')).toBe('button');
  });
});

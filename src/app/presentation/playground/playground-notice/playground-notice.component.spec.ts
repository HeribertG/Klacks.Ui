// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PLAYGROUND_PRIVACY_ROUTE } from 'src/app/domain/constants/playground.constants';
import { PlaygroundDeviceService } from 'src/app/domain/services/playground/playground-device.service';
import { PlaygroundPromptGateService } from 'src/app/domain/services/playground/playground-prompt-gate.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { PlaygroundNoticeComponent } from './playground-notice.component';

describe('PlaygroundNoticeComponent', () => {
  let fixture: ComponentFixture<PlaygroundNoticeComponent>;
  let storage: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const notice = (): HTMLElement | null => root().querySelector('.playground-notice');
  const button = (): HTMLButtonElement | null => root().querySelector('.playground-notice-ack');

  const create = (inputs: { compact?: boolean; pendingOnly?: boolean } = {}): void => {
    fixture = TestBed.createComponent(PlaygroundNoticeComponent);
    if (inputs.compact !== undefined) fixture.componentRef.setInput('compact', inputs.compact);
    if (inputs.pendingOnly !== undefined) fixture.componentRef.setInput('pendingOnly', inputs.pendingOnly);
    fixture.detectChanges();
  };

  const activateLimit = (): void => {
    TestBed.inject(PlaygroundDeviceService).applyStatus({ limitActive: true, deviceToken: 'token' });
    fixture.detectChanges();
  };

  beforeEach(() => {
    storage = { get: vi.fn(() => null), set: vi.fn() };
    TestBed.configureTestingModule({
      imports: [PlaygroundNoticeComponent, TranslateModule.forRoot()],
      providers: [provideRouter([]), { provide: LocalStorageService, useValue: storage }],
    });
  });

  it('renders nothing while the playground limit is inactive', () => {
    create();

    expect(notice()).toBeNull();
  });

  it('shows the notice with a privacy link and the confirmation button while the limit is active', () => {
    create();
    activateLimit();

    expect(notice()).not.toBeNull();
    expect(button()).not.toBeNull();
    expect(root().querySelector('a')?.getAttribute('href')).toBe(PLAYGROUND_PRIVACY_ROUTE);
  });

  it('keeps the notice but removes the button once confirmed', () => {
    create();
    activateLimit();

    button()?.click();
    fixture.detectChanges();

    expect(TestBed.inject(PlaygroundPromptGateService).confirmationPending()).toBe(false);
    expect(notice()).not.toBeNull();
    expect(button()).toBeNull();
  });

  it('pendingOnly hides the notice after the confirmation', () => {
    create({ pendingOnly: true });
    activateLimit();
    expect(notice()).not.toBeNull();

    button()?.click();
    fixture.detectChanges();

    expect(notice()).toBeNull();
  });
});

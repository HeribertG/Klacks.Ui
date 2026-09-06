// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { Component, CUSTOM_ELEMENTS_SCHEMA, signal, ChangeDetectionStrategy } from '@angular/core';
import { Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { AsideComponent } from './aside.component';
import { AsideService } from './aside.service';
import { AssistantChatComponent } from './assistant-chat/assistant-chat.component';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { OutputMode } from 'src/app/domain/constants/speech-constants';

@Component({
  selector: 'app-assistant-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
class AssistantChatStubComponent {}

describe('AsideComponent — panel rendering', () => {
  let isVisibleSignal: ReturnType<typeof signal<boolean>>;
  let speechSettingsSignal: ReturnType<typeof signal>;
  let tourActiveSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    isVisibleSignal = signal<boolean>(true);
    speechSettingsSignal = signal({ outputMode: OutputMode.Text } as never);
    tourActiveSignal = signal<boolean>(false);
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        {
          provide: AppSettingsManagementService,
          useValue: { speechSettings: speechSettingsSignal },
        },
        {
          provide: OnboardingService,
          useValue: { isTourActive: tourActiveSignal },
        },
        {
          provide: AsideService,
          useValue: {
            isVisible: isVisibleSignal,
            openedWithContext: signal(false),
            hide: () => undefined,
            clearChatRequested$: new Subject<void>().asObservable(),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    TestBed.overrideComponent(AsideComponent, {
      remove: { imports: [AssistantChatComponent] },
      add: { imports: [AssistantChatStubComponent] },
    });
  });

  it('renders the aside panel with app-assistant-chat when outputMode is text', () => {
    const fixture = TestBed.createComponent(AsideComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.aside-panel')).toBeTruthy();
    expect(host.querySelector('app-assistant-chat')).toBeTruthy();
  });

  it('hides aside-panel when outputMode is audio but bootstraps assistant-chat hidden for orchestrator init', () => {
    speechSettingsSignal.set({ outputMode: OutputMode.Audio } as never);
    const fixture = TestBed.createComponent(AsideComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.aside-panel')).toBeNull();
    expect(host.querySelector('.voice-bootstrap-host')).toBeTruthy();
    expect(host.querySelector('.voice-bootstrap-host app-assistant-chat')).toBeTruthy();
  });

  it.each([OutputMode.Audio, OutputMode.BothAuto])(
    'renders the aside panel while the setup tour is active even though outputMode is %s',
    (mode) => {
      speechSettingsSignal.set({ outputMode: mode } as never);
      tourActiveSignal.set(true);
      const fixture = TestBed.createComponent(AsideComponent);
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      expect(host.querySelector('.aside-panel')).toBeTruthy();
      expect(host.querySelector('.voice-bootstrap-host')).toBeNull();
    },
  );

  it('renders nothing when asideService.isVisible() is false', () => {
    isVisibleSignal.set(false);
    const fixture = TestBed.createComponent(AsideComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.aside-panel')).toBeNull();
    expect(host.querySelector('app-assistant-chat')).toBeNull();
  });
});

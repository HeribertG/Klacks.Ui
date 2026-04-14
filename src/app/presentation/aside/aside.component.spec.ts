// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AsideComponent } from './aside.component';
import { AsideService } from './aside.service';
import { AssistantChatComponent } from './assistant-chat/assistant-chat.component';
import { VoiceShellComponent } from './voice-shell/voice-shell.component';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { OutputMode } from 'src/app/domain/constants/speech-constants';

@Component({
  selector: 'app-assistant-chat',
  standalone: true,
  template: '',
})
class AssistantChatStubComponent {}

@Component({
  selector: 'app-voice-shell',
  standalone: true,
  template: '',
})
class VoiceShellStubComponent {}

describe('AsideComponent — shell switch', () => {
  let outputModeSignal: ReturnType<typeof signal<string>>;
  let isVisibleSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    outputModeSignal = signal<string>(OutputMode.Both);
    isVisibleSignal = signal<boolean>(true);
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        {
          provide: AppSettingsManagementService,
          useValue: {
            speechSettings: signal({ outputMode: outputModeSignal() } as never),
          },
        },
        {
          provide: AsideService,
          useValue: {
            isVisible: isVisibleSignal,
            openedWithContext: signal(false),
            hide: () => undefined,
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
    TestBed.overrideComponent(AsideComponent, {
      remove: { imports: [AssistantChatComponent, VoiceShellComponent] },
      add: { imports: [AssistantChatStubComponent, VoiceShellStubComponent] },
    });
  });

  it('renders app-assistant-chat when outputMode is text', () => {
    TestBed.overrideProvider(AppSettingsManagementService, {
      useValue: { speechSettings: signal({ outputMode: OutputMode.Text } as never) },
    });
    const fixture = TestBed.createComponent(AsideComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-assistant-chat')).toBeTruthy();
    expect(host.querySelector('app-voice-shell')).toBeNull();
  });

  it('renders app-voice-shell when outputMode is audio', () => {
    TestBed.overrideProvider(AppSettingsManagementService, {
      useValue: { speechSettings: signal({ outputMode: OutputMode.Audio } as never) },
    });
    const fixture = TestBed.createComponent(AsideComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-voice-shell')).toBeTruthy();
    expect(host.querySelector('app-assistant-chat')).toBeNull();
  });

  it('renders nothing when asideService.isVisible() is false', () => {
    isVisibleSignal.set(false);
    const fixture = TestBed.createComponent(AsideComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-assistant-chat')).toBeNull();
    expect(host.querySelector('app-voice-shell')).toBeNull();
  });
});

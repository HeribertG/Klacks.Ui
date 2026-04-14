// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Aside panel hosting either the text-based assistant chat or the voice-only
 * Klacksy shell, depending on the user's speech output mode setting.
 * @param asideService - controls panel visibility via a signal
 * @param appSettings - provides the current speech settings signal with outputMode
 */

import {
  Component,
  inject,
  ElementRef,
  Renderer2,
  ViewChild,
  effect,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AsideService } from './aside.service';
import { AssistantChatComponent } from './assistant-chat/assistant-chat.component';
import { VoiceShellComponent } from './voice-shell/voice-shell.component';
import { TrashIconRedComponent } from '../icons/trash-icon-red.component';
import { TranslateModule } from '@ngx-translate/core';
import { FocusTrapDirective } from '../directives/focus-trap.directive';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { OutputMode } from 'src/app/domain/constants/speech-constants';

@Component({
  selector: 'app-aside',
  templateUrl: './aside.component.html',
  styleUrls: ['./aside.component.scss'],
  standalone: true,
  imports: [
    AssistantChatComponent,
    VoiceShellComponent,
    TrashIconRedComponent,
    TranslateModule,
    FocusTrapDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsideComponent {
  @ViewChild(AssistantChatComponent) assistantChatComponent!: AssistantChatComponent;

  private asideService = inject(AsideService);
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private readonly appSettings = inject(AppSettingsManagementService);

  protected readonly OutputMode = OutputMode;

  isVisible = this.asideService.isVisible;

  readonly outputMode = computed<string>(() => this.appSettings.speechSettings().outputMode);
  readonly isAudioMode = computed<boolean>(() => this.outputMode() === OutputMode.Audio);

  constructor() {
    effect(() => {
      const visible = this.isVisible();

      if (visible) {
        this.renderer.addClass(this.elementRef.nativeElement, 'visible');
      } else {
        this.renderer.removeClass(this.elementRef.nativeElement, 'visible');
      }
    });
  }

  close(): void {
    this.asideService.hide();
  }

  clearChat(): void {
    setTimeout(() => {
      if (this.assistantChatComponent) {
        this.assistantChatComponent.clearChat();
      }
    }, 0);
  }
}

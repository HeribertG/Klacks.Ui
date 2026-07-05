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
  DestroyRef,
  effect,
  computed,
  ChangeDetectionStrategy,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsideService } from './aside.service';
import { AssistantChatComponent } from './assistant-chat/assistant-chat.component';
import { TrashIconRedComponent } from '../icons/trash-icon-red.component';
import { TranslateModule } from '@ngx-translate/core';
import { FocusTrapDirective } from '../directives/focus-trap.directive';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { OutputMode } from 'src/app/domain/constants/speech-constants';
import { ToastShowService } from '../toast/toast-show.service';

@Component({
  selector: 'app-aside',
  templateUrl: './aside.component.html',
  styleUrls: ['./aside.component.scss'],
  standalone: true,
  imports: [
    AssistantChatComponent,
    TrashIconRedComponent,
    TranslateModule,
    FocusTrapDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsideComponent {
  readonly assistantChatComponent = viewChild.required(AssistantChatComponent);

  private asideService = inject(AsideService);
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private readonly appSettings = inject(AppSettingsManagementService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly OutputMode = OutputMode;

  isVisible = this.asideService.isVisible;

  readonly outputMode = computed<string>(() => this.appSettings.speechSettings().outputMode);
  readonly isFloatingMode = computed<boolean>(
    () => this.outputMode() === OutputMode.Audio || this.outputMode() === OutputMode.BothAuto,
  );

  constructor() {
    effect(() => {
      const visible = this.isVisible();
      const floating = this.isFloatingMode();

      if (visible && !floating) {
        this.renderer.addClass(this.elementRef.nativeElement, 'visible');
      } else {
        this.renderer.removeClass(this.elementRef.nativeElement, 'visible');
      }

      if (!visible) {
        this.toastShowService.dismissInteractiveReplies();
      }
    });

    this.asideService.clearChatRequested$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.clearChat());
  }

  close(): void {
    this.asideService.hide();
  }

  clearChat(): void {
    setTimeout(() => {
      const assistantChatComponent = this.assistantChatComponent();
      if (assistantChatComponent) {
        assistantChatComponent.clearChat();
      }
    }, 0);
  }
}

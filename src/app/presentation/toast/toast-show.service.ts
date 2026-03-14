// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Facade service for typed toast notifications including interactive reply toasts.
 * @param showInfo - Shows an info toast (auto-hide 5s)
 * @param showError - Shows an error toast (auto-hide 8s)
 * @param showSuccess - Shows a success toast (auto-hide 2s)
 * @param showInteractiveReply - Shows an interactive toast with single/multi-select options
 */

import { inject, Injectable } from '@angular/core';
import { ToastService } from './toast.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-reply.interface';
import { IToast } from './toast.interface';

export const TOAST_ICONS = {
  INFO: 'ℹ️',
  WARNING: '⚠️',
  ERROR: '❌',
  SUCCESS: '✅',
  LOADING: '⏳',
  ROUTE: '🗺️',
  ASSISTANT: '🤖',
};

const INTERACTIVE_REPLY_DEFAULTS = {
  PROMPT_FALLBACK: 'Bitte wählen...',
  HEADER: 'Assistent',
} as const;

@Injectable({
  providedIn: 'root',
})
export class ToastShowService {
  private toastService = inject(ToastService);

  showInfo(message: string, infoName = '', additionalMessage = '', icon = ''): void {
    if (infoName) {
      const existing = this.toastService.toasts.find((x) => x.name === infoName);
      this.toastService.remove(existing);
    }
    this.toastService.show(message, {
      classname: 'bg-info text-light',
      delay: 5000,
      name: infoName,
      autohide: true,
      headertext: 'Info',
      showTextField: additionalMessage !== '',
      textFieldValue: additionalMessage,
      icon: icon,
    });
  }

  showError(message: string, errorName = '', additionalMessage = '', icon = ''): void {
    if (errorName) {
      const existing = this.toastService.toasts.find((x) => x.name === errorName);
      this.toastService.remove(existing);
    }

    this.toastService.show(message, {
      classname: 'bg-danger text-light',
      delay: 8000,
      name: errorName,
      autohide: true,
      headertext: DomainMessages.ERROR_TOASTTITLE,
      showTextField: additionalMessage !== '',
      textFieldValue: additionalMessage,
      icon: icon,
    });
  }

  showSuccess(message: string, header: string, additionalMessage = '', icon = ''): void {
    this.toastService.show(message, {
      classname: 'bg-success text-light',
      delay: 2000,
      autohide: true,
      headertext: header,
      showTextField: additionalMessage !== '',
      textFieldValue: additionalMessage,
      icon: icon,
    });
  }

  showInteractiveReply(
    config: ISuggestedRepliesConfig,
    onSelected: (values: string[]) => void,
    onDismissed?: () => void,
  ): IToast | null {
    const promptText = config.prompt || INTERACTIVE_REPLY_DEFAULTS.PROMPT_FALLBACK;

    return this.toastService.show(promptText, {
      classname: 'bg-assistant-interactive',
      autohide: false,
      headertext: TOAST_ICONS.ASSISTANT + ' ' + INTERACTIVE_REPLY_DEFAULTS.HEADER,
      icon: TOAST_ICONS.ASSISTANT,
      interactive: {
        repliesConfig: config,
        onSelected,
        onDismissed,
      },
    });
  }

  dismissInteractiveReplies(): void {
    const interactiveToasts = this.toastService.toasts.filter((t) => t.interactive);
    for (const toast of interactiveToasts) {
      toast.interactive?.onDismissed?.();
      this.toastService.remove(toast);
    }
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Builds the welcome focus toast: the headline question and the option list around it. Pure logic,
 * so the ordering and the fallback are testable without a component.
 * @param focus - Backend focus payload; i18n keys plus slot values, date slots as yyyy-MM-dd
 * @param rankedOptions - The existing ranked greeting suggestions, kept behind the focus action
 * @param now - Reference instant for nextLocalMidnightUtc, injected so a test can drive it
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ISuggestedReply } from 'src/app/domain/models/assistant/suggested-reply.interface';
import { IWelcomeFocus } from 'src/app/domain/models/assistant/welcome-focus.interface';
import {
  WELCOME_FOCUS_ACTION,
  WELCOME_FOCUS_DATE_PARAM_KEYS,
  WELCOME_FOCUS_FALLBACK_PROMPT_KEY,
  WELCOME_FOCUS_LATER,
  WELCOME_FOCUS_LATER_LABEL_KEY,
} from 'src/app/domain/constants/welcome-focus.constants';
import { DateToStringShort } from 'src/app/shared/helpers/date.helper';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_RADIX = 10;

export interface IWelcomeFocusToast {
  prompt: string;
  options: ISuggestedReply[];
}

@Injectable({
  providedIn: 'root',
})
export class WelcomeFocusToastService {
  private readonly translateService = inject(TranslateService);

  build(focus: IWelcomeFocus, rankedOptions: ISuggestedReply[]): IWelcomeFocusToast {
    return {
      prompt: this.resolvePrompt(focus),
      options: this.buildOptions(focus, rankedOptions),
    };
  }

  nextLocalMidnightUtc(now: Date): string {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).toISOString();
  }

  private resolvePrompt(focus: IWelcomeFocus): string {
    const resolved = this.translateService.instant(
      focus.promptKey,
      this.formatParams(focus.promptParams),
    ) as string;

    if (!resolved || resolved === focus.promptKey) {
      return this.translateService.instant(WELCOME_FOCUS_FALLBACK_PROMPT_KEY) as string;
    }

    return resolved;
  }

  private formatParams(promptParams: Record<string, string> | undefined): Record<string, string> {
    const formatted: Record<string, string> = {};
    for (const [key, value] of Object.entries(promptParams ?? {})) {
      formatted[key] = this.isDateParam(key) ? this.formatIsoDate(value) : value;
    }
    return formatted;
  }

  private isDateParam(key: string): boolean {
    return (WELCOME_FOCUS_DATE_PARAM_KEYS as readonly string[]).includes(key);
  }

  private formatIsoDate(value: string): string {
    if (!ISO_DATE_PATTERN.test(value)) {
      return value;
    }

    const parts = value.split('-').map((part) => parseInt(part, ISO_DATE_RADIX));
    return DateToStringShort(
      new Date(parts[0], parts[1] - 1, parts[2]),
      this.translateService.currentLang,
    );
  }

  private buildOptions(focus: IWelcomeFocus, rankedOptions: ISuggestedReply[]): ISuggestedReply[] {
    const options: ISuggestedReply[] = [
      {
        label: this.translateService.instant(focus.actionLabelKey) as string,
        value: WELCOME_FOCUS_ACTION,
      },
    ];

    for (const option of rankedOptions) {
      if (focus.actionRoute && option.value === focus.actionRoute) {
        continue;
      }
      options.push(option);
    }

    options.push({
      label: this.translateService.instant(WELCOME_FOCUS_LATER_LABEL_KEY) as string,
      value: WELCOME_FOCUS_LATER,
    });

    return options;
  }
}

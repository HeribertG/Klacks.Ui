// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Asks the user a short choice question without the asking layer knowing how it is shown, and the token through
 * which it is provided.
 * @param config - Prompt and options of the question
 * @param onSelected - Called with the chosen option values once the user answers
 */
import { InjectionToken } from '@angular/core';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-replies-config.interface';

export interface IInteractiveReplyNotifier {
  showInteractiveReply(config: ISuggestedRepliesConfig, onSelected: (values: string[]) => void): void;
}

export const INTERACTIVE_REPLY_NOTIFIER = new InjectionToken<IInteractiveReplyNotifier>(
  'IInteractiveReplyNotifier',
);

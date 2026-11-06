// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Maps the code of a chat error event to the translation key of its message: the playground codes first, then the
 * chat error codes. One resolver for every place that shows a chat error (stream dispatch, chat message, voice hint).
 * @param code - Machine-readable errorCode of an SSE error chunk; anything else yields null
 */
import { ASSISTANT_CHAT_ERROR_I18N_KEYS } from 'src/app/domain/constants/assistant-chat-error.constants';
import { playgroundErrorI18nKey } from 'src/app/domain/helpers/playground-token-limit.helper';

export function chatErrorI18nKey(code: unknown): string | null {
  const playgroundKey = playgroundErrorI18nKey(code);
  if (playgroundKey) {
    return playgroundKey;
  }
  return typeof code === 'string' ? (ASSISTANT_CHAT_ERROR_I18N_KEYS.get(code) ?? null) : null;
}

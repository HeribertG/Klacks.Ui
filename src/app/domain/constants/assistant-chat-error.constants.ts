// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Codes of chat error events (SSE error chunk errorCode) and the translated message shown for each. Mirrors the
 * backend AssistantChatErrorCodes (AssistantChatErrorCodesUiMirrorGuardTests); the playground codes live in
 * playground.constants.ts.
 * @param LLM_PROVIDER_UNAVAILABLE_ERROR_CODE - The selected model has no usable provider (none set up or disabled)
 * @param LLM_PROVIDER_UNAVAILABLE_I18N_KEY - Message pointing the user to the provider settings
 * @param ASSISTANT_CHAT_ERROR_I18N_KEYS - Translation key of the message shown for each chat error code
 */
export const LLM_PROVIDER_UNAVAILABLE_ERROR_CODE = 'LLM_PROVIDER_UNAVAILABLE';

export const LLM_PROVIDER_UNAVAILABLE_I18N_KEY = 'assistant-chat.error.provider-unavailable';

export const ASSISTANT_CHAT_ERROR_I18N_KEYS: ReadonlyMap<string, string> = new Map([
  [LLM_PROVIDER_UNAVAILABLE_ERROR_CODE, LLM_PROVIDER_UNAVAILABLE_I18N_KEY],
]);

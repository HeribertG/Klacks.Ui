// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants of the public playground token limit: the status endpoint, the device token transport (header) and its
 * plausible shape, the LLM path segments that carry the token, and the playground error codes with their HTTP status
 * and translated message.
 * @param PLAYGROUND_DEVICE_HEADER - Request header carrying the signed device token
 * @param PLAYGROUND_DEVICE_TOKEN_MIN_LENGTH - Shortest stored value still treated as a device token (anything shorter is discarded)
 * @param PLAYGROUND_DEVICE_TOKEN_MAX_LENGTH - Longest accepted device token; mirrors the backend limit
 * @param PLAYGROUND_DEVICE_TOKEN_PATTERN - Characters of a device token (the backend signs with Data Protection, which emits base64url)
 * @param PLAYGROUND_STATUS_PATH - Anonymous endpoint reporting whether the limit is active and minting device tokens
 * @param PLAYGROUND_TOKEN_LIMIT_ERROR_CODE - Error code of a 429 problem or SSE error chunk when the daily budget is spent
 * @param PLAYGROUND_FEATURE_BLOCKED_ERROR_CODE - Error code of a 403 problem for a function the public playground does not offer
 * @param PLAYGROUND_PROMPT_TOO_LONG_ERROR_CODE - Error code of a 400 problem when the server rejects a prompt over the character limit
 * @param PLAYGROUND_ERROR_HTTP_STATUSES - HTTP status each playground error code arrives with
 * @param PLAYGROUND_ERROR_I18N_KEYS - Translation key of the message shown for each playground error code
 * @param PLAYGROUND_LLM_PATH_SEGMENTS - Segments below /assistant/ that consume the budget and therefore carry the token
 * @param PLAYGROUND_STATUS_TIMEOUT_MS - Upper bound a send or voice start waits for the status answer before the status counts as unknown
 * @param PLAYGROUND_SERVER_ERROR_MIN_STATUS - First HTTP status counted as a server failure, which leaves the playground status unknown
 * @param PLAYGROUND_MAX_PROMPT_CHARS - Maximum characters per prompt while the limit is active (the backend mirrors it)
 * @param PLAYGROUND_COUNTER_VISIBLE_RATIO - Share of the limit from which the character counter appears
 * @param PLAYGROUND_PRIVACY_ROUTE - In-app route of the privacy page the notice links to
 */
import type { IVoiceShellErrorHint } from 'src/app/domain/models/assistant/voice-shell-error-hint.model';
import { VOICE_HINT_SEVERITY_INFO } from 'src/app/domain/constants/voice-shell-error-hint.constants';

export const PLAYGROUND_DEVICE_HEADER = 'X-Playground-Device';

export const PLAYGROUND_DEVICE_TOKEN_MIN_LENGTH = 16;

export const PLAYGROUND_DEVICE_TOKEN_MAX_LENGTH = 512;

export const PLAYGROUND_DEVICE_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

export const PLAYGROUND_STATUS_PATH = 'Playground/Status';

export const PLAYGROUND_TOKEN_LIMIT_ERROR_CODE = 'PLAYGROUND_TOKEN_LIMIT';

export const PLAYGROUND_FEATURE_BLOCKED_ERROR_CODE = 'PLAYGROUND_FEATURE_BLOCKED';

export const PLAYGROUND_PROMPT_TOO_LONG_ERROR_CODE = 'PLAYGROUND_PROMPT_TOO_LONG';

export const PLAYGROUND_TOKEN_LIMIT_I18N_KEY = 'playground.token-limit-reached';

export const PLAYGROUND_FEATURE_BLOCKED_I18N_KEY = 'playground.feature-blocked';

export const PLAYGROUND_PROMPT_REJECTED_I18N_KEY = 'playground.prompt-rejected';

export const PLAYGROUND_TOKEN_LIMIT_HTTP_STATUS = 429;

export const PLAYGROUND_FEATURE_BLOCKED_HTTP_STATUS = 403;

export const PLAYGROUND_PROMPT_TOO_LONG_HTTP_STATUS = 400;

export const PLAYGROUND_ERROR_HTTP_STATUSES: ReadonlyMap<string, number> = new Map([
  [PLAYGROUND_TOKEN_LIMIT_ERROR_CODE, PLAYGROUND_TOKEN_LIMIT_HTTP_STATUS],
  [PLAYGROUND_FEATURE_BLOCKED_ERROR_CODE, PLAYGROUND_FEATURE_BLOCKED_HTTP_STATUS],
  [PLAYGROUND_PROMPT_TOO_LONG_ERROR_CODE, PLAYGROUND_PROMPT_TOO_LONG_HTTP_STATUS],
]);

export const PLAYGROUND_ERROR_I18N_KEYS: ReadonlyMap<string, string> = new Map([
  [PLAYGROUND_TOKEN_LIMIT_ERROR_CODE, PLAYGROUND_TOKEN_LIMIT_I18N_KEY],
  [PLAYGROUND_FEATURE_BLOCKED_ERROR_CODE, PLAYGROUND_FEATURE_BLOCKED_I18N_KEY],
  [PLAYGROUND_PROMPT_TOO_LONG_ERROR_CODE, PLAYGROUND_PROMPT_REJECTED_I18N_KEY],
]);

export const PLAYGROUND_STATUS_RETRY_COUNT = 2;

export const PLAYGROUND_STATUS_TIMEOUT_MS = 3000;

export const PLAYGROUND_SERVER_ERROR_MIN_STATUS = 500;

export const ASSISTANT_API_SEGMENT = 'assistant/';

export const PLAYGROUND_LLM_PATH_SEGMENTS: readonly string[] = ['chat', 'plans', 'goal-candidates', 'transcription'];

export const PLAYGROUND_MAX_PROMPT_CHARS = 1000;

export const PLAYGROUND_COUNTER_VISIBLE_RATIO = 0.8;

export const PLAYGROUND_PRIVACY_ROUTE = '/privacy';

export const PLAYGROUND_NOTICE_ACKNOWLEDGED_VALUE = 'true';

export const PLAYGROUND_CHAT_NOTICE_I18N_KEY = 'playground.chat-notice';

export const PLAYGROUND_CHAT_NOTICE_SHORT_I18N_KEY = 'playground.chat-notice-short';

export const PLAYGROUND_NOTICE_LINK_I18N_KEY = 'playground.notice-link';

export const PLAYGROUND_NOTICE_ACKNOWLEDGE_I18N_KEY = 'playground.notice-acknowledge';

export const PLAYGROUND_NOTICE_REQUIRED_I18N_KEY = 'playground.notice-required';

export const PLAYGROUND_PROMPT_TOO_LONG_I18N_KEY = 'playground.prompt-too-long';

export const PLAYGROUND_VOICE_TOO_LONG_I18N_KEY = 'playground.voice-too-long';

export const PLAYGROUND_VOICE_HINT_KIND = 'playground-limit';

export const PLAYGROUND_CONFIRMATION_HINT: IVoiceShellErrorHint = {
  kind: PLAYGROUND_VOICE_HINT_KIND,
  i18nKey: PLAYGROUND_NOTICE_REQUIRED_I18N_KEY,
  persistent: false,
  severity: VOICE_HINT_SEVERITY_INFO,
};

export const PLAYGROUND_VOICE_TOO_LONG_HINT: IVoiceShellErrorHint = {
  kind: PLAYGROUND_VOICE_HINT_KIND,
  i18nKey: PLAYGROUND_VOICE_TOO_LONG_I18N_KEY,
  persistent: false,
};
